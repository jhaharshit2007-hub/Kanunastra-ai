# Kanunastra AI Assistant (Gemini)

A chat assistant for your Kanunastra site, powered by **Google Gemini**. It answers using the 56 helplines/portals already on your site (extracted into `data/helplines.json`), so it recommends real numbers instead of inventing them.

Your API key lives only on the server (`.env`), never in the browser.

## Folder layout

```
kanunastra-ai/
├── server.js            ← backend: talks to Gemini (zero dependencies)
├── .env.example         ← copy to .env and add your key
├── package.json
├── data/helplines.json  ← your directory data (edit this to update what the AI knows)
└── public/
    ├── chat-widget.js   ← the chat bubble you add to your site
    └── index.html       ← local test page
```

> **Full site included:** `public/index.html` + `public/assets/` are a copy of the Kanunastra site with the assistant already wired in, so deploying this folder gives you the whole site plus chat at one address. `public/test.html` is a bare test page.

## 1. Run it locally (2 minutes)

You need **Node.js 18 or newer** (`node -v` to check). No `npm install` needed.

1. Open the folder in VS Code.
2. Get a free key at https://aistudio.google.com/apikey
3. Copy `.env.example` to a new file named `.env`, then paste your key:
   ```
   GEMINI_API_KEY=your-key-here
   ```
4. In the VS Code terminal: `npm start`
5. Open http://localhost:3000 and click the chat bubble.

If a request fails with a model error, check Google AI Studio for the current model name and set `GEMINI_MODEL` in `.env`.

## 2. Add it to your real site

Add this one line before `</body>` in your site's `index.html`:

```html
<script src="https://YOUR-SERVER-URL/chat-widget.js" data-api="https://YOUR-SERVER-URL/api/chat" defer></script>
```

Replace `YOUR-SERVER-URL` with where this server is running. Your Bolt site is a static page, so this server must be hosted somewhere public over **https** (for example Render, Railway or Fly.io; deploy this folder, set the same variables from `.env` in their dashboard, and start command `npm start`). `localhost` only works while you test on your own computer.

Also:
- Set `ALLOWED_ORIGINS=https://government-helpline-8obu.bolt.host` (your real site address) so other websites can't use your key.
- The old "Chat with AI Agent" bubble on your site is a separate Text/LiveChat widget. It sits in the same corner, so remove it if you want only this assistant.

Optional script attributes: `data-title="My Title"`, `data-color="#0f766e"`, `data-greeting="Custom first message"`.

## 3. Customize

| What | Where |
|---|---|
| Add/edit helplines the AI knows | `data/helplines.json`, then restart the server |
| AI behaviour, tone, safety rules | `SYSTEM_PROMPT` in `server.js` |
| Colors, size, suggested questions | top of `public/chat-widget.js` |
| Messages per minute per visitor | `RATE_LIMIT_PER_MIN` in `.env` |

## Notes

- **Never commit `.env`** (it's already in `.gitignore`). If your key leaks, delete it in Google AI Studio and make a new one.
- Free-tier Gemini limits apply and may use your chats to improve Google products; check Google's current terms before using it with a public audience.
- The assistant is told to give information, not legal advice, and to lead with 112 / 181 / 1098 / 1930 in emergencies. AI can still make mistakes, so keep the on-screen disclaimer.
