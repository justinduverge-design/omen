//! Steward's backup freshness checks as one dependency-free library.
//!
//! Port of `/opt/steward/checks/{backup,football-backup,restic-check}-freshness.sh` (Steward, Pi Zero 2 W).
//! The decision is a pure function of the status payload KVM1's forced-command export returns and the current time,
//! so it is unit-tested here; `main.rs` only does the I/O (ssh, state file, stdout, exit code).
//!
//! Output contract kept byte-for-byte with the bash checks: the same `KEY=value` stdout lines, the same state-file
//! fields, the same exit codes (0 HEALTHY, 1 WARNING, 2 CRITICAL, 3 DOWN) and the same reason strings.

pub mod time;

/// Which check to run.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    /// Supabase backup, every 6 h (`backup-freshness.sh`, ssh command `status`).
    SupabaseBackup,
    /// Weekly omen-football-data backup (`football-backup-freshness.sh`, ssh command `football-status`).
    FootballBackup,
    /// Weekly Restic integrity check (`restic-check-freshness.sh`, ssh command `restic-status`).
    ResticCheck,
}

impl Kind {
    pub fn parse(name: &str) -> Option<Kind> {
        match name {
            "supabase-backup" => Some(Kind::SupabaseBackup),
            "football-backup" => Some(Kind::FootballBackup),
            "restic-check" => Some(Kind::ResticCheck),
            _ => None,
        }
    }
    /// The forced-command name sent over ssh.
    pub fn remote_command(self) -> &'static str {
        match self {
            Kind::SupabaseBackup => "status",
            Kind::FootballBackup => "football-status",
            Kind::ResticCheck => "restic-status",
        }
    }
    /// State file stem under /var/lib/steward/state.
    pub fn state_stem(self) -> &'static str {
        match self {
            Kind::SupabaseBackup => "backup-freshness",
            Kind::FootballBackup => "football-backup-freshness",
            Kind::ResticCheck => "restic-check-freshness",
        }
    }
}

/// Three ordered thresholds in seconds. Their meaning per kind follows the bash scripts.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Thresholds(pub i64, pub i64, pub i64);

impl Thresholds {
    pub fn default_for(kind: Kind) -> Thresholds {
        match kind {
            Kind::SupabaseBackup => Thresholds(28_800, 43_200, 86_400), // 8 h healthy, 12 h warning, 24 h critical
            Kind::FootballBackup => Thresholds(691_200, 777_600, 1_209_600), // 8 d, 9 d, 14 d
            Kind::ResticCheck => Thresholds(777_600, 1_209_600, 1_814_400), // 9 d, 14 d, 21 d
        }
    }
    /// The environment variable names the bash scripts honour, in order.
    pub fn env_names(kind: Kind) -> [&'static str; 3] {
        match kind {
            Kind::SupabaseBackup => [
                "HEALTHY_MAX_SECONDS",
                "WARNING_MAX_SECONDS",
                "CRITICAL_MAX_SECONDS",
            ],
            Kind::FootballBackup => [
                "HEALTHY_MAX_SECONDS",
                "CRITICAL_MAX_SECONDS",
                "DOWN_MAX_SECONDS",
            ],
            Kind::ResticCheck => ["WARN_SECONDS", "CRIT_SECONDS", "DOWN_SECONDS"],
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Severity {
    Healthy,
    Warning,
    Critical,
    Down,
}

impl Severity {
    pub fn as_str(self) -> &'static str {
        match self {
            Severity::Healthy => "HEALTHY",
            Severity::Warning => "WARNING",
            Severity::Critical => "CRITICAL",
            Severity::Down => "DOWN",
        }
    }
    pub fn exit_code(self) -> i32 {
        match self {
            Severity::Healthy => 0,
            Severity::Warning => 1,
            Severity::Critical => 2,
            Severity::Down => 3,
        }
    }
}

/// The result of one check: what to print, what to persist, and how to exit.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Outcome {
    pub severity: Severity,
    pub reason: String,
    /// stdout `KEY=value` lines, in order.
    pub stdout: Vec<(String, String)>,
    /// state-file `key=value` lines after `checked_at`, in order.
    pub state: Vec<(String, String)>,
}

/// Inputs gathered by `main.rs` before the remote call. Each `false` is a local DOWN reason.
#[derive(Clone, Copy, Debug)]
pub struct Local {
    pub right_host: bool,
    pub key_readable: bool,
    pub known_hosts_readable: bool,
    /// `NOW_EPOCH` (when set) is plain digits, like bash's `^[0-9]+$`.
    pub clock_valid: bool,
    /// Every threshold override (when set) is plain digits.
    pub thresholds_valid: bool,
}

/// `get_field` exactly as the bash awk does it: split on `\n` only (a `\r` stays part of the value), match the text
/// before the first `=` (the whole line when there is none), return what follows the first `=` (the whole line when
/// there is none), or "".
pub fn field<'a>(payload: &'a str, key: &str) -> &'a str {
    payload
        .split('\n')
        .find_map(|line| match line.split_once('=') {
            Some((k, v)) if k == key => Some(v),
            None if line == key => Some(line),
            _ => None,
        })
        .unwrap_or("")
}

