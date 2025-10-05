# Kyaru 2.0 — MVP (Next.js + OpenRouter + Sheets)

## Pasos rápidos
1. Crea el WebApp de memoria en Google Apps Script con `docs/AppsScript_Memory.gs` (Deploy → Web App → Anyone with the link).
2. Copia la URL publicada en `.env.local` como `MEMORY_API_BASE`.
3. En `.env.local` agrega `OPENROUTER_API_KEY` y (opcional) `OPENROUTER_MODEL`.
4. `npm i && npm run dev` y abre http://localhost:3000

## Estructura
- `app/page.tsx` → chat + avatar Lottie + TTS navegador.
- `app/api/chat/route.ts` → gateway que llama a OpenRouter y guarda memoria.
- `lib/memory.ts` → cliente del WebApp de memoria (log + recent).
- `docs/AppsScript_Memory.gs` → script para la memoria en Sheets.
