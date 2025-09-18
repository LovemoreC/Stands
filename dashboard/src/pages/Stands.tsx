import React from 'react';
import { useAuth } from '../auth';
import {
  getStands as fetchStands,
  createStand as createStandRequest,
  deleteStand as deleteStandRequest,
} from '../api';

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
  const [stands, setStands] = React.useState<Stand[]>([]);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ project_id: '', name: '', size: '', price: '' });

  const projectIdFilter = projectFilter.trim();

  React.useEffect(() => {
    if (!auth?.token) {
      setStands([]);
      return;
    }
    fetchStands(auth.token)
      .then(data => setStands(data))
      .catch(console.error);
  }, [auth?.token]);

  const filtered = stands
    .filter(stand => {
      if (!projectIdFilter) return true;
      const parsed = Number(projectIdFilter);
      if (Number.isNaN(parsed)) return true;
      return stand.project_id === parsed;
    })
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    const payload = {
      project_id: Number(form.project_id),
      name: form.name,
      size: Number(form.size),
      price: Number(form.price),
    };
    try {
      const stand = await createStandRequest(auth.token, payload);
      setStands(prev => [...prev, stand]);
      setForm({ project_id: '', name: '', size: '', price: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id: number) => {
    if (!auth) return;
    try {
      const stand = stands.find(s => s.id === id);
      if (!stand) return;
      await deleteStandRequest(auth.token, id);
      setStands(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Stands</h2>
      <section className="form-section">
        <div className="form-card">
          <div className="form-fields">
            <label htmlFor="stands-project-filter">
              Filter by Project ID
              <input
                id="stands-project-filter"
                placeholder="Enter project ID"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
              />
            </label>
            <label htmlFor="stands-search">
              Search by Name
              <input
                id="stands-search"
                placeholder="Search stands"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>
      <section className="form-section">
        <form className="form-card" onSubmit={submit}>
          <h3 className="form-title">Add Stand</h3>
          <div className="form-fields">
            <label htmlFor="stand-project-id">
              Project ID
              <input
                id="stand-project-id"
                placeholder="Project ID"
                value={form.project_id}
                onChange={e => setForm({ ...form, project_id: e.target.value })}
                required
              />
            </label>
            <label htmlFor="stand-name">
              Name
              <input
                id="stand-name"
                placeholder="Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label htmlFor="stand-size">
              Size
              <input
                id="stand-size"
                placeholder="Size"
                value={form.size}
                onChange={e => setForm({ ...form, size: e.target.value })}
                required
              />
            </label>
            <label htmlFor="stand-price">
              Price
              <input
                id="stand-price"
                placeholder="Price"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit">Add Stand</button>
          </div>
        </form>
      </section>
      <section className="form-section">
        <div className="form-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead className="data-table__header">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Project</th>
                  <th scope="col">Size</th>
                  <th scope="col">Price</th>
                  <th scope="col" aria-label="Actions"></th>
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
                    <td className="data-table__actions">
                      <button type="button" onClick={() => remove(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Stands;
