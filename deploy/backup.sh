#!/usr/bin/env bash
# Backup of the HomeTech database (app tables, knowledge base, chat memory and n8n's own data,
# which lives in the same database in schema "n8n"). Custom format, compressed.
#
#   sudo bash deploy/backup.sh                      # one backup now
#   sudo crontab -e  →  15 3 * * * /opt/hometech/backup.sh >> /var/log/hometech-backup.log 2>&1
#
# Env (optional): DB_CONTAINER (default ai-exam-stack-db-1), BACKUP_DIR (default
# /opt/hometech/backups), KEEP_DAYS (default 7). Test the restore with deploy/restore-test.sh.
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-ai-exam-stack-db-1}"
BACKUP_DIR="${BACKUP_DIR:-/opt/hometech/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || echo "warning: could not chmod 700 $BACKUP_DIR" >&2
file="$BACKUP_DIR/hometech-$(date -u +%Y%m%d-%H%M%S).dump"

# pg_dump runs inside the db container (local socket, no password needed there);
# the dump never leaves the server.
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6' > "$file.partial"
mv "$file.partial" "$file"
chmod 600 "$file" 2>/dev/null || echo "warning: could not chmod 600 $file" >&2

# A dump that pg_restore can't read is not a backup.
docker exec -i "$DB_CONTAINER" pg_restore --list < "$file" > /dev/null

find "$BACKUP_DIR" -name 'hometech-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) backup ok: $file ($(du -h "$file" | cut -f1))"
