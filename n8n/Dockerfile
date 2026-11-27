# n8n with this repo's workflows baked in. On every start the workflows in
# n8n/workflows are imported (updated by their fixed id) and published, then n8n starts.
# Credentials are NOT in git: create them once in the n8n UI on the server, with
# exactly the names the workflows use (see n8n/README.md).
ARG N8N_VERSION=latest
FROM n8nio/n8n:${N8N_VERSION}

COPY --chown=node:node workflows/ /opt/n8n-workflows/
COPY --chmod=0755 autoload.sh /opt/n8n-autoload.sh

ENTRYPOINT ["tini", "--", "/opt/n8n-autoload.sh"]
