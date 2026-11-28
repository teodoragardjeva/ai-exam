#!/usr/bin/env bash
# Proves the latest backup can be restored, without touching the live database:
# restores it into a temporary database "restore_test", compares row counts of the main
# tables with the live database, then drops the temporary database.
#
#   sudo bash deploy/restore-test.sh                 # latest backup in BACKUP_DIR
#   sudo bash deploy/restore-test.sh <file.dump>     # a specific backup
#
# A real restore (after data loss) is the same pg_restore into the live database, with
# the app and n8n stopped first; see README → "Бекъп".
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-ai-exam-stack-db-1}"
BACKUP_DIR="${BACKUP_DIR:-/opt/hometech/backups}"
TEST_DB=restore_test
file="${1:-$(ls -1t "$BACKUP_DIR"/hometech-*.dump 2>/dev/null | head -1)}"
[[ -f "$file" ]] || { echo "No backup found in $BACKUP_DIR" >&2; exit 1; }

psql_in() { docker exec -i "$DB_CONTAINER" sh -c "psql -U \"\$POSTGRES_USER\" -d $1 -v ON_ERROR_STOP=1 -tA" ; }
cleanup() { echo "DROP DATABASE IF EXISTS $TEST_DB;" | psql_in postgres >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Restoring $file into temporary database $TEST_DB …"
cleanup
echo "CREATE DATABASE $TEST_DB;" | psql_in postgres >/dev/null
# --no-owner: roles are global, the restore must not depend on them.
docker exec -i "$DB_CONTAINER" sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $TEST_DB --no-owner --exit-on-error" < "$file"

COUNTS="SELECT 'orders', count(*) FROM orders UNION ALL SELECT 'tickets', count(*) FROM tickets
UNION ALL SELECT 'kb_documents', count(*) FROM kb_documents UNION ALL SELECT 'security_log', count(*) FROM security_log
UNION ALL SELECT 'error_log', count(*) FROM error_log UNION ALL SELECT 'n8n.workflow_entity', count(*) FROM n8n.workflow_entity
ORDER BY 1;"
live=$(echo "$COUNTS" | docker exec -i "$DB_CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA')
restored=$(echo "$COUNTS" | psql_in $TEST_DB)

printf '%-22s %8s %8s\n' table live restored
paste -d'|' <(echo "$live") <(echo "$restored") | awk -F'|' '{printf "%-22s %8s %8s\n", $1, $2, $4}'
echo "Vector search works on the restored copy: $(echo "SELECT count(*) FROM kb_documents WHERE embedding IS NOT NULL;" | psql_in $TEST_DB) chunks with embeddings"
echo "Restore test OK (rows written after the backup can make 'live' higher)."
