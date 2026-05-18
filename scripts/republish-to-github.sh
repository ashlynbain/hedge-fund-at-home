#!/usr/bin/env bash
# Run AFTER you delete github.com/ashlynbain/hedge-fund-at-home in browser.
set -euo pipefail
cd "$(dirname "$0")/.."

if gh repo view ashlynbain/hedge-fund-at-home &>/dev/null; then
  echo "Repo still exists. Delete it first:"
  echo "  https://github.com/ashlynbain/hedge-fund-at-home/settings"
  exit 1
fi

git remote remove origin 2>/dev/null || true
gh repo create hedge-fund-at-home --public --source=. --remote=origin --push
echo "Done: https://github.com/ashlynbain/hedge-fund-at-home"
