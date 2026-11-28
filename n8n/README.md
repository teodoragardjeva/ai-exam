# n8n workflow-и от git

Workflow-ите в `n8n/workflows/*.json` се **генерират** от `n8n/src/build.mjs` (`npm run n8n:build`) и се вграждат в образа `ghcr.io/teodoragardjeva/ai-exam-n8n`. При всеки старт `autoload.sh` ги внася (обновява ги по фиксираното `id`) и ги публикува на два прохода (под-workflow-ите първо), после пуска n8n. Credentials **не са в git**: в JSON-а има само имената им.

| Файл | id | Тригер |
|---|---|---|
| `wf1-kb-load.json` | `hometechKbLoad01` | ръчно: `n8n execute --id=hometechKbLoad01` |
| `wf2-intake-triage.json` | `hometechIntake01` | webhook `ticket-intake` (Header Auth) |
| `wf3-approval-reply.json` | `hometechApprov01` | Execute Workflow от WF-2 |
| `wf4-send-reply.json` | `hometechSendRp01` | webhook `send-reply` (Header Auth) |
| `wfe-errors.json` | `hometechErrors01` | Error Trigger (Error Workflow на всички останали) |

## Credentials (веднъж, на сървъра и локално)

Отвори редактора: на сървъра `https://n8n.robodigit.win` (Cloudflare WAF пуска само твоето IP), локално `http://localhost:5678`. Създай ги с **точно тези имена**: при import n8n ги свързва по име.

| Име | Тип | Стойност |
|---|---|---|
| `Bot secret` | Header Auth | Name `x-bot-secret`, Value = `BOT_SECRET` |
| `OpenAI` | OpenAI | API ключ |
| `Postgres app` | Postgres | Host `db`, Port `5432`, Database `app`, User `n8n_app`, Password = `N8N_APP_DB_PASSWORD`, SSL disable |
| `Postgres readonly` | Postgres | Същото с User `n8n_readonly`, Password = `N8N_READONLY_DB_PASSWORD` |
| `Gmail account` | Gmail OAuth2 | Sign in with Google (redirect: `https://n8n.robodigit.win/rest/oauth2-credential/callback`) |

После рестартирай n8n и провери лога:

```bash
sudo docker logs ai-exam-stack-n8n-1 2>&1 | grep autoload
```

Очаквано: `published` за WF-2, WF-3, WF-4 и WF-E; WF-1 е „only a manual trigger“. Ако нещо не се публикува, под реда стои причината от n8n (най-често credential с друго име).

## Промяна на workflow

1. Промени `n8n/src/build.mjs` (правилата са Switch нодът „Бизнес правила“ в WF-2; `rules.cjs` е тяхната спецификация с тестове) или `handbook.cjs`, после `npm run n8n:build`. Правилата имат unit тестове: `npm test`.
2. Локално: `npm run dev:services -- --build n8n` и `npm run scenarios`.
3. Commit → PR → merge. CI (`npm run check:n8n`) спира, ако JSON-ът не съвпада с генератора или някой workflow няма уникално 16-символно `id`.
4. Portainer → стека → Pull and redeploy с re-pull.

## Важно

- **Git е източникът на истината.** Промени през UI по тези workflow-и се губят при следващ рестарт.
- Workflow-и, създадени само в UI (без файл тук), не се пипат.
- `N8N_AUTOLOAD_WORKFLOWS=false` в стека изключва автоматичния import.
- `n8n execute` в работещ контейнер иска друг порт за task runner-а: `-e N8N_RUNNERS_BROKER_PORT=5690`.
