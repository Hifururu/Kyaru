'use client';
import { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import avatarData from '@/public/avatar.json';

export default function Page() {
  /** =============== SESSION ID PERSISTENTE =============== */
  const [sessionId, setSessionId] = useState<string>('');
  useEffect(() => {
    const key = 'kyaru_session_id';
    // Permite forzar por query param ?session=xxx (útil para pruebas)
    const url = new URL(window.location.href);
    const forced = url.searchParams.get('session');

    if (forced) {
      localStorage.setItem(key, forced);
      setSessionId(forced);
      return;
    }

    let s = localStorage.getItem(key);
    if (!s) {
      // id corto y estable tipo web:abc123
      const short = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
      s = `web:${short}`;
      localStorage.setItem(key, s);
    }
    setSessionId(s);
  }, []);

  /** =============== UI / ESTADO =============== */
  const [input, setInput] = useState('Hola, ¿qué tal?');
  const [history, setHistory] = useState<{ who: 'user' | 'assistant'; text: string }[]>([]);
  const [mood, setMood] = useState<'neutral' | 'happy' | 'thinking' | 'alert'>('neutral');
  const [sending, setSending] = useState(false);
  const speakingRef = useRef(false);

  function speak(text: string) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-CL';
      u.rate = 1;
      u.pitch = 1.05;
      speakingRef.current = true;
      u.onend = () => (speakingRef.current = false);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  async function send() {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    setHistory(h => [...h, { who: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text, channel: 'web' }),
      });
      const data = await res.json();
      const reply = data?.text || '...';
      setHistory(h => [...h, { who: 'assistant', text: reply }]);
      setMood(data?.meta?.mood || 'neutral');
      speak(reply);
    } catch (e) {
      setHistory(h => [...h, { who: 'assistant', text: 'Uy, algo falló. ¿Probamos de nuevo?' }]);
    } finally {
      setSending(false);
    }
  }

  const disabled = !sessionId || sending;

  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',background:'linear-gradient(#f8fafc,#eef2f7)'}}>
      <div style={{width:'100%',maxWidth:960,display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <div style={{background:'#fff',borderRadius:16,boxShadow:'0 6px 24px rgba(0,0,0,.06)',padding:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Lottie animationData={avatarData} loop autoplay style={{ width: 360, height: 360 }} />
        </div>
        <div style={{background:'#fff',borderRadius:16,boxShadow:'0 6px 24px rgba(0,0,0,.06)',padding:16,display:'flex',flexDirection:'column'}}>
          <div style={{fontSize:12,color:'#475569',marginBottom:8}}>
            Estado: <b>{mood}</b> · sesión <code>{sessionId || '...'}</code>
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <input
              style={{flex:1,border:'1px solid #e2e8f0',borderRadius:12,padding:'10px 12px'}}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && send()}
              placeholder="Escribe aquí..."
              disabled={disabled}
            />
            <button
              style={{padding:'10px 14px',borderRadius:12,background: disabled ? '#9ca3af' : '#111827',color:'#fff'}}
              onClick={send}
              disabled={disabled}
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'60vh',overflow:'auto'}}>
            {history.map((m, i) => (
              <div key={i} style={{padding:10,borderRadius:12,background:m.who==='user'?'#f1f5f9':'#ecfdf5'}}>
                <div style={{fontSize:10,letterSpacing:1,textTransform:'uppercase',color:'#64748b'}}>{m.who}</div>
                <div style={{color:'#0f172a',whiteSpace:'pre-wrap'}}>{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
