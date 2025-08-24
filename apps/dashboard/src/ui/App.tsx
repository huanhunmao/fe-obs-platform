import React, { useEffect, useMemo, useState } from 'react';

type Evt = any;

export function App() {
  const [events, setEvents] = useState<Evt[]>([]);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8787');
    ws.onopen = () => setStatus('online');
    ws.onclose = () => setStatus('offline');
    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(String(msg.data));
        if (payload.type === 'snapshot') setEvents(payload.data);
        if (payload.type === 'event') setEvents(prev => [...prev, payload.data].slice(-500));
      } catch {}
    };
    return () => ws.close();
  }, []);

  const perf = useMemo(() => ({
    LCP: lastValue(events, 'perf', 'LCP'),
    CLS: lastValue(events, 'perf', 'CLS'),
    FID: lastValue(events, 'perf', 'FID'),
  }), [events]);

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 16, lineHeight: 1.4 }}>
      <h1 style={{ margin: 0 }}>FE Observability</h1>
      <p style={{ marginTop: 4, opacity: .7 }}>WebSocket: <b>{status}</b> • 最近事件：{events.length}</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatCard title="LCP (ms)" value={fmtNum(perf.LCP)} />
        <StatCard title="CLS" value={fmtNum(perf.CLS, 4)} />
        <StatCard title="FID (ms)" value={fmtNum(perf.FID)} />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>实时事件流</h3>
        <div style={{ height: 280, overflow: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
          {[...events].reverse().map((e, i) => (
            <pre key={i} style={{ margin: 0, padding: 8, background: i%2? '#fafafa':'#fff', borderRadius: 6 }}>{JSON.stringify(e, null, 2)}</pre>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: string }){
  return (
    <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
      <div style={{ fontSize: 12, opacity: .7 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function lastValue(events: Evt[], type: string, name: string) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === type && e.name === name) return (e as any).value;
  }
  return NaN;
}

function fmtNum(n: number, digits = 2) {
  if (Number.isNaN(n)) return '-';
  return Number(n).toFixed(digits);
}