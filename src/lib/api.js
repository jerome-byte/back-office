import { supabase } from './supabase';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Appel à l'API NestJS avec le jeton de la session Supabase.
 * Lève une Error avec le message renvoyé par le serveur (en français).
 */
export async function api(chemin, { method = 'GET', body, timeout = 60000 } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(`${API_URL}${chemin}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(
      e.name === 'AbortError'
        ? "Le serveur met trop de temps à répondre (il est peut-être en train de démarrer). Réessayez."
        : "Impossible de joindre l'API. Vérifiez votre connexion.",
      { cause: e },
    );
  } finally {
    clearTimeout(t);
  }
  const texte = await res.text();
  let json;
  try { json = texte ? JSON.parse(texte) : null; } catch { json = texte; }
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : json?.message;
    throw new Error(msg || `Erreur ${res.status}`);
  }
  // Prévient les écrans ouverts qu'une donnée a changé (en plus du temps réel Supabase)
  if (method !== 'GET') window.dispatchEvent(new Event('donnees-modifiees'));
  return json;
}

export const get = (c) => api(c);
export const post = (c, body) => api(c, { method: 'POST', body });
export const patch = (c, body) => api(c, { method: 'PATCH', body });
export const put = (c, body) => api(c, { method: 'PUT', body });
export const del = (c) => api(c, { method: 'DELETE' });

/** Réveille l'API (hébergement gratuit Render = mise en veille). */
export function reveillerApi() {
  fetch(`${API_URL}/`).catch(() => {});
}
