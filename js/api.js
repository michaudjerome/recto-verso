// Appels au serveur de Recto Verso (même adresse que l'app). Le cookie de session est géré par le navigateur.
export class ApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

export async function api(action, body, { keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(`api/index.php?r=${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? { 'X-RV': '1' } : { 'Content-Type': 'application/json', 'X-RV': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive,
    });
  } catch { throw new ApiError('offline', 0); }
  let data = null;
  try { data = await res.json(); } catch { /* réponse vide ou HTML */ }
  if (!res.ok) throw new ApiError(data?.error || (res.status === 404 ? 'no_server' : 'server'), res.status);
  if (!data) throw new ApiError('no_server', res.status);
  return data;
}
