import React from 'react';
import { useAuth } from '../auth';
import { getProjects, createProject } from '../api';

interface Project {
  id: number;
  name: string;
}

const Projects: React.FC = () => {
  const { auth } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ id: '', name: '' });

  React.useEffect(() => {
    if (auth) {
      getProjects(auth.token).then(setProjects).catch(console.error);
    }
  }, [auth]);

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.name || !auth) return;
    try {
      const project = await createProject(auth.token, { id: Number(form.id), name: form.name });
      setProjects([...projects, project]);
      setForm({ id: '', name: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Projects</h2>
      <form onSubmit={submit}>
        <input
          placeholder="ID"
          value={form.id}
          onChange={e => setForm({ ...form, id: e.target.value })}
          required
        />
        <input
          placeholder="Name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <button type="submit">Add</button>
      </form>
      <input
        placeholder="Search"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Projects;
