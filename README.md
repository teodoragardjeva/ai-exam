# AI Exam

Скелет за изпита: Next.js (standalone) + PostgreSQL + частен n8n, публикуван като образ в GHCR и пуснат през Portainer зад Nginx Proxy Manager и Cloudflare. Темата на сайта още не е известна: формата за контакт и чатът са примери, които се заменят.

## Какво има

| Път | За какво е |
|---|---|
| `src/app/api/health` | `GET /api/health`: проверка на app и базата (ползва се от Docker healthcheck) |
| `src/app/api/contact` | Примерна форма: Turnstile → валидация → запис в Postgres |
| `src/app/api/chat` | Препраща съобщение към n8n webhook `chat` по вътрешната мрежа |
| `src/lib/migrations.ts` | SQL миграции. Пускат се автоматично при старт на сървъра (`src/instrumentation.ts`) |
| `src/lib/migrate.ts` | Миграциите и ограничената роля `n8n` (само своя схема `n8n`) |
| `Dockerfile` | Multi-stage образ, non-root, healthcheck |
| `.github/workflows/ci.yml` | PR и push към `main`: lint, typecheck, тестове, build, Docker build. На `main` публикува `latest` и пълния sha |
| `.github/workflows/release.yml` | Ръчно (Run workflow с версия) или таг `vX.Y.Z`: проверка за semver, образ `X.Y.Z`, `X.Y`, `latest` и GitHub Release |
| `deploy/docker-compose.yml` | Стекът за Portainer: `app`, `db`, `n8n` |
| `deploy/stack.env.example` | Променливите за Portainer |
| `deploy/nginx-proxy-manager/` | NPM (портове 80, 443, 81) в мрежата `proxy` |
| `deploy/portainer/` | Portainer CE на 9443 |
| `deploy/server-setup.sh` | Фаза B: update, swap, Docker, мрежа `proxy`, SSH само с ключ |
| `n8n/` | n8n образ (`ai-exam-n8n`): при старт внася и публикува `n8n/workflows/*.json`. Виж `n8n/README.md` |
| `n8n/workflows/chat-echo.json` | Webhook `chat` с Header Auth (credential `Bot secret`), връща `{ reply }` |

## Локално

```bash
npm ci
npm run dev:env        # веднъж: .env.local със случайни тайни (не влиза в git)
npm run dev:services   # Postgres (localhost:5432) и n8n (localhost:5678) в Docker
npm run dev            # http://localhost:3000, при старт създава таблиците и ролята n8n
npm run lint
npm run typecheck
npm test
```

## Еднократни настройки в GitHub

1. **Settings → Actions → General → Workflow permissions:** Read and write.
2. **Settings → Branches:** защита на `main`, задължителни проверки `Lint, typecheck, test, build` и `Docker image`.
3. След първия образ: **Packages → ai-exam → Package settings**, свържи пакета с хранилището. Пакетът е частен, затова Portainer ползва PAT с `read:packages`.
4. **Settings → Secrets and variables → Actions → Variables:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (фаза H). Вгражда се при build, затова смяната му иска нов образ.

## Release

Версията задължително е semver: `MAJOR.MINOR.PATCH`, напр. `1.2.3`, или pre-release `1.3.0-rc.1`. Всичко друго (`1.2`, `1.2.x`, `01.2.3`, `1.2.3+build`) спира release-а, преди да се публикува нещо.

**Ръчно (препоръчително):** Actions → Release → Run workflow → клон `main` → версия `1.2.3` (`v` отпред не е задължително). Workflow-ът проверява версията, че тагът не съществува, пуска проверките, създава тага `v1.2.3` и прави release.

**С таг от терминала:**

```bash
git tag v1.2.3
git push origin v1.2.3
```

Резултат: образи `1.2.3`, `1.2` и `latest` в GHCR и GitHub Release с бележки. Pre-release (`1.3.0-rc.1`) получава само своя таг, не става `latest` и е маркиран като pre-release.

## Сървърът (накратко)

