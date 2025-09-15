import { getToken } from './auth';

const BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || '';

export default async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(BASE_URL + path, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  if (!response.ok) {
    const message =
      (data && (data.detail || data.message)) ||
      (typeof data === 'string' && data) ||
      'Request failed';
    throw new Error(message);
  }
  return data as T;
}
