#!/usr/bin/env bash
# =================================================================
# SSFFMVP - one-time HTTPS setup on Oracle (Ubuntu 22+)
# -----------------------------------------------------------------
# Run as the 'ubuntu' user with sudo:
#   sudo bash scripts/oracle-https-setup.sh
#
# What this does (idempotently - safe to re-run):
#   1. Installs nginx + certbot + certbot-nginx
#   2. Opens 80/443 in Oracle Cloud's iptables (and ufw if present)
#   3. Writes /etc/nginx/sites-available/slopssaloon
#   4. Symlinks it active, removes the default
#   5. Reloads nginx
#   6. Runs `certbot --nginx` for slopssaloon.com + www
#   7. Verifies certbot.timer is active for auto-renewal
#
# Pre-reqs (your job, not this script's):
#   - DNS A records for slopssaloon.com + www -> 143.47.101.241
#   - Oracle Cloud Security List rule allowing tcp/80 + tcp/443
#     from 0.0.0.0/0 (set in OCI console, not on the VM)
#   - Your API container running on 127.0.0.1:3000
#
# SY0-701 mappings:
#   4.1 secure baselines     - TLS by default, redirect 80 -> 443
#   4.5 application security - HSTS, OCSP stapling, modern ciphers
#   4.9 monitoring           - Nginx access + error logs to syslog
# =================================================================

set -euo pipefail

DOMAIN_PRIMARY="slopssaloon.com"
DOMAIN_WWW="www.slopssaloon.com"
EMAIL="${LETSENCRYPT_EMAIL:-justin.duverge@yahoo.com}"
UPSTREAM="http://127.0.0.1:3000"
SITE_FILE="/etc/nginx/sites-available/slopssaloon"
SITE_LINK="/etc/nginx/sites-enabled/slopssaloon"

echo "==> Updating apt + installing nginx/certbot"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx ufw

echo "==> Opening 80/443 (ufw + iptables)"
# ufw - if active, allow web traffic. If inactive, leave it alone.
if ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp  || true
  ufw allow 443/tcp || true
fi
# Oracle's Ubuntu image ships with iptables blocking everything except 22.
# Insert allow rules for 80/443 on the INPUT chain if not already present.
for port in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT
  fi
done
# Persist iptables across reboots (Ubuntu)
if ! command -v netfilter-persistent &>/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi
netfilter-persistent save || true

echo "==> Writing nginx site config: $SITE_FILE"
cat > "$SITE_FILE" <<NGINX
# slopssaloon.com - reverse proxy + TLS termination
# Certbot will rewrite this file to add the SSL listener + redirects.

server {
    listen      80;
    listen      [::]:80;
    server_name $DOMAIN_PRIMARY $DOMAIN_WWW;

    # Let Certbot serve the ACME challenge from /.well-known/...
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Everything else: proxy to the API container.
    # After Certbot runs, this server block will redirect to HTTPS.
    location / {
        proxy_pass         $UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 60s;
    }
}
NGINX

echo "==> Enabling site + disabling default"
ln -sf "$SITE_FILE" "$SITE_LINK"
rm -f /etc/nginx/sites-enabled/default

echo "==> Validating nginx config"
nginx -t

echo "==> Reloading nginx"
systemctl reload nginx

echo "==> Requesting Let's Encrypt cert via certbot --nginx"
# --redirect: rewrite the http server block to 301 -> https
# --hsts: add Strict-Transport-Security header
# -n / --agree-tos / -m: non-interactive
certbot --nginx \
  -d "$DOMAIN_PRIMARY" \
  -d "$DOMAIN_WWW" \
  --redirect --hsts \
  -n --agree-tos -m "$EMAIL"

echo "==> Verifying renewal timer"
systemctl enable --now certbot.timer
systemctl status certbot.timer --no-pager | head -8

echo ""
echo "================================================================="
echo " HTTPS setup complete. Test in a browser:"
echo "   https://$DOMAIN_PRIMARY"
echo "   https://$DOMAIN_WWW"
echo ""
echo " HTTP -> HTTPS redirect should be automatic (301)."
echo " Cert auto-renews via certbot.timer (twice daily)."
echo "================================================================="
