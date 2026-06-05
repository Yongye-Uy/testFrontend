#!/usr/bin/env bash
# Enforces the EPPLMS branch naming model (see README.md): environment branches
# are integration-only (PR merges); supporting branches must be prefixed
# feature/, bugfix/, or hotfix/.
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"

# Allow detached HEAD (rebase, CI, bisect) to pass.
[ "$branch" = "HEAD" ] && exit 0

env_branches='^(main|staging|production)$'
pattern='^(feature|bugfix|hotfix)/[a-z0-9._-]+$'

if printf '%s' "$branch" | grep -Eq "$env_branches"; then
  echo "✖ Direct commits to environment branch '$branch' are not allowed."
  echo "  Create a supporting branch instead, e.g. feature/your-change."
  exit 1
fi

if ! printf '%s' "$branch" | grep -Eq "$pattern"; then
  echo "✖ Branch name '$branch' is not valid."
  echo "  Use feature/<name>, bugfix/<name>, or hotfix/<name> (lowercase)."
  exit 1
fi
