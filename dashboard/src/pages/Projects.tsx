import React from 'react';
import PropertyImportForm from '../components/PropertyImportForm';
import { useAuth } from '../auth';
import {
  getProjects as fetchProjects,
  createProject as createProjectRequest,
} from '../api';

interface Project {
  id: number;
  name: string;
  description?: string;
}

const Projects: React.FC = () => {
  const { auth } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ name: '', description: '' });

  React.useEffect(() => {
    if (!auth?.token) {
      setProjects([]);
      return;
    }
    fetchProjects(auth.token)
      .then(data => setProjects(data))
      .catch(console.error);
  }, [auth?.token]);

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const description = form.description.trim();
    if (!name || !auth) return;
    try {
      const project = await createProjectRequest(auth.token, {
        name,
        ...(description ? { description } : {}),
      });
      setProjects(prev => [...prev, project]);
      setForm({ name: '', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Projects</h2>
      {auth?.role === 'admin' && (
        <section className="form-section">
          <PropertyImportForm
            className="form-card"
            fieldsClassName="form-fields"
            actionsClassName="form-actions"
          >
            <h3 className="form-title">Import Properties</h3>
            <p>Select a CSV or Excel file to upload new property records.</p>
          </PropertyImportForm>
        </section>
      )}
      <section className="form-section">
        <form className="form-card" onSubmit={submit}>
          <h3 className="form-title">Add Project</h3>
          <div className="form-fields">
            <label htmlFor="project-name">
              Name
              <input
                id="project-name"
                placeholder="Enter project name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label htmlFor="project-description">
              Description (optional)
              <input
                id="project-description"
                placeholder="Enter project description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit">Add Project</button>
          </div>
        </form>
      </section>
      <section className="form-section">
        <div className="form-card">
          <div className="form-fields">
            <label htmlFor="project-search">
              Search Projects
              <input
                id="project-search"
                placeholder="Filter by name"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead className="data-table__header">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Name</th>
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
        </div>
      </section>
    </div>
  );
};

export default Projects;
