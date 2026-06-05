#!/usr/bin/env bash
# Blocks accidentally committing large binaries. Default limit: 5 MiB.
set -euo pipefail

limit_bytes=$((5 * 1024 * 1024))
status=0

for file in "$@"; do
  [ -f "$file" ] || continue
  size=$(wc -c < "$file" | tr -d ' ')
  if [ "$size" -gt "$limit_bytes" ]; then
    printf '✖ %s is %s bytes (over the %s byte limit).\n' "$file" "$size" "$limit_bytes"
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "  Use Git LFS or Cloudflare R2 for large assets instead of committing them."
fi

exit "$status"
