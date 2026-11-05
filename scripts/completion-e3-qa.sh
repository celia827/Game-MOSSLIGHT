#!/bin/zsh
export PWTEST_DAEMON_SESSION_DIR="$PWD/node_modules/.cache/e3-daemon"
export PWTEST_SOCKETS_DIR="$PWD/.pw-sockets"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/e3-browser-binaries"
export TMPDIR="$PWD/node_modules/.cache/e3-tmp"
node node_modules/.cache/qa-npm/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js -s=e3 "$@"
