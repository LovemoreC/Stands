import React, { useState } from 'react';
import { login } from '../api/auth';

export function LoginForm({ onLogin }: { onLogin?: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      setError('');
      onLogin?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    }
  };

  return (
    <section className="form-section">
      <form className="form-card" onSubmit={submit}>
        <h2 className="form-title">Sign in</h2>
        <div className="form-fields">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <div className="form-actions">
          <button type="submit">Login</button>
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
      </form>
    </section>
  );
}