fn is_digits(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

fn is_hex64(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Running record of the fields a check has learned so far: on DOWN, bash prints and persists whatever was known.
#[derive(Default)]
struct Known {
    fields: Vec<(&'static str, String)>,
}

impl Known {
    fn set(&mut self, key: &'static str, value: impl Into<String>) {
        let value = value.into();
        match self.fields.iter_mut().find(|(k, _)| *k == key) {
            Some(slot) => slot.1 = value,
            None => self.fields.push((key, value)),
        }
    }
    fn get(&self, key: &str) -> String {
        self.fields
            .iter()
            .find(|(k, _)| *k == key)
            .map(|(_, v)| v.clone())
            .unwrap_or_default()
    }
}

/// Run one check. `payload` is `None` when the status channel could not be reached.
pub fn evaluate(
    kind: Kind,
    local: Local,
    payload: Option<&str>,
    now: i64,
    t: Thresholds,
) -> Outcome {
    let mut known = Known::default();
    let verdict = run(kind, local, payload, now, t, &mut known);
    let (severity, reason) = match verdict {
        Ok(v) => v,
        Err(reason) => (Severity::Down, reason.to_string()),
    };
    render(kind, severity, reason, &known)
}

type Verdict = Result<(Severity, String), &'static str>;

fn run(
    kind: Kind,
    local: Local,
    payload: Option<&str>,
    now: i64,
    t: Thresholds,
    k: &mut Known,
) -> Verdict {
    // Defaults the bash scripts start from.
    match kind {
        Kind::SupabaseBackup => {
            k.set("age_seconds", "-1");
            k.set("age_hours", "-1");
        }
        Kind::FootballBackup => {
            k.set("age_seconds", "-1");
            k.set("age_days", "-1");
        }
        Kind::ResticCheck => k.set("age_days", "-1"),
    }
    if !local.right_host {
        return Err("wrong_local_host");
    }
    if !local.key_readable {
        return Err("ssh_key_unreadable");
    }
    if !local.known_hosts_readable {
        return Err("known_hosts_unreadable");
    }
    // bash checks these only in the Supabase script; the other two would crash on bad input. One rule for all three.
    if !local.clock_valid {
        return Err("invalid_local_clock");
    }
    if !local.thresholds_valid {
        return Err("invalid_threshold");
    }
    if kind == Kind::SupabaseBackup && !(t.0 < t.1 && t.1 < t.2) {
        return Err("invalid_threshold_order");
    }
    let p = payload.ok_or("status_channel_unavailable")?;
    match kind {
        Kind::SupabaseBackup => supabase(p, now, t, k),
        Kind::FootballBackup => football(p, now, t, k),
        Kind::ResticCheck => restic(p, now, t, k),
    }
}

/// Age in seconds of a strict `YYYY-MM-DDTHH:MM:SSZ` timestamp, clamped at 0, refusing > 5 min in the future.
/// Like bash, the raw age is recorded under `raw_key` before the future check, so a DOWN shows it.
fn age(
    ts: &str,
    now: i64,
    k: &mut Known,
    raw_key: Option<&'static str>,
    reasons: (&'static str, &'static str, &'static str),
) -> Result<i64, &'static str> {
    let (invalid, parse_failed, future) = reasons;
    if !time::is_strict_utc(ts) {
        return Err(invalid);
    }
    let epoch = time::parse_utc(ts).ok_or(parse_failed)?;
    let age = now.checked_sub(epoch).ok_or(parse_failed)?;
    if let Some(key) = raw_key {
        k.set(key, age.to_string());
    }
    if age < -300 {
        return Err(future);
    }
    Ok(age.max(0))
}

fn supabase(p: &str, now: i64, t: Thresholds, k: &mut Known) -> Verdict {
    for (key, state) in [
        ("COMPLETED_UTC", "backup_completed_utc"),
        ("SNAPSHOT_ID", "snapshot_id"),
        ("AUTH_USERS", "auth_users"),
        ("AUTH_IDENTITIES", "auth_identities"),
        ("AUTH_MFA_FACTORS", "auth_mfa_factors"),
        ("PUBLIC_BASE_TABLES", "public_base_tables"),
        ("STORAGE_OBJECTS", "storage_objects"),
        ("ATTEMPT_RESULT", "attempt_result"),
        ("ATTEMPT_UTC", "attempt_utc"),
        ("ATTEMPT_PHASE", "attempt_phase"),
        ("ATTEMPT_EXIT_CODE", "attempt_exit_code"),
    ] {
        k.set(state, field(p, key));
    }
    if field(p, "PROTOCOL") != "omen-backup-status.v1" {
        return Err("protocol_mismatch");
    }
    if field(p, "STATUS_CHANNEL") != "OK" {
        return Err("remote_status_channel_error");
    }
    if field(p, "SUCCESS_RESULT") != "HEALTHY" {
        return Err("remote_success_state_invalid");
    }
    if field(p, "HOST") != "kvm1" {
        return Err("remote_host_mismatch");
    }
    if field(p, "RECOVERY_FORMAT") != "2" {
        return Err("recovery_format_mismatch");
    }
    if !is_hex64(field(p, "SNAPSHOT_ID")) {
        return Err("invalid_snapshot_id");
    }
    let counts = [
        "AUTH_USERS",
        "AUTH_IDENTITIES",
        "AUTH_MFA_FACTORS",
        "PUBLIC_BASE_TABLES",
        "STORAGE_OBJECTS",
    ];
    if !counts.iter().all(|c| is_digits(field(p, c))) {
        return Err("invalid_backup_metadata");
    }
    let attempt = field(p, "ATTEMPT_RESULT");
    if attempt != "SUCCESS" && attempt != "FAILED" {
        return Err("invalid_attempt_result");
    }
    let age = age(
        field(p, "COMPLETED_UTC"),
        now,
        k,
        Some("age_seconds"),
        (
            "invalid_backup_timestamp",
            "backup_timestamp_parse_failed",
            "backup_timestamp_in_future",
        ),
    )?;
    k.set("age_seconds", age.to_string());
    k.set("age_hours", (age / 3600).to_string());
    Ok(if age > t.2 {
        (Severity::Down, "backup_older_than_24h".into())
    } else if age > t.1 {
        (Severity::Critical, "backup_older_than_12h".into())
    } else if attempt == "FAILED" {
        (Severity::Warning, "latest_backup_attempt_failed".into())
    } else if age > t.0 {
        (Severity::Warning, "backup_older_than_8h".into())
    } else {
        (Severity::Healthy, "none".into())
    })
}

fn football(p: &str, now: i64, t: Thresholds, k: &mut Known) -> Verdict {
    if field(p, "PROTOCOL") != "omen-football-backup-status.v1" {
        return Err("protocol_mismatch");
    }
    if field(p, "STATUS_CHANNEL") != "OK" {
        return Err("remote_status_channel_error");
    }
    if field(p, "SUCCESS_RESULT") != "SUCCESS" {
        return Err("remote_success_state_invalid");
    }
    k.set("football_backup_completed_utc", field(p, "COMPLETED_UTC"));
    k.set("snapshot_id", field(p, "SNAPSHOT_ID"));
    if !is_hex64(field(p, "SNAPSHOT_ID")) {
        return Err("invalid_snapshot_id");
    }
    let age = age(
        field(p, "COMPLETED_UTC"),
        now,
        k,
        Some("age_seconds"),
        (
            "invalid_backup_timestamp",
            "backup_timestamp_parse_failed",
            "backup_timestamp_in_future",
        ),
    )?;
    k.set("age_seconds", age.to_string());
    k.set("age_days", (age / 86_400).to_string());
    Ok(if age > t.2 {
        (Severity::Down, "football_backup_older_than_14d".into())
    } else if age > t.1 {
        (Severity::Critical, "football_backup_older_than_9d".into())
    } else if age > t.0 {
        (Severity::Warning, "football_backup_older_than_8d".into())
    } else {
        (Severity::Healthy, "none".into())
    })
}

fn restic(p: &str, now: i64, t: Thresholds, k: &mut Known) -> Verdict {
    if field(p, "PROTOCOL") != "omen-restic-check-status.v1" {
        return Err("protocol_mismatch");
    }
    if field(p, "STATUS_CHANNEL") != "OK" {
        return Err("remote_status_channel_error");
    }
    let check = field(p, "CHECK_RESULT");
    k.set("check_result", check);
    k.set("restic_check_completed_utc", field(p, "COMPLETED_UTC"));
    k.set("snapshot_count", field(p, "SNAPSHOT_COUNT"));
    if check != "OK" && check != "FAILED" {
        return Err("invalid_check_result");
    }
    let age = age(
        field(p, "COMPLETED_UTC"),
        now,
        k,
        None,
        (
            "invalid_timestamp",
            "timestamp_parse_failed",
            "timestamp_in_future",
        ),
    )?;
    k.set("age_days", (age / 86_400).to_string());
    Ok(if check == "FAILED" {
        (Severity::Critical, "restic_integrity_check_failed".into())
    } else if age > t.2 {
        (Severity::Down, "restic_check_older_than_21d".into())
    } else if age > t.1 {
        (Severity::Critical, "restic_check_older_than_14d".into())
    } else if age > t.0 {
        (Severity::Warning, "restic_check_older_than_9d".into())
    } else {
        (Severity::Healthy, "none".into())
    })
}

fn render(kind: Kind, severity: Severity, reason: String, k: &Known) -> Outcome {
    let pair = |key: &str, value: String| (key.to_string(), value);
    let result = severity.as_str().to_string();
    let (stdout, state) = match kind {
        Kind::SupabaseBackup => (
            vec![
                pair("RESULT", result.clone()),
                pair("REASON", reason.clone()),
                pair("BACKUP_COMPLETED_UTC", k.get("backup_completed_utc")),
                pair("AGE_SECONDS", k.get("age_seconds")),
                pair("AGE_HOURS", k.get("age_hours")),
                pair("SNAPSHOT_ID", k.get("snapshot_id")),
                pair("ATTEMPT_RESULT", k.get("attempt_result")),
                pair("AUTH_USERS", k.get("auth_users")),
                pair("AUTH_IDENTITIES", k.get("auth_identities")),
                pair("PUBLIC_BASE_TABLES", k.get("public_base_tables")),
                pair("STORAGE_OBJECTS", k.get("storage_objects")),
            ],
            [
                "backup_completed_utc",
                "age_seconds",
                "age_hours",
                "snapshot_id",
                "attempt_result",
                "attempt_utc",
                "attempt_phase",
                "attempt_exit_code",
                "auth_users",
                "auth_identities",
                "auth_mfa_factors",
                "public_base_tables",
                "storage_objects",
            ]
            .as_slice(),
        ),
        Kind::FootballBackup => (
            vec![
                pair("RESULT", result.clone()),
                pair("REASON", reason.clone()),
                pair("AGE_DAYS", k.get("age_days")),
            ],
            [
                "football_backup_completed_utc",
                "age_seconds",
                "age_days",
                "snapshot_id",
            ]
            .as_slice(),
        ),
        Kind::ResticCheck => (
            vec![
                pair("RESULT", result.clone()),
                pair("REASON", reason.clone()),
            ],
            [
                "restic_check_completed_utc",
                "check_result",
                "age_days",
                "snapshot_count",
            ]
            .as_slice(),
        ),
    };
    let mut state_lines = vec![pair("result", result), pair("reason", reason.clone())];
    state_lines.extend(state.iter().map(|key| pair(key, k.get(key))));
    Outcome {
        severity,
        reason,
        stdout,
        state: state_lines,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const OK_LOCAL: Local = Local {
        right_host: true,
        key_readable: true,
        known_hosts_readable: true,
        clock_valid: true,
        thresholds_valid: true,
    };
    const SNAP: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    // 2026-10-18T12:13:17Z
    const T0: i64 = 1_792_325_597;

    fn supa(completed: &str, attempt: &str) -> String {
        format!(
            "PROTOCOL=omen-backup-status.v1\nSTATUS_CHANNEL=OK\nSUCCESS_RESULT=HEALTHY\nCOMPLETED_UTC={completed}\nHOST=kvm1\nRECOVERY_FORMAT=2\nSNAPSHOT_ID={SNAP}\nAUTH_USERS=10\nAUTH_IDENTITIES=11\nAUTH_MFA_FACTORS=0\nPUBLIC_BASE_TABLES=27\nSTORAGE_OBJECTS=0\nATTEMPT_RESULT={attempt}\nATTEMPT_UTC={completed}\nATTEMPT_PHASE=\nATTEMPT_EXIT_CODE=\n"
        )
    }
    fn eval(kind: Kind, payload: &str, now: i64) -> Outcome {
        evaluate(
            kind,
            OK_LOCAL,
            Some(payload),
            now,
            Thresholds::default_for(kind),
        )
    }

    #[test]
    fn field_takes_the_first_exact_key_and_everything_after_the_first_equals() {
        assert_eq!(field("A=1\nAB=2\nA=3\nB=x=y\n", "A"), "1");
        assert_eq!(field("A=1\nB=x=y\n", "B"), "x=y");
        assert_eq!(field("A=1\n", "C"), "");
        // awk parity: CRLF keeps the \r (so PROTOCOL no longer matches), a bare key line returns the key.
        assert_eq!(field("A=1\r\nB=2\r\n", "A"), "1\r");
        assert_eq!(field("A\nB=2\n", "A"), "A");
    }

    #[test]
    fn bad_clock_or_threshold_overrides_are_down_before_any_remote_call() {
        let t = Thresholds::default_for(Kind::SupabaseBackup);
        let clock = Local {
            clock_valid: false,
            ..OK_LOCAL
        };
        assert_eq!(
            evaluate(Kind::SupabaseBackup, clock, None, T0, t).reason,
            "invalid_local_clock"
        );
        let thr = Local {
            thresholds_valid: false,
            ..OK_LOCAL
        };
        assert_eq!(
            evaluate(Kind::FootballBackup, thr, None, T0, t).reason,
            "invalid_threshold"
        );
    }

    #[test]
    fn crlf_payload_is_a_protocol_mismatch_like_bash() {
        let p = "PROTOCOL=omen-restic-check-status.v1\r\nSTATUS_CHANNEL=OK\r\nCHECK_RESULT=OK\r\n";
        assert_eq!(eval(Kind::ResticCheck, p, T0).reason, "protocol_mismatch");
    }

    #[test]
    fn supabase_bands_follow_age_and_attempt() {
        let p = supa("2026-10-18T12:13:17Z", "SUCCESS");
        let at = |secs: i64| eval(Kind::SupabaseBackup, &p, T0 + secs);
        assert_eq!(
            (at(0).severity, at(0).reason.as_str()),
            (Severity::Healthy, "none")
        );
        assert_eq!(at(28_801).reason, "backup_older_than_8h");
        assert_eq!(
            (at(43_201).severity, at(43_201).reason.as_str()),
            (Severity::Critical, "backup_older_than_12h")
        );
        assert_eq!(
            (at(86_401).severity, at(86_401).reason.as_str()),
            (Severity::Down, "backup_older_than_24h")
        );
        let failed = eval(
            Kind::SupabaseBackup,
            &supa("2026-10-18T12:13:17Z", "FAILED"),
            T0,
        );
        assert_eq!(
            (failed.severity, failed.reason.as_str()),
            (Severity::Warning, "latest_backup_attempt_failed")
        );
    }

    #[test]
    fn supabase_stdout_and_state_match_the_bash_contract() {
        let o = eval(
            Kind::SupabaseBackup,
            &supa("2026-10-18T12:13:17Z", "SUCCESS"),
            T0 + 7_200,
        );
        let keys: Vec<&str> = o.stdout.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(
            keys,
            [
                "RESULT",
                "REASON",
                "BACKUP_COMPLETED_UTC",
                "AGE_SECONDS",
                "AGE_HOURS",
                "SNAPSHOT_ID",
                "ATTEMPT_RESULT",
                "AUTH_USERS",
                "AUTH_IDENTITIES",
                "PUBLIC_BASE_TABLES",
                "STORAGE_OBJECTS"
            ]
        );
        assert_eq!(o.stdout[3].1, "7200");
        assert_eq!(o.stdout[4].1, "2");
        assert_eq!(o.state.len(), 15);
        assert_eq!(o.severity.exit_code(), 0);
    }

    #[test]
    fn validation_failures_are_down_with_the_bash_reasons() {
        let good = supa("2026-10-18T12:13:17Z", "SUCCESS");
        let cases = [
            (good.replace("v1", "v2"), "protocol_mismatch"),
            (
                good.replace("STATUS_CHANNEL=OK", "STATUS_CHANNEL=ERR"),
                "remote_status_channel_error",
            ),
            (
                good.replace("HOST=kvm1", "HOST=kvm2"),
                "remote_host_mismatch",
            ),
            (
                good.replace("RECOVERY_FORMAT=2", "RECOVERY_FORMAT=1"),
                "recovery_format_mismatch",
            ),
            (good.replace(SNAP, "abc"), "invalid_snapshot_id"),
            (
                good.replace("AUTH_USERS=10", "AUTH_USERS=ten"),
                "invalid_backup_metadata",
            ),
            (
                good.replace("ATTEMPT_RESULT=SUCCESS", "ATTEMPT_RESULT=MAYBE"),
                "invalid_attempt_result",
            ),
            (
                good.replace(
                    "COMPLETED_UTC=2026-10-18T12:13:17Z",
                    "COMPLETED_UTC=yesterday",
                ),
                "invalid_backup_timestamp",
            ),
            (
                good.replace(
                    "COMPLETED_UTC=2026-10-18T12:13:17Z",
                    "COMPLETED_UTC=2026-02-30T12:00:00Z",
                ),
                "backup_timestamp_parse_failed",
            ),
        ];
        for (payload, reason) in cases {
            let o = eval(Kind::SupabaseBackup, &payload, T0);
            assert_eq!(
                (o.severity, o.reason.as_str()),
                (Severity::Down, reason),
                "{reason}"
            );
            assert_eq!(o.severity.exit_code(), 3);
        }
        let future = eval(Kind::SupabaseBackup, &good, T0 - 301);
        assert_eq!(
            (future.reason.as_str(), future.stdout[3].1.as_str()),
            ("backup_timestamp_in_future", "-301")
        );
        let edge = eval(Kind::SupabaseBackup, &good, T0 - 300); // bash: `AGE < -300` is DOWN, so -300 is tolerated
        assert_eq!(edge.reason, "none");
        let skew = eval(Kind::SupabaseBackup, &good, T0 - 299);
        assert_eq!(
            (skew.reason.as_str(), skew.stdout[3].1.as_str()),
            ("none", "0")
        );
    }

    #[test]
    fn local_problems_and_a_dead_channel_are_down() {
        let t = Thresholds::default_for(Kind::ResticCheck);
        let bad_host = Local {
            right_host: false,
            ..OK_LOCAL
        };
        assert_eq!(
            evaluate(Kind::ResticCheck, bad_host, None, T0, t).reason,
            "wrong_local_host"
        );
        let no_key = Local {
            key_readable: false,
            ..OK_LOCAL
        };
        assert_eq!(
            evaluate(Kind::ResticCheck, no_key, None, T0, t).reason,
            "ssh_key_unreadable"
        );
        let o = evaluate(
            Kind::FootballBackup,
            OK_LOCAL,
            None,
            T0,
            Thresholds::default_for(Kind::FootballBackup),
        );
        assert_eq!(
            (o.reason.as_str(), o.stdout[2].1.as_str()),
            ("status_channel_unavailable", "-1")
        );
    }

    #[test]
    fn supabase_rejects_misordered_thresholds() {
        let p = supa("2026-10-18T12:13:17Z", "SUCCESS");
        let o = evaluate(
            Kind::SupabaseBackup,
            OK_LOCAL,
            Some(&p),
            T0,
            Thresholds(10, 5, 20),
        );
        assert_eq!(o.reason, "invalid_threshold_order");
    }

    #[test]
    fn football_bands_in_days() {
        let p = format!(
            "PROTOCOL=omen-football-backup-status.v1\nSTATUS_CHANNEL=OK\nSUCCESS_RESULT=SUCCESS\nCOMPLETED_UTC=2026-10-18T12:13:17Z\nSNAPSHOT_ID={SNAP}\n"
        );
        let day = 86_400;
        assert_eq!(
            eval(Kind::FootballBackup, &p, T0 + 5 * day).stdout[2].1,
            "5"
        );
        assert_eq!(
            eval(Kind::FootballBackup, &p, T0 + 8 * day + 1).reason,
            "football_backup_older_than_8d"
        );
        assert_eq!(
            eval(Kind::FootballBackup, &p, T0 + 9 * day + 1).severity,
            Severity::Critical
        );
        assert_eq!(
            eval(Kind::FootballBackup, &p, T0 + 14 * day + 1).reason,
            "football_backup_older_than_14d"
        );
    }

    #[test]
    fn restic_failed_is_critical_immediately_and_age_degrades() {
        let p = |check: &str| {
            format!(
                "PROTOCOL=omen-restic-check-status.v1\nSTATUS_CHANNEL=OK\nCHECK_RESULT={check}\nCOMPLETED_UTC=2026-10-18T12:13:17Z\nDURATION_SECONDS=6\nSNAPSHOT_COUNT=259\n"
            )
        };
        let failed = eval(Kind::ResticCheck, &p("FAILED"), T0);
        assert_eq!(
            (failed.severity, failed.reason.as_str()),
            (Severity::Critical, "restic_integrity_check_failed")
        );
        assert_eq!(
            eval(Kind::ResticCheck, &p("OK"), T0 + 21 * 86_400 + 1).reason,
            "restic_check_older_than_21d"
        );
        assert_eq!(
            eval(Kind::ResticCheck, &p("MAYBE"), T0).reason,
            "invalid_check_result"
        );
        assert_eq!(eval(Kind::ResticCheck, &p("OK"), T0).stdout.len(), 2);
    }
}
