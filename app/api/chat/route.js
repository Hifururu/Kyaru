// app/api/chat/route.js
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // obligatorio en Cloudflare Pages

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // o el que uses
const MEMORY_API_BASE = process.env.MEMORY_API_BASE || '';
const KYARU_SYSTEM =
  (process.env.KYARU_SYSTEM_PROMPT || 'Eres Kyaru, una IA cercana...') +
  '\n\nRegla extra: aplica de forma persistente cualquier preferencia que el usuario haya indicado. Evita repetir “hola” en cada turno.';

async function memoryLog(payload) {
  if (!MEMORY_API_BASE) return;
  try {
    await fetch(`${MEMORY_API_BASE}?op=log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

async function memoryThread(sessionId, limit = 12) {
  if (!MEMORY_API_BASE) return [];
  try {
    const url = `${MEMORY_API_BASE}?op=thread&sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function deriveStylePreference(history) {
  const blob = history.map(h => (h.text || '').toLowerCase()).join('\n');
  const wantsCasual =
    blob.includes('de ahora en adelante') ||
    blob.includes('saludame') || blob.includes('salúdame') ||
    blob.includes('más cercana') || blob.includes('mas cercana') ||
    (blob.includes('saludo') && blob.includes('amig'));
  return wantsCasual
    ? 'El usuario pidió saludos cercanos/casuales (por ejemplo “hey Feedu, ¿cómo estás?”) y evitar repetir “hola” en cada turno. Mantén un tono cálido, natural y variado.'
    : '';
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}

  const sessionId = String(body.sessionId || '');
  const text = String(body.text || '');
  const channel = String(body.channel || 'web');

  await memoryLog({ ts: Date.now(), sessionId, channel, who: 'user', text });

  const recent = sessionId ? await memoryThread(sessionId, 12) : [];
  const chatHistory = recent.map(m => ({
    role: m.who === 'assistant' ? 'assistant' : 'user',
    content: m.text || '',
  }));

  const styleHint = deriveStylePreference(recent);
  const systemContent = styleHint ? `${KYARU_SYSTEM}\n\nPreferencia del usuario detectada: ${styleHint}` : KYARU_SYSTEM;

  const messages = [
    { role: 'system', content: systemContent },
    ...chatHistory,
    { role: 'user', content: text },
  ];

  let replyText = '...';
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.8,
        presence_penalty: 0.3,
      }),
    });
    if (!r.ok) {
      replyText = 'No pude conectar al modelo de OpenAI.';
    } else {
      const data = await r.json();
      replyText = (data?.choices?.[0]?.message?.content || '...').trim();
    }
  } catch {
    replyText = 'No pude conectar al modelo de OpenAI. Tu mensaje quedó guardado en la memoria.';
  }

  await memoryLog({ ts: Date.now(), sessionId, channel, who: 'assistant', text: replyText });

  return NextResponse.json({ text: replyText, meta: { mood: 'neutral' } });
}
