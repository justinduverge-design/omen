//! `steward-freshness <supabase-backup|football-backup|restic-check> [--shadow]`
//!
//! I/O shell around the library: the machine-id guard, the forced-command ssh call (same key, options and retries as
//! the bash checks), the atomic state file, stdout and the exit code. `--shadow` writes `<stem>.rust.status` so it can
//! run beside the bash check without touching its state. There is no way to skip the host guard: parity tests put a
//! fake `ssh` on PATH instead (crates/steward-freshness/parity/).

use std::fs;
use std::io::{Read, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::process::{Command, ExitCode, Stdio};
use std::thread::sleep;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use steward_freshness::{Kind, Local, Thresholds, evaluate, time};

const MACHINE_ID: &str = "a459056448eb4cafadb2e4480abea91a"; // Steward. machine-id, not hostname (2026-09 incident).
const KEY: &str = "/var/lib/steward/ssh/omen-backup-status-ed25519";
const KNOWN_HOSTS: &str = "/var/lib/steward/ssh/known_hosts";
const STATE_DIR: &str = "/var/lib/steward/state";
const ATTEMPTS: u32 = 4; // right after a boot the tailnet may not be up yet
const ATTEMPT_TIMEOUT: Duration = Duration::from_secs(15);
const RETRY_PAUSE: Duration = Duration::from_secs(20);

/// bash `${VAR:-default}`: an empty value counts as unset. A set value must be plain digits (`^[0-9]+$`).
fn env_digits(name: &str) -> Option<Result<i64, ()>> {
    std::env::var(name).ok().filter(|v| !v.is_empty()).map(|v| {
        if v.bytes().all(|b| b.is_ascii_digit()) {
            v.parse::<i64>().map_err(|_| ())
        } else {
            Err(())
        }
    })
}

fn readable(path: &str) -> bool {
    fs::File::open(path).is_ok()
}

/// One `timeout 15s ssh ...` attempt. Some(stdout) only on exit 0.
fn ssh_once(host: &str, command: &str, keep_stderr: bool) -> Option<String> {
    let mut child = Command::new("ssh")
        .args(["-i", KEY, "-o", "IdentitiesOnly=yes", "-o"])
        .arg(format!("UserKnownHostsFile={KNOWN_HOSTS}"))
        .args([
            "-o",
            "StrictHostKeyChecking=yes",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=5",
        ])
        .arg(format!("steward-status@{host}"))
        .arg(command)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        // The supabase and football bash checks let ssh stderr reach the journal (host-key errors); restic hides it.
        .stderr(if keep_stderr {
            Stdio::inherit()
        } else {
            Stdio::null()
        })
        .spawn()
        .ok()?;
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let mut out = String::new();
                child.stdout.take()?.read_to_string(&mut out).ok()?;
                return status.success().then_some(out);
            }
            Ok(None) if started.elapsed() < ATTEMPT_TIMEOUT => sleep(Duration::from_millis(100)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
        }
    }
}

fn fetch(host: &str, command: &str, keep_stderr: bool) -> Option<String> {
    for attempt in 1..=ATTEMPTS {
        if let Some(out) = ssh_once(host, command, keep_stderr) {
            return Some(out);
        }
        if attempt < ATTEMPTS {
            sleep(RETRY_PAUSE);
        }
    }
    None
}

fn write_state(path: &str, checked_at: &str, lines: &[(String, String)]) -> std::io::Result<()> {
    let mut body = format!("checked_at={checked_at}\n");
    for (k, v) in lines {
        body.push_str(&format!("{k}={v}\n"));
    }
    let tmp = format!("{path}.tmp.{}", std::process::id());
    let written = (|| {
        // create_new: never follow or reuse something already at the temp path; 0640 from the first byte.
        let mut f = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o640)
            .open(&tmp)?;
        f.write_all(body.as_bytes())?;
        f.sync_all()?;
        fs::set_permissions(&tmp, fs::Permissions::from_mode(0o640))?;
        fs::rename(&tmp, path)
    })();
    if written.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    written
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let Some(kind) = args.first().and_then(|a| Kind::parse(a)) else {
        eprintln!(
            "usage: steward-freshness <supabase-backup|football-backup|restic-check> [--shadow]"
        );
        return ExitCode::from(64);
    };
    let shadow = args.iter().any(|a| a == "--shadow");

    let wall = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let clock = env_digits("NOW_EPOCH");
    let now = match clock {
        Some(Ok(n)) => n,
        _ => wall,
    };
    let defaults = Thresholds::default_for(kind);
    let overrides = Thresholds::env_names(kind).map(env_digits);
    let pick = |i: usize, default: i64| match overrides[i] {
        Some(Ok(n)) => n,
        _ => default,
    };
    let thresholds = Thresholds(
        pick(0, defaults.0),
        pick(1, defaults.1),
        pick(2, defaults.2),
    );

    let local = Local {
        // bash: [[ "$(cat /etc/machine-id)" == ... ]] (command substitution strips trailing newlines only)
        right_host: fs::read_to_string("/etc/machine-id")
            .map(|s| s.trim_end_matches('\n') == MACHINE_ID)
            .unwrap_or(false),
        key_readable: readable(KEY),
        known_hosts_readable: readable(KNOWN_HOSTS),
        clock_valid: !matches!(clock, Some(Err(()))),
        thresholds_valid: !overrides.iter().any(|o| matches!(o, Some(Err(())))),
    };
    let preflight_ok = local.right_host
        && local.key_readable
        && local.known_hosts_readable
        && local.clock_valid
        && local.thresholds_valid;
    let host = std::env::var("KVM1_HOST")
        .ok()
        .filter(|h| !h.is_empty())
        .unwrap_or_else(|| "100.115.155.19".to_string());
    let payload = if preflight_ok {
        fetch(&host, kind.remote_command(), kind != Kind::ResticCheck)
    } else {
        None
    };

    let outcome = evaluate(kind, local, payload.as_deref(), now, thresholds);
    let stem = if shadow {
        format!("{}.rust", kind.state_stem())
    } else {
        kind.state_stem().to_string()
    };
    let state_dir = std::env::var("STEWARD_STATE_DIR")
        .ok()
        .filter(|d| !d.is_empty())
        .unwrap_or_else(|| STATE_DIR.to_string());
    if let Err(e) = write_state(
        &format!("{state_dir}/{stem}.status"),
        &time::format_utc(wall),
        &outcome.state,
    ) {
        // bash (set -e) dies here with no stdout; a stale state file must never look like a fresh verdict.
        eprintln!("steward-freshness: could not write state: {e}");
        return ExitCode::from(1);
    }
    for (k, v) in &outcome.stdout {
        println!("{k}={v}");
    }
    ExitCode::from(outcome.severity.exit_code() as u8)
}
