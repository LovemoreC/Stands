import React from 'react';
import { useAuth } from '../auth';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await loginRequest({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username);
      login(data.token, data.role, data.username);
      if (data.role === 'agent') {
        navigate('/dashboard');
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <section className="form-section">
      <form className="form-card" onSubmit={submit}>
        <h2 className="form-title">Login</h2>
        <div className="form-fields">
          <label htmlFor="login-username">
            Username
            <input
              id="login-username"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>
          <label htmlFor="login-password">
            Password
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
        <div className="form-actions">
          <button type="submit">Login</button>
        </div>
      </form>
    </section>
  );
};

export default Login;
