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
      # Two passes: a workflow that calls a sub-workflow (WF-2 → WF-3) can only be published
      # after the sub-workflow, whatever the file order. Manual-only workflows (WF-1) are
      # skipped. Missing credentials still leave n8n running; n8n's reason is printed.
      pending="$ids"
      for pass in 1 2; do
        failed=""
        for id in $pending; do
          if out=$(n8n publish:workflow --id="$id" 2>&1); then
            echo "[autoload] published $id"
          elif printf '%s' "$out" | grep -q "has no trigger node"; then
            echo "[autoload] $id has only a manual trigger: run it by hand, nothing to publish"
          else
            failed="$failed $id"
            [ "$pass" = 2 ] && {
              echo "[autoload] could not publish $id:"
              printf '%s\n' "$out" | grep -vE 'license SDK|migration lock|^\s*$' | tail -2 | sed 's/^/[autoload]   /'
            }
          fi
        done
        [ -z "$failed" ] && break
        pending="$failed"
      done
    else
      echo "[autoload] import failed, starting n8n with the workflows it already has"
    fi
  fi
  rm -rf "$WORK"
fi

exec /docker-entrypoint.sh "$@"
