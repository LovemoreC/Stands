export interface LoginResult {
  token: string;
  role: string;
  username: string;
}

import apiFetch from './client';

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  const data = await apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('username', data.username);
  return data;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}
