#!/usr/bin/env bash
# JS syntax checker — the automated gate for this repo.
#
# WHY THIS EXISTS: both CLAUDE.md files used to say "node --check path/to/file.js".
# There is no node on this machine (no PATH entry, no nvm, no homebrew install).
# macOS ships JavaScriptCore, whose `jsc` helper exposes checkSyntax(), so that
# is the substitute. Verified with both a positive and a negative control —
# it correctly rejects `function broken( {` and correctly accepts valid source.
#
# NOTE: checkSyntax() takes a FILE PATH, not source text. Passing source makes it
# fail with "Could not open file", which looks like a syntax error and isn't.
#
#   bash scripts/check-syntax.sh                 # all JS under versions/v3 + gate
#   bash scripts/check-syntax.sh path/to/file.js # specific files
#   bash scripts/check-syntax.sh versions/v3     # everything under a directory
#
# Exits non-zero if anything fails to parse.

set -uo pipefail

JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
if [ ! -x "$JSC" ]; then
  echo "error: jsc not found at $JSC" >&2
  echo "       install node and use 'node --check' instead" >&2
  exit 2
fi

# Collect targets: explicit args, or the default set.
files=()
if [ "$#" -eq 0 ]; then
  while IFS= read -r f; do files+=("$f"); done < <(find versions/v3 gate -name '*.js' 2>/dev/null | sort)
else
  for arg in "$@"; do
    if [ -d "$arg" ]; then
      while IFS= read -r f; do files+=("$f"); done < <(find "$arg" -name '*.js' | sort)
    else
      files+=("$arg")
    fi
  done
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "no .js files matched"; exit 0
fi

pass=0; fail=0
for f in "${files[@]}"; do
  # Absolute path — jsc resolves relative to its own cwd, not necessarily ours.
  abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
  if err=$("$JSC" -e "checkSyntax('$abs')" 2>&1); then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "FAIL $f"
    echo "     $(echo "$err" | head -1)"
  fi
done

echo "─────────────────────────────────"
echo "$pass passed, $fail failed  (${#files[@]} files)"
[ "$fail" -eq 0 ]
