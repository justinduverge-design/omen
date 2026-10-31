#!/usr/bin/env python3
"""playbook_schema.py [playbook.json ...] - validate remediation playbooks (B13-HEAL-PLAYBOOKS).

Stdlib only: the remediator imports this on the Pi. A playbook names one alert check, one action from
the v1 vocabulary, its caps and its verify check. Anything else is refused, unknown keys included, so a
`shell`, `command` or `args` field can never ride along. Exit 0 if every file is valid, 1 otherwise.
"""
import json
import os
import re
import sys

SCHEMA = "slops-remediation-playbook.v1"
# The v1 vocabulary (design 2026-10-29). Value: does the action take a target.
ACTIONS = {"compose_up": True, "restart_unit": True, "rerun_unit": True, "docker_prune_images": False}
PRECONDITIONS = {"docker_daemon_up", "disk_free_over_10pct", "host_up_over_10min"}
HOSTS = {"command-center"}
OWNERS = {"founder", "agent"}
TARGET = re.compile(r"^[a-z0-9][a-z0-9@._-]{0,62}$")
UNIT_TARGET = re.compile(r"^[a-z0-9][a-z0-9@._-]{0,62}\.(service|timer)$")
# Human-only forever (fleet Constitution item 1, as amended): never a remediation target, whatever the action.
FORBIDDEN_TARGET = re.compile(
    r"(reboot|shutdown|poweroff|halt|kexec|ssh|network|wpa|firewall|nft|iptables|ufw|dns|pihole|resolv|"
    r"tailscale|docker\.service|containerd|systemd-|apt|unattended|dpkg|cmdline|boot|kernel|secret|"
    r"postgres|supabase|deploy|slops-remediator|slops-alert)"
)
# Allowed targets per action. A target must be named here AND pass the forbidden check, so a missing
# fragment above cannot open a new target: widening this list is its own reviewed change.
ALLOWED_TARGETS = {
    "compose_up": {"glitchtip"},
    "restart_unit": set(),
    "rerun_unit": set(),
}
DOCKER_ACTIONS = {"compose_up", "docker_prune_images"}
KEYS = {"schema", "id", "check", "host", "action", "preconditions", "max_attempts_per_24h",
        "cooldown_minutes", "verify", "escalate_to", "note"}
REQUIRED = KEYS - {"note"}
ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")


def owner_checks(table=None):
    """Check ids from the alert owner map (B13-ALERT-OWNERS): a playbook may only answer a known check."""
    table = table or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "command-center", "alert-owners.tsv")
    with open(table, encoding="utf-8") as fh:
        return {l.split("\t")[0] for l in fh if l.strip() and not l.startswith("#")}


def _int(v, lo, hi):
    return isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi


def validate(pb, checks):
    """Return a list of errors; empty means valid."""
    if not isinstance(pb, dict):
        return ["playbook is not an object"]
    errs = ["unknown key: %s" % k for k in sorted(set(pb) - KEYS)]
    errs += ["missing key: %s" % k for k in sorted(REQUIRED - set(pb))]
    if errs:
        return errs
    if pb["schema"] != SCHEMA:
        errs.append("schema must be %s" % SCHEMA)
    if not isinstance(pb["id"], str) or not ID.fullmatch(pb["id"]):
        errs.append("bad id")
    for k in ("check", "host", "escalate_to"):
        if not isinstance(pb[k], str):
            return errs + ["%s must be text" % k]
    if pb["check"] not in checks:
        errs.append("check %r is not in alert-owners.tsv" % (pb["check"],))
    if pb["host"] not in HOSTS:
        errs.append("host must be one of %s" % sorted(HOSTS))
    a = pb["action"]
    if not isinstance(a, dict):
        errs.append("action must be an object")
    else:
        t = a.get("type")
        if not isinstance(t, str) or t not in ACTIONS:
            errs.append("unknown action: %r" % (t,))
        else:
            allowed = {"type", "target"} if ACTIONS[t] else {"type"}
            errs += ["unknown action key: %s" % k for k in sorted(set(a) - allowed)]
            if ACTIONS[t]:
                tgt = a.get("target")
                pattern = UNIT_TARGET if t in ("restart_unit", "rerun_unit") else TARGET
                if not isinstance(tgt, str) or not pattern.fullmatch(tgt):
                    errs.append("bad target for %s: %r" % (t, tgt))
                elif FORBIDDEN_TARGET.search(tgt):
                    errs.append("target %r is human-only" % tgt)
                elif tgt not in ALLOWED_TARGETS[t]:
                    errs.append("target %r is not in the %s allowlist" % (tgt, t))
    pre = pb["preconditions"]
    if not isinstance(pre, list) or any(not isinstance(p, str) or p not in PRECONDITIONS for p in pre):
        errs.append("preconditions must be a list from %s" % sorted(PRECONDITIONS))
    elif isinstance(a, dict) and isinstance(a.get("type"), str) and a["type"] in DOCKER_ACTIONS and "docker_daemon_up" not in pre:
        errs.append("docker actions need the docker_daemon_up precondition")
    if not _int(pb["max_attempts_per_24h"], 1, 3):
        errs.append("max_attempts_per_24h must be 1-3")
    if not _int(pb["cooldown_minutes"], 15, 1440):
        errs.append("cooldown_minutes must be 15-1440")
    v = pb["verify"]
    if not isinstance(v, dict) or set(v) != {"check", "wait_seconds"}:
        errs.append("verify must have exactly check and wait_seconds")
    else:
        if not isinstance(v["check"], str) or v["check"] not in checks:
            errs.append("verify check %r is not in alert-owners.tsv" % (v["check"],))
        if not _int(v["wait_seconds"], 30, 900):
            errs.append("verify wait_seconds must be 30-900")
    if pb["escalate_to"] not in OWNERS:
        errs.append("escalate_to must be one of %s" % sorted(OWNERS))
    if "note" in pb and not isinstance(pb["note"], str):
        errs.append("note must be text")
    return errs


def validate_bundle(playbooks, checks):
    """Validate a list of playbooks; also refuse duplicate ids and two playbooks for one check."""
    errs = []
    seen_ids, seen_checks = set(), set()
    for pb in playbooks:
        e = validate(pb, checks)
        name = pb.get("id", "?") if isinstance(pb, dict) else "?"
        errs += ["%s: %s" % (name, x) for x in e]
        if not e:
            if pb["id"] in seen_ids:
                errs.append("%s: duplicate id" % name)
            if pb["check"] in seen_checks:
                errs.append("%s: second playbook for check %s" % (name, pb["check"]))
            seen_ids.add(pb["id"])
            seen_checks.add(pb["check"])
    return errs


def main(argv):
    if len(argv) > 1 and argv[1] in ("-h", "--help"):
        print(__doc__.strip())
        return 0
    paths = argv[1:]
    if not paths:
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "playbooks")
        paths = sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith(".json"))
    pbs = []
    for p in paths:
        with open(p, encoding="utf-8") as fh:
            pbs.append(json.load(fh))
    errs = validate_bundle(pbs, owner_checks())
    for e in errs:
        print(e, file=sys.stderr)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
