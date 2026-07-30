#!/usr/bin/env bash
#
# Nythera - Linux server install/update script.
#
# Assumes:
#   - Debian/Ubuntu server (apt-based) with sudo available - e.g. a CloudPanel box.
#   - This script is run from the root of an already-deployed copy of the repo
#     (git clone / rsync / CloudPanel file upload - whatever got the code onto the box).
#   - MySQL is already running and reachable (e.g. CloudPanel's own MySQL, or any MySQL 8+
#     instance) - this script does NOT install or manage MySQL itself, only connects to it.
#   - A reverse proxy (CloudPanel's "Reverse Proxy" site type, or nginx/Caddy) terminates
#     TLS and forwards the whole domain to 127.0.0.1:$PORT - this script does NOT touch
#     nginx/CloudPanel config, since CloudPanel manages that itself and manual edits get
#     overwritten. See the final summary this script prints for the exact values to enter.
#
# Safe to re-run: re-running upgrades an existing install in place (git pull is NOT done
# here - pull/copy your new code first, then re-run this script).
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="nythera-backend"
NODE_MAJOR="22"
RUN_USER="${SUDO_USER:-$(whoami)}"

color() { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()  { color "36" "==> $1"; }
warn()  { color "33" "!! $1"; }
ok()    { color "32" "OK  $1"; }
fail()  { color "31" "FAIL $1"; exit 1; }

cd "$APP_DIR"

# ---------------------------------------------------------------------------
# 1. Node.js (via NodeSource) + corepack/pnpm
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//;s/\..*//')" -lt "$NODE_MAJOR" ]; then
  info "Installing Node.js ${NODE_MAJOR}.x (NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
else
  ok "Node.js $(node -v) already installed"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  info "Enabling pnpm via corepack"
  sudo corepack enable
  corepack prepare pnpm@9.12.0 --activate
else
  ok "pnpm $(pnpm -v) already installed"
fi

# ---------------------------------------------------------------------------
# 2. .env - create from the template + generate real JWT secrets if missing.
#    Never overwrites an existing .env (DB credentials you already filled in stay put).
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
  info "No .env found - creating one from .env.example"
  cp .env.example .env
  ACCESS_SECRET="$(openssl rand -base64 48 | tr -d '\n=+/')"
  REFRESH_SECRET="$(openssl rand -base64 48 | tr -d '\n=+/')"
  sed -i \
    -e "s#^JWT_ACCESS_SECRET=.*#JWT_ACCESS_SECRET=${ACCESS_SECRET}#" \
    -e "s#^JWT_REFRESH_SECRET=.*#JWT_REFRESH_SECRET=${REFRESH_SECRET}#" \
    .env
  unset ACCESS_SECRET REFRESH_SECRET
  warn "Generated random JWT secrets automatically. You still need to fill in:"
  warn "  DB_USER / DB_PASSWORD / DB_NAME, CORS_ORIGIN, APP_PUBLIC_URL"
  warn "Edit .env now, then re-run this script."
  exit 0
else
  ok ".env already exists - leaving it untouched"
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

for var in DB_USER DB_PASSWORD DB_NAME JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  if [ -z "${!var:-}" ] || [[ "${!var}" == change-me* ]]; then
    fail "\$${var} is not set in .env (still a placeholder) - fill it in and re-run."
  fi
done

# ---------------------------------------------------------------------------
# 3. MySQL connectivity check (does not create the database - CloudPanel/your DBA does that)
# ---------------------------------------------------------------------------
info "Checking MySQL connectivity (${DB_HOST:-127.0.0.1}:${DB_PORT:-3306}, db=${DB_NAME})"
if command -v mysql >/dev/null 2>&1; then
  if ! mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1; then
    fail "Could not connect to MySQL database '$DB_NAME' with the credentials in .env. Verify the database exists and the user has access."
  fi
  ok "MySQL connection verified"
else
  warn "mysql client not installed - skipping connectivity pre-check (mysql2 will still fail loudly on app start if wrong)"
fi

# ---------------------------------------------------------------------------
# 4. Install deps, migrate, build
# ---------------------------------------------------------------------------
info "Installing dependencies"
pnpm install --frozen-lockfile

info "Generating/applying database migrations"
pnpm --filter @nythera/backend db:generate
pnpm --filter @nythera/backend db:migrate

info "Building shared package, backend, frontend"
pnpm -r build

# ---------------------------------------------------------------------------
# 5. systemd service for the backend (also serves the built frontend - see SERVE_FRONTEND in .env)
# ---------------------------------------------------------------------------
info "Writing systemd unit for ${SERVICE_NAME}"
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=Nythera backend
After=network.target mysql.service

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(command -v node) ${APP_DIR}/packages/backend/dist/server.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sleep 2

if systemctl is-active --quiet "${SERVICE_NAME}"; then
  ok "${SERVICE_NAME} is running"
else
  fail "${SERVICE_NAME} failed to start - check: journalctl -u ${SERVICE_NAME} -n 100 --no-pager"
fi

PORT_VALUE="${PORT:-4000}"

echo
color "35" "=================================================================="
color "35" " Nythera is running locally on 127.0.0.1:${PORT_VALUE}"
color "35" "=================================================================="
echo "Manual step (CloudPanel UI - not scripted, CloudPanel manages its own nginx config):"
echo "  1. Sites -> Add Site -> Reverse Proxy"
echo "     Domain:        ${APP_PUBLIC_URL:-<your domain>}"
echo "     Proxy target:  127.0.0.1:${PORT_VALUE}"
echo "  2. Enable 'Websocket Support' for the site (required for /gateway realtime chat)."
echo "  3. Issue a Let's Encrypt certificate for the domain (CloudPanel -> SSL/TLS tab)."
echo
echo "Useful commands:"
echo "  systemctl status ${SERVICE_NAME}"
echo "  journalctl -u ${SERVICE_NAME} -f"
echo "  systemctl restart ${SERVICE_NAME}   # after re-running this script with new code"
echo
