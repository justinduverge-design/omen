#!/usr/bin/env python3
"""Dependency-free Omen football-data witness and payload-free signal writer."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PRODUCTION_ROOT = Path("/var/lib/omen-football-witness")
ALERT_SEVERITY = {
    "job_failure": "high",
    "source_loss": "high",
    "schema_drift": "critical",
    "stale_data": "high",
    "disk_low": "high",
    "witness_mismatch": "critical",
    "witness_outage": "high",
}
MAX_BYTES = 64 * 1024 * 1024
SOURCES = {
    "stats_player": {
        "url": "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv",
        "required": ("player_id", "player_name", "season", "week", "season_type", "fantasy_points", "fantasy_points_ppr"),
    },
    "stats_team": {
        "url": "https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_{season}.csv",
        "required": ("season", "week", "team", "season_type", "game_id", "opponent_team", "def_sacks", "def_interceptions", "fumble_recovery_opp", "fg_made", "pat_made"),
    },
    "schedules": {
        "url": "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv",
        "required": ("game_id", "season", "game_type", "week", "gameday", "away_team", "away_score", "home_team", "home_score", "old_game_id", "gsis", "pfr", "pff", "espn"),
    },
}


def parse_time(value: str) -> datetime:
    selected = value.replace("Z", "+00:00")
    result = datetime.fromisoformat(selected)
    if result.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return result.astimezone(timezone.utc)


def source_url(dataset: str, season: int) -> str:
    return SOURCES[dataset]["url"].format(season=season)


def fetch_source(dataset: str, season: int) -> tuple[bytes, list[str]]:
    request = Request(
        source_url(dataset, season),
        headers={"User-Agent": "OmenFootballWitness/1.0", "Accept": "text/csv,application/octet-stream;q=0.9"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            declared = int(response.headers.get("Content-Length", "0") or "0")
            if declared > MAX_BYTES:
                raise ValueError("source exceeds witness byte limit")
            data = response.read(MAX_BYTES + 1)
    except HTTPError as error:
        if error.code == 404:
            raise RuntimeError("SOURCE_LOSS") from error
        raise RuntimeError("SOURCE_LOSS") from error
    except URLError as error:
        raise RuntimeError("SOURCE_LOSS") from error
    if not data or len(data) > MAX_BYTES:
        raise ValueError("source is empty or exceeds witness byte limit")
    first_line = data.splitlines()[0].decode("utf-8-sig")
    headers = next(csv.reader(io.StringIO(first_line)))
    missing = [column for column in SOURCES[dataset]["required"] if column not in headers]
    if missing:
        raise ValueError("SCHEMA_DRIFT")
    return data, headers


def immutable_bytes(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as handle:
            handle.write(value)
    except FileExistsError:
        if path.read_bytes() != value:
            raise ValueError("immutable witness conflict")


def retain_two_snapshots(directory: Path) -> None:
    snapshots = sorted(directory.glob("*.csv.gz"), key=lambda item: (item.stat().st_mtime_ns, item.name), reverse=True)
    for expired in snapshots[2:]:
        expired.unlink()


def capture_all(root: Path, season: int, now: datetime) -> dict:
    datasets = {}
    conditions = []
    for dataset in ("stats_player", "stats_team", "schedules"):
        try:
            data, headers = fetch_source(dataset, season)
        except RuntimeError:
            conditions.append({"code": "source_loss", "severity": "high"})
            continue
        except ValueError:
            conditions.append({"code": "schema_drift", "severity": "critical"})
            continue
        digest = hashlib.sha256(data).hexdigest()
        compressed = gzip.compress(data, compresslevel=9, mtime=0)
        snapshot_directory = root / "snapshots" / dataset / str(season)
        immutable_bytes(snapshot_directory / f"{digest}.csv.gz", compressed)
        retain_two_snapshots(snapshot_directory)
        manifest = {
            "schema": "omen-football-witness-manifest.v1",
            "observed_at_utc": now.isoformat().replace("+00:00", "Z"),
            "source": "nflverse-data",
            "dataset": dataset,
            "season": season,
            "raw_sha256": digest,
            "raw_byte_length": len(data),
            "source_columns_sha256": hashlib.sha256(json.dumps(headers, separators=(",", ":")).encode()).hexdigest(),
            "attribution": "Data sourced from nflverse-data under CC BY 4.0.",
        }
        manifest_path = root / "manifests" / dataset / str(season) / f"{now.strftime('%Y%m%dT%H%M%SZ')}-{digest[:16]}.json"
        immutable_bytes(manifest_path, (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode())
        datasets[dataset] = {"sha256": digest, "byte_length": len(data)}
    status = {
        "schema": "omen-football-witness-current.v1",
        "generated_at_utc": now.isoformat().replace("+00:00", "Z"),
        "season": season,
        "datasets": datasets,
        "publication_authorized": False,
    }
    atomic_json(root / "status" / "current.json", status)
    write_signals(root, conditions)
    if conditions:
        raise RuntimeError("witness capture did not admit every source")
    return status


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")
    if len(data) > 64 * 1024:
        raise ValueError("witness JSON exceeds the 64 KiB control-plane limit")
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o640)
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def write_exercise(root: Path, code: str, state: str) -> dict:
    if code not in ALERT_SEVERITY:
        raise ValueError("unsupported alert code")
    if state not in {"active", "clear"}:
        raise ValueError("state must be active or clear")
    conditions = [] if state == "clear" else [{"code": code, "severity": ALERT_SEVERITY[code]}]
    signal = {
        "schema": "omen-football-alert-signals.v1",
        "mode": "controlled_exercise",
        "conditions": conditions,
    }
    atomic_json(root / "signals.json", signal)
    return signal


def write_signals(root: Path, conditions: list[dict], mode: str = "live") -> dict:
    unique = {(item["code"], item["severity"]): item for item in conditions}
    signal = {
        "schema": "omen-football-alert-signals.v1",
        "mode": mode,
        "conditions": [unique[key] for key in sorted(unique)],
    }
    atomic_json(root / "signals.json", signal)
    return signal


def compare_status(
    root: Path,
    remote_path: Path,
    now: datetime,
    minimum_free_bytes: int,
    maximum_age_seconds: int,
) -> tuple[dict, int]:
    try:
        remote = json.loads(remote_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        write_signals(root, [{"code": "witness_outage", "severity": "high"}])
        return {
            "schema": "omen-football-witness-observation.v1",
            "status": "unavailable",
            "expected_hash": None,
            "observed_hash": None,
            "publication_authorized": False,
        }, 3

    local = json.loads((root / "status" / "current.json").read_text(encoding="utf-8"))
    if remote.get("schema") != "omen-football-production-status.v1":
        write_signals(root, [{"code": "witness_outage", "severity": "high"}])
        return {
            "schema": "omen-football-witness-observation.v1",
            "status": "unavailable",
            "expected_hash": None,
            "observed_hash": None,
            "publication_authorized": False,
        }, 3

    conditions = []
    for alert in remote.get("alerts", []):
        code = alert.get("code")
        if code in ALERT_SEVERITY:
            conditions.append({"code": code, "severity": ALERT_SEVERITY[code]})

    local_hashes = {name: item.get("sha256") for name, item in local.get("datasets", {}).items()}
    remote_hashes = {name: item.get("sha256") for name, item in remote.get("datasets", {}).items()}
    admitted = ("stats_player", "stats_team", "schedules")
    mismatch = any(local_hashes.get(name) != remote_hashes.get(name) for name in admitted)
    if mismatch:
        conditions.append({"code": "witness_mismatch", "severity": "critical"})

    generated = parse_time(remote["generated_at_utc"])
    age_seconds = (now - generated).total_seconds()
    if age_seconds < 0 or age_seconds > maximum_age_seconds:
        conditions.append({"code": "stale_data", "severity": "high"})

    stat = os.statvfs(root)
    free_bytes = stat.f_bavail * stat.f_frsize
    if free_bytes < minimum_free_bytes:
        conditions.append({"code": "disk_low", "severity": "high"})

    write_signals(root, conditions)
    combined_expected = json.dumps([(name, remote_hashes.get(name)) for name in admitted], separators=(",", ":"))
    combined_observed = json.dumps([(name, local_hashes.get(name)) for name in admitted], separators=(",", ":"))
    import hashlib

    expected_hash = hashlib.sha256(combined_expected.encode("utf-8")).hexdigest()
    observed_hash = hashlib.sha256(combined_observed.encode("utf-8")).hexdigest()
    observation = {
        "schema": "omen-football-witness-observation.v1",
        "observed_at_utc": now.isoformat().replace("+00:00", "Z"),
        "status": "match" if not conditions else ("mismatch" if mismatch else "alert"),
        "expected_hash": expected_hash,
        "observed_hash": observed_hash,
        "datasets": {
            name: {"expected_sha256": remote_hashes.get(name), "observed_sha256": local_hashes.get(name)}
            for name in admitted
        },
        "publication_authorized": False,
    }
    atomic_json(root / "observations" / f"{now.strftime('%Y%m%dT%H%M%SZ')}-{expected_hash[:16]}.json", observation)
    return observation, 0 if not conditions else 2


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    subparsers = result.add_subparsers(dest="command", required=True)
    exercise = subparsers.add_parser("exercise")
    exercise.add_argument("--root", type=Path, default=PRODUCTION_ROOT)
    exercise.add_argument("--code", choices=sorted(ALERT_SEVERITY), required=True)
    exercise.add_argument("--state", choices=("active", "clear"), required=True)
    compare = subparsers.add_parser("compare")
    compare.add_argument("--root", type=Path, default=PRODUCTION_ROOT)
    compare.add_argument("--status-file", type=Path, required=True)
    compare.add_argument("--now")
    compare.add_argument("--minimum-free-bytes", type=int, default=10 * 1024**3)
    compare.add_argument("--maximum-age-seconds", type=int, default=36 * 60 * 60)
    capture = subparsers.add_parser("capture")
    capture.add_argument("--root", type=Path, default=PRODUCTION_ROOT)
    capture.add_argument("--season", type=int, default=datetime.now(timezone.utc).year)
    capture.add_argument("--now")
    return result


def main() -> int:
    options = parser().parse_args()
    if options.command == "exercise":
        signal = write_exercise(options.root.resolve(), options.code, options.state)
        print(json.dumps(signal, sort_keys=True))
        return 0
    if options.command == "compare":
        now = parse_time(options.now) if options.now else datetime.now(timezone.utc)
        observation, result = compare_status(
            options.root.resolve(),
            options.status_file.resolve(),
            now,
            options.minimum_free_bytes,
            options.maximum_age_seconds,
        )
        print(json.dumps(observation, sort_keys=True))
        return result
    if options.command == "capture":
        now = parse_time(options.now) if options.now else datetime.now(timezone.utc)
        status = capture_all(options.root.resolve(), options.season, now)
        print(json.dumps(status, sort_keys=True))
        return 0
    raise AssertionError("unreachable")


if __name__ == "__main__":
    raise SystemExit(main())
