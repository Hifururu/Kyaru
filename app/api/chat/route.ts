// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MEMORY_API_BASE = process.env.MEMORY_API_BASE || ''; // https://script.google.com/macros/s/AKfy.../exec
const KYARU_SYSTEM = (process.env.KYARU_SYSTEM_PROMPT || 'Eres Kyaru, una IA cercana...')
  + '\n\nRegla extra: aplica de forma persistente cualquier preferencia que el usuario haya indicado explícitamente en turnos anteriores (p. ej., tono más cercano, saludos tipo “hey [nombre]”). Evita repetir “hola” en cada turno; usa variaciones naturales.';

// ---------- Helpers memoria ----------
async function memoryLog(payload: any) {
  if (!MEMORY_API_BASE) return;
  try {
    await fetch(`${MEMORY_API_BASE}?op=log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* no-op */ }
}

async function memoryThread(sessionId: string, limit = 12): Promise<{who:'user'|'assistant'; text:string}[]> {
  if (!MEMORY_API_BASE) return [];
  try {
    const url = `${MEMORY_API_BASE}?op=thread&sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    // Esperado: [{who:'user'|'assistant', text:'...'}, ...]
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function deriveStylePreference(history: {who:'user'|'assistant'; text:string}[]) {
  const blob = history.map(h => h.text.toLowerCase()).join('\n');
  const wantsCasual =
    blob.includes('de ahora en adelante') ||
    blob.includes('saludame') || blob.includes('salúdame') ||
    blob.includes('más cercana') || blob.includes('mas cercana') ||
    blob.includes('saludo') && blob.includes('amig');
  return wantsCasual
    ? 'El usuario pidió saludos cercanos/casuales (por ejemplo “hey Feedu, ¿cómo estás?”) y evitar repetir “hola” en cada turno. Mantén un tono cálido, natural y variado.'
    : '';
}

// ---------- Handler ----------
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const sessionId = String(body?.sessionId || '');
  const text = String(body?.text || '');
  const channel = String(body?.channel || 'web');

  // Guarda el turno del usuario
  await memoryLog({ ts: Date.now(), sessionId, channel, who: 'user', text });

  // Carga últimos turnos para dar continuidad/tono
  const recent = sessionId ? await memoryThread(sessionId, 12) : [];

  // Mapea historial a formateo de OpenAI
  const chatHistory = recent.map(m => ({
    role: m.who === 'assistant' ? 'assistant' : 'user',
    content: m.text,
  }));

  // Refuerzo de preferencia de estilo
  const styleHint = deriveStylePreference(recent);
  const systemContent = styleHint ? `${KYARU_SYSTEM}\n\nPreferencia del usuario detectada: ${styleHint}` : KYARU_SYSTEM;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...chatHistory,
    { role: 'user', content: text },
  ];

  let replyText = '...';
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.8,
      presence_penalty: 0.3,
    });
    replyText = completion.choices[0]?.message?.content?.trim() || '...';
  } catch (e: any) {
    console.error('OpenAI error:', e?.response?.data || e?.message);
    replyText = 'No pude conectar al modelo de OpenAI. Tu mensaje quedó guardado en la memoria.';
  }

  // Guarda respuesta del asistente
  await memoryLog({ ts: Date.now(), sessionId, channel, who: 'assistant', text: replyText });

  return NextResponse.json({ text: replyText, meta: { mood: 'neutral' } });
}
