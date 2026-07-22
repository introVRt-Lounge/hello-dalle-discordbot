#!/bin/sh
# Ensure persistent mounts are writable by the runtime user, then drop privileges.
# Named volumes created under an older root image keep root:root ownership forever;
# Dockerfile RUN chown cannot fix them. See issue #132.
set -eu

RUNTIME_USER="${RUNTIME_USER:-node}"
RUNTIME_UID="$(id -u "$RUNTIME_USER" 2>/dev/null || echo 1000)"
RUNTIME_GID="$(id -g "$RUNTIME_USER" 2>/dev/null || echo 1000)"

WRITABLE_DIRS="/usr/src/app/welcome_images /usr/src/app/profile_images /usr/src/app/data /usr/src/app/temp /usr/src/app/logs"

ensure_dirs() {
  for dir in $WRITABLE_DIRS; do
    mkdir -p "$dir"
  done
}

fix_ownership() {
  if [ "$(id -u)" -ne 0 ]; then
    return 0
  fi
  for dir in $WRITABLE_DIRS; do
    # Only chown mount roots we own the tree of; ignore failures on read-only binds.
    chown -R "${RUNTIME_UID}:${RUNTIME_GID}" "$dir" 2>/dev/null || true
  done
}

assert_writable() {
  for dir in $WRITABLE_DIRS; do
    probe="${dir}/.writability_probe"
    if ! touch "$probe" 2>/dev/null; then
      echo "FATAL: ${dir} is not writable by $(id -un) (uid=$(id -u))." >&2
      echo "FATAL: Refusing to start — welcome/pfp watermark paths would fail at runtime (issue #132)." >&2
      exit 1
    fi
    rm -f "$probe"
  done
}

ensure_dirs
fix_ownership

if [ "$(id -u)" -eq 0 ]; then
  assert_writable
  exec gosu "$RUNTIME_USER" "$0" "$@"
fi

assert_writable
exec "$@"
