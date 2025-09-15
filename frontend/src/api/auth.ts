export interface LoginResult {
  token: string;
  role: string;
  username: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data: LoginResult = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('username', data.username);
  return data;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
