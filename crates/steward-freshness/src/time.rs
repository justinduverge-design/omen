//! Strict UTC timestamps without a time crate: `YYYY-MM-DDTHH:MM:SSZ` only.

/// Shape check, the bash regex `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$`.
pub fn is_strict_utc(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 20
        && b.iter().enumerate().all(|(i, c)| match i {
            4 | 7 => *c == b'-',
            10 => *c == b'T',
            13 | 16 => *c == b':',
            19 => *c == b'Z',
            _ => c.is_ascii_digit(),
        })
}

/// Seconds since the Unix epoch, or None for an impossible date or time (2026-02-30, 25:00:00, ...).
/// A shape-valid input that GNU `date -d` would reject is rejected here too.
pub fn parse_utc(s: &str) -> Option<i64> {
    if !is_strict_utc(s) {
        return None;
    }
    let n = |range: std::ops::Range<usize>| s[range].parse::<i64>().ok();
    let (year, month, day) = (n(0..4)?, n(5..7)?, n(8..10)?);
    let (hour, minute, second) = (n(11..13)?, n(14..16)?, n(17..19)?);
    if !(1..=12).contains(&month) || day < 1 || day > days_in_month(year, month) {
        return None;
    }
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    Some(days_from_civil(year, month, day) * 86_400 + hour * 3_600 + minute * 60 + second)
}

fn is_leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        2 if is_leap(year) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

/// Days since 1970-01-01 (Howard Hinnant's algorithm).
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (month + 9) % 12;
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// The current time as `YYYY-MM-DDTHH:MM:SSZ` (for `checked_at`).
pub fn format_utc(epoch: i64) -> String {
    let days = epoch.div_euclid(86_400);
    let secs = epoch.rem_euclid(86_400);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + if month <= 2 { 1 } else { 0 };
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}Z",
        secs / 3_600,
        secs % 3_600 / 60,
        secs % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_known_instants() {
        assert_eq!(parse_utc("1970-01-01T00:00:00Z"), Some(0));
        assert_eq!(parse_utc("2026-10-18T12:13:17Z"), Some(1_792_325_597));
        assert_eq!(parse_utc("2024-02-29T00:00:00Z"), Some(1_709_164_800));
    }

    #[test]
    fn rejects_impossible_dates_and_shapes() {
        for bad in [
            "2026-02-30T00:00:00Z",
            "2025-02-29T00:00:00Z",
            "2026-13-01T00:00:00Z",
            "2026-10-18T24:00:00Z",
            "2026-10-18T12:60:00Z",
            "2026-10-18 12:13:17Z",
            "2026-10-18T12:13:17",
            "2026-10-18T12:13:17+00:00",
        ] {
            assert_eq!(parse_utc(bad), None, "{bad}");
        }
    }

    #[test]
    fn format_round_trips() {
        for ts in [
            "1970-01-01T00:00:00Z",
            "2026-10-18T12:13:17Z",
            "2024-02-29T23:59:59Z",
            "2100-03-01T00:00:00Z",
        ] {
            assert_eq!(format_utc(parse_utc(ts).unwrap()), ts);
        }
    }
}
