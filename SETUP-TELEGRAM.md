# Use AnimalResearchNetworkClaw from Your Phone (Telegram)

## 1. Create a Telegram bot (on your phone)

1. Open **Telegram** on your phone.
2. Search for **@BotFather** and start a chat.
3. Send: **/newbot**
4. When asked, choose a **name** (e.g. "AnimalResearch Claw").
5. Choose a **username** that ends in `bot` (e.g. `AnimalResearchClaw_bot`).
6. BotFather will reply with a **token** like `123456789:ABCdefGHI...`
7. **Copy that token** and keep it safe.

## 2. Add the token to OpenClaw (on your PC)

**Option A – Recommended (interactive)**  
In a terminal on your PC run:

```bash
openclaw configure --section channels
```

When prompted, choose Telegram and paste your bot token.

**Option B – Manual**  
1. Open your OpenClaw config file (e.g. `%USERPROFILE%\.openclaw\openclaw.json` on Windows) in an editor.
2. Find `"channels": { "telegram": { "botToken": "" }`.
3. Paste your token between the quotes: `"botToken": "YOUR_TOKEN_HERE"`.
4. Save the file.

## 3. Start the gateway (on your PC)

In a terminal:

```bash
openclaw gateway
```

Leave this window open. The gateway must be running for Telegram to work.

## 4. Link your phone to the bot (pairing)

1. On your phone, open Telegram and search for **your bot** (the username you chose, e.g. `@AnimalResearchClaw_bot`).
2. Tap **Start** or send any message.
3. The bot will reply with a **pairing code** (e.g. `Pairing code: ABC-123`).
4. On your PC, in a **new** terminal (gateway still running in the first), run:

```bash
openclaw pairing list telegram
```

You’ll see the pending code. Then:

```bash
openclaw pairing approve telegram ABC-123
```

(Use the actual code the bot sent.)

5. After approving, go back to Telegram and send another message. The bot (AnimalResearchNetworkClaw) should reply.

## 5. Use it from your phone

Once pairing is done, you can chat with your agent from Telegram anytime. Keep the gateway running on your PC (or run it when you want to use the bot).

---

**Summary**

| Step | Where | What |
|------|--------|------|
| 1 | Phone | @BotFather → /newbot → copy token |
| 2 | PC | `openclaw configure --section channels` and paste token (or edit openclaw.json) |
| 3 | PC | `openclaw gateway` (leave running) |
| 4 | Phone + PC | DM the bot → get code → `openclaw pairing approve telegram CODE` |
| 5 | Phone | Chat with your agent |

Docs: https://docs.molt.bot/channels/telegram
