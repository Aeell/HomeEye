// web/src/lib/net.ts
export function apiBase(): string {
  // 1) explicit env (useful for dev on PC)
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv;

  // 2) same host/port as current page
  const { protocol, hostname } = window.location;
  const port = window.location.port || '8787'; // default our server port
  const base = `${protocol}//${hostname}:${port}`;
  return base;
}

export function wsUrl(): string {
  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs && envWs.trim()) return envWs;

  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const { hostname } = window.location;
  const port = window.location.port || '8787';
  return `${proto}://${hostname}:${port}/ws`;
}
