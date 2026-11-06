"""One hook contract for three runtimes, so guard.py, budget.py and report_gate.py stay single copies.

Claude Code and Codex send snake_case input (`tool_name`, `tool_input`, `transcript_path`); exit 2 with a
reason on stderr blocks a tool call, and `{"decision": "block"}` keeps a Stop going
(code.claude.com/docs/en/hooks; learn.chatgpt.com/docs/hooks).
Antigravity sends camelCase input (`toolCall.name`, `toolCall.args`, `transcriptPath`, `workspacePaths`,
`executionNum`); a tool call is denied with `{"decision": "deny"}` on stdout, and a Stop is kept going
with `{"decision": "continue"}`. Any other Stop value lets it stop (antigravity.google/docs/hooks).
Antigravity hooks are registered with `--agy` (.agents/hooks.json); its input is also recognised by shape.
"""
import json
import sys

AGY_TOOLS = {   # Antigravity tool -> (Claude-shaped tool, {its arg (case-insensitive): our arg}, required arg)
    "run_command": ("Bash", {"commandline": "command"}, "command"),
    "view_file": ("Read", {"absolutepath": "file_path"}, "file_path"),
    "write_to_file": ("Write", {"targetfile": "file_path"}, "file_path"),
    "replace_file_content": ("Edit", {"targetfile": "file_path"}, "file_path"),
    "multi_replace_file_content": ("Edit", {"targetfile": "file_path"}, "file_path"),
    "grep_search": ("Grep", {"searchpath": "path", "includes": "glob"}, None),
    "find_by_name": ("Glob", {"searchdirectory": "path", "pattern": "glob"}, None),
    "list_dir": ("Glob", {"directorypath": "path"}, None),
    # names leg 3 listed that the hooks page doesn't; mapped so they can't slip past (not verified)
    "read_file": ("Read", {"absolutepath": "file_path", "path": "file_path", "file_path": "file_path"}, "file_path"),
    "write_file": ("Write", {"targetfile": "file_path", "path": "file_path", "file_path": "file_path"}, "file_path"),
    "edit_file": ("Edit", {"targetfile": "file_path", "path": "file_path", "file_path": "file_path"}, "file_path"),
}
AGY_MATCHER = "|".join(AGY_TOOLS)


class BadInput(Exception):
    """Input the guards can't read. guard.py denies on it; budget.py and report_gate.py let it pass."""


AGY = "--agy" in sys.argv


def is_agy(ev):
    return AGY or "toolCall" in ev or "executionNum" in ev


def normalize(ev):
    """Claude/Codex input passes through; Antigravity input is mapped onto the same field names.
    Raises BadInput (or ValueError) on a shape it can't read."""
    if not isinstance(ev, dict):
        raise BadInput("hook input is not an object")
    if not is_agy(ev):
        return ev
    out = {"transcript_path": ev.get("transcriptPath", ""), "runtime": "antigravity",
           "cwd": (ev.get("workspacePaths") or [None])[0]}
    call = ev.get("toolCall")
    if call is not None:
        if isinstance(call, str):
            call = json.loads(call)
        args = call.get("args") if isinstance(call, dict) else None
        if isinstance(args, str):
            args = json.loads(args)
        if not isinstance(args, dict):
            raise BadInput("toolCall has no readable args")
        name = call.get("name", "")
        low = {str(k).lower(): v for k, v in args.items()}
        tool, keys, need = AGY_TOOLS.get(name, (name, {}, None))
        ti = {}
        for theirs, ours in keys.items():
            if low.get(theirs) is not None:
                ti[ours] = " ".join(map(str, low[theirs])) if isinstance(low[theirs], list) else low[theirs]
        if need and not ti.get(need):
            raise BadInput(f"{name}: no {need} in its args")
        out.update(hook_event_name="PreToolUse", tool_name=tool, tool_input=ti)
        if low.get("cwd"):
            out["cwd"] = low["cwd"]
    elif "executionNum" in ev:
        out.update(hook_event_name="Stop", stop_hook_active=(ev.get("executionNum") or 0) > 0)
    return out


def read_event():
    return normalize(json.load(sys.stdin))


def deny(reason, agy=None):
    """Block the current tool call, in the caller's runtime's terms. Never returns."""
    if AGY if agy is None else agy:
        print(json.dumps({"decision": "deny", "reason": reason}))
        sys.exit(0)
    print(f"blocked: {reason}", file=sys.stderr)
    sys.exit(2)


def keep_going(reason, agy=None):
    """Refuse a Stop and hand the agent `reason` as its next instruction."""
    word = "continue" if (AGY if agy is None else agy) else "block"
    print(json.dumps({"decision": word, "reason": reason}))
