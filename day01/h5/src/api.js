const BASE = import.meta.env.VITE_API_BASE || '/api';
const clientId = localStorage.getItem('zufang-client-id') || crypto.randomUUID();
localStorage.setItem('zufang-client-id', clientId);

export async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientId, ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || '请求失败');
  return data;
}

export { clientId };