```bash
bash deploy/server-setup.sh                      # фаза B (включва 2 GB swap)
cd /opt/portainer && docker compose up -d         # фаза C, после веднага https://<IP>:9443
cd /opt/nginx-proxy-manager && docker compose up -d   # фаза D, http://<IP>:81
```

**Swap:** droplet-ите идват без swap, а 2 GB RAM е тясно за n8n + Postgres + Next.js + NPM. Без swap при пик (старт на n8n, pull на образ) Linux убива контейнер (OOM) и сайтът връща 502. `server-setup.sh` го добавя. Ако сървърът е настроен без скрипта:

```bash
swapon --show            # празно = няма swap
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf && sysctl -p /etc/sysctl.d/99-swappiness.conf
free -h                  # ред Swap: 2.0Gi
```

Ако `free -h` постоянно показва стотици MB в swap, сървърът е малък: Resize до 4 GB.

Стекът: Portainer → Stacks → Add stack → съдържанието на `deploy/docker-compose.yml` и променливите от `deploy/stack.env.example`. Тайните се генерират с `openssl rand -hex 32` (hex, защото паролата на базата влиза в URL).

NPM proxy host: домейн → името на app контейнера от `docker ps` (напр. `ai-exam-stack-app-1`, зависи от името на стека), порт `3000`, `http`, сертификат, Force SSL. Без Force SSL (или Cloudflare **Always Use HTTPS**) сайтът се отваря и по `http://`.

## n8n

- n8n няма публикуван порт. Редакторът се отваря през SSH тунел до IP-то на контейнера:
  ```bash
  # на сървъра
  docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' $(docker ps -qf name=n8n)
  # на твоя компютър
  ssh -N -L 15678:<IP на контейнера>:5678 root@<IP на droplet-а>
  ```
  После `http://localhost:15678`. В PuTTY: Connection → SSH → Tunnels, Source port `15678`, Destination `<IP на контейнера>:5678`.
- **Портът на тунела е 15678, не 5678:** на 5678 е локалният n8n от `npm run dev:services`. Ако тунелът е на 5678, `localhost:5678` отваря локалния n8n и credential-ите отиват там, а не на сървъра.
  - `http://localhost:15678` → n8n на **сървъра**
  - `http://localhost:5678` → **локалният** n8n
- n8n пази данните си в схемата `n8n` с роля `n8n`. Ролята се създава от app при старт, затова n8n тръгва след като app е healthy.
- Workflow-ите идват от git: образът `ai-exam-n8n` ги внася и публикува при всеки старт. На сървъра създаваш само credential-ите, веднъж, с имената от workflow-ите (напр. **Header Auth** `Bot secret`: name `x-bot-secret`, value `BOT_SECRET`), и рестартираш n8n. Подробно: `n8n/README.md`.
- Ако workflow трябва да чете таблици на сайта, дай права в нова миграция, напр. `GRANT SELECT ON contact_messages TO n8n;`.

## Капани (открити при локалния тест на стека)

- **n8n виси на „Initializing n8n process“ без грешка:** ролята `n8n` няма `CREATE` върху базата. n8n пуска `CREATE SCHEMA IF NOT EXISTS` при всеки старт, а Postgres иска това право дори схемата да съществува. Грешката се вижда само в лога на `db`. App вече дава правото (`src/lib/migrate.ts`).
- **n8n 2.x иска Postgres 17+.** На 16 пише предупреждение. Стекът е на `postgres:17-alpine`. Не сменяй версията върху вече създаден том: базата няма да тръгне.
- **Import през CLI** (`n8n import:workflow` + `n8n publish:workflow`) се прилага след рестарт на n8n. През UI (Import + Publish) работи веднага.
- **Chat `502 chat_unavailable`:** workflow-ът не е публикуван, webhook-ът не е `chat`, или credential-ът няма същия `BOT_SECRET`. Без верен `x-bot-secret` n8n връща 403.

## На изпита

1. Нови таблици: добави миграция `002_...` в `src/lib/migrations.ts`. Не променяй вече пуснати миграции.
2. Замени `src/app/page.tsx`, формата и `api/contact` според темата.
3. Ако няма чат, махни `ChatBox` и `api/chat`. n8n може да остане за друг workflow.
