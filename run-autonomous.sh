#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

exec ralph \
  --agent opencode \
  --max-iterations "${RALPH_MAX_ITERATIONS:-120}" \
  --no-commit \
  --no-questions \
  --abort-promise HUMAN_BLOCKER \
  --completion-promise COMPLETE \
  --prompt-file .ralph/gsd-autonomous.md
