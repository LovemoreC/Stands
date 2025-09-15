import React from 'react';
import { useAuth } from '../auth';
import {
  useProjectStands,
  createStand as createProjectStand,
  deleteStand as deleteProjectStand,
} from '../../frontend/src/api/projects';

interface Stand {
  id: number;
  project_id: number;
  name: string;
  size: number;
  price: number;
}

const Stands: React.FC = () => {
  const { auth } = useAuth();
  const [projectFilter, setProjectFilter] = React.useState('');
  const { stands, setStands } = useProjectStands(
    auth?.token,
    projectFilter ? Number(projectFilter) : undefined,
  );
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ id: '', project_id: '', name: '', size: '', price: '' });

  const filtered = stands.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    const payload = {
      id: Number(form.id),
      project_id: Number(form.project_id),
      name: form.name,
      size: Number(form.size),
      price: Number(form.price),
    };
    try {
      const stand = await createProjectStand(auth.token, payload.project_id, payload);
      setStands([...stands, stand]);
      setForm({ id: '', project_id: '', name: '', size: '', price: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id: number) => {
    if (!auth) return;
    try {
      const stand = stands.find(s => s.id === id);
      if (!stand) return;
      await deleteProjectStand(auth.token, stand.project_id, id);
      setStands(stands.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Stands</h2>
      <input
        placeholder="Project ID"
        value={projectFilter}
        onChange={e => setProjectFilter(e.target.value)}
      />
      <form onSubmit={submit}>
        <input placeholder="ID" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} required />
        <input placeholder="Project ID" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Size" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} required />
        <input placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
        <button type="submit">Add</button>
      </form>
      <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Project</th>
            <th>Size</th>
            <th>Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.project_id}</td>
              <td>{s.size}</td>
              <td>{s.price}</td>
              <td>
                <button onClick={() => remove(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Stands;
