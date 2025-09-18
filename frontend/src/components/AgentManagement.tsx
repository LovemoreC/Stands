import React, { useEffect, useMemo, useState } from 'react';
import {
  AGENT_ROLES,
  Agent,
  AgentCreate,
  AgentRole,
  createAgent,
  listAgents,
} from '../api/agents';

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

const AgentManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AgentFormState>(defaultFormState);
  const [creating, setCreating] = useState(false);

  const role = useMemo(() => localStorage.getItem('role'), []);

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAgents()
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
  }, [role]);

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
    setCreating(true);
    setError(null);
    try {
      const payload: AgentCreate = {
        username: form.username,
        password: form.password,
        role: form.role,
      };
      const created = await createAgent(payload);
      setAgents((prev) => {
        const filtered = prev.filter((agent) => agent.username !== created.username);
        return [...filtered, created].sort((a, b) => a.username.localeCompare(b.username));
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
    <div>
      <section>
        <h3>Create Agent</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              Username
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                disabled={creating}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                disabled={creating}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Role
              <select
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
          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create Agent'}
          </button>
        </form>
      </section>
      <section>
        <h3>Existing Agents</h3>
        {loading && <p>Loading agents…</p>}
        {error && <p>{error}</p>}
        {!loading && !agents.length && !error && <p>No agents found.</p>}
        {agents.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
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
        )}
      </section>
    </div>
  );
};

export default AgentManagement;
