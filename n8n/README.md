# n8n workflows от git

Workflow-ите в `n8n/workflows/*.json` се вграждат в образа `ghcr.io/teodoragardjeva/ai-exam-n8n`. При всеки старт на контейнера `autoload.sh` ги внася (обновява ги по `id`) и ги публикува, после пуска n8n. Credential-ите **не са в git**: създаваш ги веднъж в n8n на сървъра.

## Credential-и на сървъра (веднъж)

1. Отвори редактора през SSH тунел (виж главния README).
2. **Credentials → Add credential**, с **точно името**, което workflow-ът очаква:

   | Workflow | Credential | Тип | Стойност |
   |---|---|---|---|
   | `chat-echo.json` | `Bot secret` | Header Auth | Name: `x-bot-secret`, Value: `BOT_SECRET` от Portainer |

3. Рестартирай n8n (Portainer → Containers → n8n → Restart). При import n8n свързва credential-а **по име** и workflow-ът се публикува.

Докато credential-ът липсва, в лога има `could not publish ...: create its credentials`. n8n работи, само този workflow не е активен.

## Нов workflow

1. Направи го в n8n (локално: `npm run dev:services`, http://localhost:5678).
2. **⋯ → Download** и запиши JSON-а в `n8n/workflows/<име>.json`.
3. Добави горе фиксирано `"id"` от точно 16 букви/цифри, уникално, напр. `"id": "orderStatusHook1"`. Без него при всеки старт ще се появява нов дубликат. CI (`npm run check:n8n`) спира build-а, ако липсва.
4. Credential-ите в JSON-а остават само като препратка (`id` + `name`), без тайни. На сървъра създай credential със същото `name`.
5. Webhook-ът, който app вика, трябва да е с **Header Auth** (credential `Bot secret`), за да не може никой друг в мрежата да го вика. App вика `http://n8n:5678/webhook/<path>`.
6. Commit → merge в `main` → CI публикува нов `ai-exam-n8n:latest` → Portainer: **Pull and redeploy**.

## Важно

- **Git е източникът на истината.** Промени през UI по тези workflow-и се губят при следващ рестарт. Правиш промяната в UI, после я сваляш в git.
- Workflow-и, създадени само в UI (без файл в git), не се пипат.
- `N8N_AUTOLOAD_WORKFLOWS=false` в Portainer изключва автоматичния import.
- Локално: след промяна на workflow `npm run dev:services -- --build n8n`.
