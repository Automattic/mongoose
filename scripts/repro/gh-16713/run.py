#!/usr/bin/env python3
"""Record a local verification command, its output, and its actual exit code."""

import datetime
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import time


label, *command = sys.argv[1:]
directory = Path(os.environ.get("MONGOOSE_16713_OUTPUT_DIR", Path(__file__).resolve().parent / "results" / "local"))
directory.mkdir(parents=True, exist_ok=True)
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
start = time.monotonic()
with (directory / f"{label}.log").open("w") as log:
    header = f"$ {shlex.join(command)}\n"
    print(header, end="", flush=True)
    log.write(header)
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        print(line, end="", flush=True)
        log.write(line)
    code = process.wait()
    footer = f"\nEXIT_CODE={code}\n"
    print(footer, end="", flush=True)
    log.write(footer)

(directory / f"{label}.command.json").write_text(json.dumps({
    "command": command,
    "shell_command": shlex.join(command),
    "cwd": str(Path.cwd()),
    "started_at": started,
    "seconds": round(time.monotonic() - start, 3),
    "exit_code": code,
}, indent=2) + "\n")
sys.exit(code)
