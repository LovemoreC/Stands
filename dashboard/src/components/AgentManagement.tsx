import React, { useEffect, useState } from 'react';
import {
  AGENT_ROLES,
  Agent,
  AgentCreate,
  AgentRole,
  createAgent,
  listAgents,
} from '../api';
import { useAuth } from '../auth';

interface AgentFormState {
  username: string;
  password: string;
  role: AgentRole;
}

const defaultFormState: AgentFormState = {
  username: '',
  password: '',
  role: 'agent',
};

interface AgentManagementProps {
  className?: string;
}

const AgentManagement: React.FC<AgentManagementProps> = ({ className }) => {
  const { auth } = useAuth();
  const role = auth?.role;
  const token = auth?.token;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AgentFormState>(defaultFormState);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }
    if (!token) {
      setError('You must be logged in to view agents.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAgents(token)
      .then((data) => {
        if (!cancelled) setAgents(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load agents.';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, token]);

  if (role !== 'admin') {
    return <p>You do not have permission to view this page.</p>;
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.username || !form.password) {
      setError('Username and password are required.');
      return;
    }
    if (!auth?.token) {
      setError('You must be logged in to create an agent.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const payload: AgentCreate = {
        username: form.username,
        password: form.password,
        role: form.role,
      };
      const created = await createAgent(auth.token, payload);
      setAgents((prev) => {
        const filtered = prev.filter((agent) => agent.username !== created.username);
        return [...filtered, created].sort((a, b) =>
          a.username.localeCompare(b.username),
        );
      });
      setForm(defaultFormState);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create agent.';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={className}>
      <section className="form-section">
        <form className="form-card" onSubmit={handleSubmit}>
          <h3 className="form-title">Create Agent</h3>
          <div className="form-fields">
            <label htmlFor="agent-username">
              Username
              <input
                id="agent-username"
                name="username"
                value={form.username}
                onChange={handleChange}
                disabled={creating}
                required
              />
            </label>
            <label htmlFor="agent-password">
              Password
              <input
                id="agent-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                disabled={creating}
                required
              />
            </label>
            <label htmlFor="agent-role">
              Role
              <select
                id="agent-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={creating}
              >
                {AGENT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="form-message form-message--error">{error}</p>}
          <div className="form-actions">
            <button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create Agent'}
            </button>
          </div>
        </form>
      </section>
      <section className="form-section">
        <div className="form-card">
          <h3 className="form-title">Existing Agents</h3>
          {loading && <p className="form-message form-message--info">Loading agents…</p>}
          {error && !loading && !agents.length && (
            <p className="form-message form-message--error">{error}</p>
          )}
          {!loading && !agents.length && !error && (
            <p className="form-message">No agents found.</p>
          )}
          {agents.length > 0 && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead className="data-table__header">
                  <tr>
                    <th scope="col">Username</th>
                    <th scope="col">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.username}>
                      <td>{agent.username}</td>
                      <td>{agent.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AgentManagement;

