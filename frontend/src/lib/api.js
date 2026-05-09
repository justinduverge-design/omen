import { supabase } from './supabase.js';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path, opts = {}) {
  const headers = new Headers(opts.headers || {});

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (_) {
    // Supabase may be intentionally unconfigured in local/static preview.
  }

  let body = opts.body;
  if (
    body
    && typeof body === 'object'
    && !(body instanceof FormData)
    && !(body instanceof URLSearchParams)
    && !(body instanceof Blob)
  ) {
    body = JSON.stringify(body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const res = await fetch(BASE + path, { ...opts, headers, body });
  const contentType = res.headers.get('content-type') || '';
  const parsed = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const message = parsed?.error || `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed;
}
