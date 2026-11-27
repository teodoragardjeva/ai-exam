#!/bin/sh
# Imports the workflows baked into the image, publishes them, then starts n8n.
# Git is the source of truth: a restart overwrites UI edits to these workflows.
# Every workflow file needs a fixed top-level "id" (16 letters/digits): that's how a
# restart updates the same workflow instead of adding a copy. Files without one are skipped.
# Set N8N_AUTOLOAD_WORKFLOWS=false to skip the import.
set -u

SRC=/opt/n8n-workflows
WORK=/tmp/n8n-autoload

workflow_id() {
  node -e 'try { process.stdout.write(String(require(process.argv[1]).id || "")) } catch { }' "$1"
}

if [ "${N8N_AUTOLOAD_WORKFLOWS:-true}" = "true" ] && ls "$SRC"/*.json >/dev/null 2>&1; then
  rm -rf "$WORK" && mkdir -p "$WORK"
  ids=""
  for f in "$SRC"/*.json; do
    id=$(workflow_id "$f")
    if [ -z "$id" ]; then
      echo "[autoload] skipped $(basename "$f"): no top-level \"id\""
      continue
    fi
    cp "$f" "$WORK/"
    ids="$ids $id"
  done

  if [ -n "$ids" ]; then
    echo "[autoload] importing:$ids"
    if n8n import:workflow --separate --input="$WORK"; then
      for id in $ids; do
        # Fails until the workflow's credentials exist; n8n still starts.
        n8n publish:workflow --id="$id" || echo "[autoload] could not publish $id: create its credentials, then restart n8n"
      done
    else
      echo "[autoload] import failed, starting n8n with the workflows it already has"
    fi
  fi
  rm -rf "$WORK"
fi

exec /docker-entrypoint.sh "$@"
