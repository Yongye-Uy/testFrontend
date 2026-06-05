#!/usr/bin/env bash
# Validates that the commit message follows Conventional Commits 1.0.0.
# https://www.conventionalcommits.org/en/v1.0.0/
set -euo pipefail

msg_file="$1"
header="$(head -n1 "$msg_file")"

# Let merge / revert commits through.
case "$header" in
  "Merge "* | "Revert "*) exit 0 ;;
esac

pattern='^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9._/-]+\))?(!)?: .+'

if ! printf '%s' "$header" | grep -Eq "$pattern"; then
  echo "✖ Commit message does not follow Conventional Commits."
  echo "  Got:      $header"
  echo "  Expected: <type>[optional scope]: <description>"
  echo "  Types:    build chore ci docs feat fix perf refactor revert style test"
  echo "  Example:  feat(auth): add Google OAuth login"
  echo "  See https://www.conventionalcommits.org/en/v1.0.0/"
  exit 1
fi
