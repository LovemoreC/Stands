import React from 'react';
import { useAuth } from '../auth';
import { getStands, assignMandate } from '../api';

interface Stand {
  id: number;
  name: string;
  mandate?: { agent: string; status: string };
}

const Mandates: React.FC = () => {
  const { auth } = useAuth();
  const [stands, setStands] = React.useState<Stand[]>([]);
  const [search, setSearch] = React.useState('');
  const [inputs, setInputs] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (auth) {
      getStands(auth.token).then(setStands).catch(console.error);
    }
  }, [auth]);

  const filtered = stands.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const assign = async (standId: number) => {
    if (!auth) return;
    const agent = inputs[standId];
    if (!agent) return;
    try {
      const stand = await assignMandate(auth.token, standId, agent);
      setStands(stands.map(s => (s.id === standId ? stand : s)));
      setInputs({ ...inputs, [standId]: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Mandates</h2>
      <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Mandate</th>
            <th>Assign</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.mandate ? `${s.mandate.agent} (${s.mandate.status})` : '-'}</td>
              <td>
                <input
                  placeholder="Agent"
                  value={inputs[s.id] || ''}
                  onChange={e => setInputs({ ...inputs, [s.id]: e.target.value })}
                />
                <button onClick={() => assign(s.id)} disabled={!inputs[s.id]}>Assign</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Mandates;
