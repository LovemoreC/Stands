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
    <div>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
};

export default Login;
