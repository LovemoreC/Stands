import React from 'react';
import { useAuth } from '../auth';
import {
  listMandates,
  createMandate,
  updateMandate,
  getMandateHistory,
} from '../api';

interface Mandate {
  id: number;
  project_id: number;
  agent: string;
  status: string;
}

const Mandates: React.FC = () => {
  const { auth } = useAuth();
  const [mandates, setMandates] = React.useState<Mandate[]>([]);
  const [form, setForm] = React.useState({ id: '', project_id: '', agent: '' });
  const [statusInputs, setStatusInputs] = React.useState<Record<number, string>>({});
  const [history, setHistory] = React.useState<Record<number, { timestamp: string; status: string }[]>>({});

  React.useEffect(() => {
    if (auth) {
      listMandates(auth.token).then(setMandates).catch(console.error);
    }
  }, [auth]);

  const submit = async () => {
    if (!auth) return;
    try {
      const m = await createMandate(auth.token, {
        id: Number(form.id),
        project_id: Number(form.project_id),
        agent: form.agent,
        status: 'pending',
      });
      setMandates([...mandates, m]);
      setForm({ id: '', project_id: '', agent: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const update = async (id: number) => {
    if (!auth) return;
    const m = mandates.find(x => x.id === id);
    const status = statusInputs[id];
    if (!m || !status) return;
    try {
      const updated = await updateMandate(auth.token, id, { ...m, status });
      setMandates(mandates.map(x => (x.id === id ? updated : x)));
      setStatusInputs({ ...statusInputs, [id]: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistory = async (id: number) => {
    if (!auth) return;
    try {
      const h = await getMandateHistory(auth.token, id);
      setHistory({ ...history, [id]: h });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Mandates</h2>
      <div>
        <input
          placeholder="ID"
          value={form.id}
          onChange={e => setForm({ ...form, id: e.target.value })}
        />
        <input
          placeholder="Project ID"
          value={form.project_id}
          onChange={e => setForm({ ...form, project_id: e.target.value })}
        />
        <input
          placeholder="Agent"
          value={form.agent}
          onChange={e => setForm({ ...form, agent: e.target.value })}
        />
        <button
          onClick={submit}
          disabled={!form.id || !form.project_id || !form.agent}
        >
          Create
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Project</th>
            <th>Agent</th>
            <th>Status</th>
            <th>Update</th>
            <th>History</th>
          </tr>
        </thead>
        <tbody>
          {mandates.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.project_id}</td>
              <td>{m.agent}</td>
              <td>{m.status}</td>
              <td>
                <input
                  placeholder="Status"
                  value={statusInputs[m.id] || ''}
                  onChange={e =>
                    setStatusInputs({ ...statusInputs, [m.id]: e.target.value })
                  }
                />
                <button onClick={() => update(m.id)} disabled={!statusInputs[m.id]}>
                  Update
                </button>
              </td>
              <td>
                <button onClick={() => loadHistory(m.id)}>Load</button>
                {history[m.id] && (
                  <ul>
                    {history[m.id].map((h, i) => (
                      <li key={i}>
                        {new Date(h.timestamp).toLocaleString()} - {h.status}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Mandates;
