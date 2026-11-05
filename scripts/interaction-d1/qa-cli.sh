#!/bin/zsh
# QA tool cache and screenshots remain inside the workspace.
export PWTEST_DAEMON_SESSION_DIR="$PWD/node_modules/.cache/d1-daemon"
export PWTEST_SOCKETS_DIR="$PWD/.pw-sockets"
export TMPDIR="$PWD/node_modules/.cache/d1-tmp"
node node_modules/.cache/qa-npm/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js -s=d1 "$@"
