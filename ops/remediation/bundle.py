#!/usr/bin/env python3
"""bundle.py build|verify - the signed playbook bundle (B13-HEAL-SIGNING).

  bundle.py build OUT.json [COMMIT [SEQ]]    validate every playbook and write one canonical bundle
  bundle.py verify BUNDLE.json SIG ALLOWED   check the signature, then the schema; print the playbook ids

CI signs the bundle with `ssh-keygen -Y sign` using a key only CI holds; the Pi holds only the public key
in an allowed_signers file, so a compromised Pi cannot mint playbooks. Verification checks the signature
over the exact bytes first and parses nothing until it passes. SEQ (the CI run number) only grows,
so the remediator can refuse an older signed bundle replayed onto the Pi. Stdlib plus ssh-keygen only.
Exit 0 on success, 1 on any refusal (the reason goes to stderr).
"""

import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import playbook_schema  # noqa: E402

BUNDLE_SCHEMA = "slops-remediation-bundle.v1"
NAMESPACE = "slops-remediation"
IDENTITY = "slops-remediation-ci"
PLAYBOOK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "playbooks")


class Refused(Exception):
    pass


def build(playbook_dir=PLAYBOOK_DIR, commit="", checks=None, seq=0):
    """Canonical bundle bytes: sorted keys, playbooks sorted by id, so a rebuild is byte-identical."""
    pbs = []
    for name in sorted(os.listdir(playbook_dir)):
        if name.endswith(".json"):
            with open(os.path.join(playbook_dir, name), encoding="utf-8") as fh:
                pbs.append(json.load(fh))
    errs = playbook_schema.validate_bundle(pbs, checks or playbook_schema.owner_checks())
    if errs:
        raise Refused("; ".join(errs))
    doc = {"schema": BUNDLE_SCHEMA, "commit": commit, "seq": seq, "playbooks": sorted(pbs, key=lambda p: p["id"])}
    return (json.dumps(doc, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode()


def verify(bundle_bytes, sig_path, allowed_signers, checks=None):
    """Return the playbooks only if the signature and then the schema both pass; otherwise raise Refused."""
    if not os.path.isfile(allowed_signers) or not any(
        line.strip() and not line.lstrip().startswith("#") for line in open(allowed_signers, encoding="utf-8")
    ):
        raise Refused("no public key in allowed_signers")
    if not os.path.isfile(sig_path):
        raise Refused("signature file missing")
    try:
        r = subprocess.run(
            ["ssh-keygen", "-Y", "verify", "-f", allowed_signers, "-I", IDENTITY, "-n", NAMESPACE, "-s", sig_path],
            input=bundle_bytes,
            capture_output=True,
            check=False,
        )
    except OSError as e:
        raise Refused(f"ssh-keygen unavailable: {e}") from e
    if r.returncode != 0:
        raise Refused("bad signature")
    try:
        doc = json.loads(bundle_bytes.decode("utf-8"))
    except ValueError as e:
        raise Refused("bundle is not JSON") from e
    if not isinstance(doc, dict) or doc.get("schema") != BUNDLE_SCHEMA or not isinstance(doc.get("playbooks"), list):
        raise Refused(f"not a {BUNDLE_SCHEMA} bundle")
    errs = playbook_schema.validate_bundle(doc["playbooks"], checks or playbook_schema.owner_checks())
    if errs:
        raise Refused("; ".join(errs))
    if not isinstance(doc.get("seq"), int) or isinstance(doc.get("seq"), bool):
        raise Refused("bundle has no sequence number")
    return doc["playbooks"]


def verify_doc(bundle_bytes, sig_path, allowed_signers, checks=None):
    """Like verify, but return (seq, playbooks) for the remediator's replay check."""
    pbs = verify(bundle_bytes, sig_path, allowed_signers, checks)
    return json.loads(bundle_bytes.decode("utf-8"))["seq"], pbs


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__.strip())
        return 0
    try:
        if argv[1] == "build" and len(argv) in (3, 4, 5):
            data = build(commit=argv[3] if len(argv) > 3 else "", seq=int(argv[4]) if len(argv) > 4 else 0)
            with open(argv[2], "wb") as fh:
                fh.write(data)
            return 0
        if argv[1] == "verify" and len(argv) == 5:
            with open(argv[2], "rb") as fh:
                pbs = verify(fh.read(), argv[3], argv[4])
            print("\n".join(p["id"] for p in pbs))
            return 0
    except Refused as e:
        print(f"refused: {e}", file=sys.stderr)
        return 1
    print(__doc__.strip(), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
