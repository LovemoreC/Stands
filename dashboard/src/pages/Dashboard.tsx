import React from 'react';
import { useAuth } from '../auth';
import {
  getStands,
  submitOffer,
  submitAccountOpening,
  submitPropertyApplication,
} from '../api';

interface MandateInfo {
  agreement_status?: string;
  expiration_date?: string;
}

interface Stand {
  id: number;
  project_id: number;
  name: string;
  size: number;
  price: number;
  status: string;
  mandate?: MandateInfo;
}

const Dashboard: React.FC = () => {
  const { auth } = useAuth();
  const [stands, setStands] = React.useState<Stand[]>([]);
  const [project, setProject] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [status, setStatus] = React.useState('');

  React.useEffect(() => {
    if (auth) {
      getStands(auth.token).then(setStands).catch(console.error);
    }
  }, [auth]);

  const filtered = stands.filter(s =>
    (!project || s.project_id === Number(project)) &&
    (!price || s.price <= Number(price)) &&
    (!status || s.status === status)
  );

  const UploadForm: React.FC<{
    label: string;
    onSubmit: (details: string) => Promise<void>;
  }> = ({ label, onSubmit }) => {
    const [details, setDetails] = React.useState('');
    const [progress, setProgress] = React.useState(0);

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setProgress(0);
      const interval = setInterval(
        () => setProgress(p => Math.min(p + 10, 90)),
        200
      );
      try {
        await onSubmit(details);
      } finally {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      }
    };

    return (
      <form className="upload-inline-form" onSubmit={submit}>
        <div className="form-fields">
          <label>
            Details
            <input
              placeholder="Provide submission details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit">{label}</button>
        </div>
        {progress > 0 && <progress value={progress} max={100} />}
      </form>
    );
  };

  if (!auth) return null;

  return (
    <div>
      <h2>Dashboard</h2>
      <section className="form-section">
        <div className="form-card">
          <h3 className="form-title">Filter Stands</h3>
          <div className="form-fields">
            <label htmlFor="dashboard-project-filter">
              Project ID
              <input
                id="dashboard-project-filter"
                placeholder="Filter by project ID"
                value={project}
                onChange={e => setProject(e.target.value)}
              />
            </label>
            <label htmlFor="dashboard-price-filter">
              Max Price
              <input
                id="dashboard-price-filter"
                placeholder="Filter by maximum price"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </label>
            <label htmlFor="dashboard-status-filter">
              Status
              <select
                id="dashboard-status-filter"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </label>
          </div>
        </div>
      </section>
      <section className="form-section">
        <div className="form-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead className="data-table__header">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Project</th>
                  <th scope="col">Name</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col">Agreement Status</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.project_id}</td>
                    <td>{s.name}</td>
                    <td>{s.price}</td>
                    <td>{s.status}</td>
                    <td>{s.mandate?.agreement_status || 'N/A'}</td>
                    <td>
                      {s.mandate?.expiration_date
                        ? new Date(s.mandate.expiration_date).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="data-table__actions">
                      <UploadForm
                        label="Offer"
                        onSubmit={details =>
                          submitOffer(auth.token, {
                            id: Date.now(),
                            realtor: auth.username,
                            property_id: s.id,
                            details,
                          })
                        }
                      />
                      <UploadForm
                        label="Account Opening"
                        onSubmit={details =>
                          submitAccountOpening(auth.token, {
                            id: Date.now(),
                            realtor: auth.username,
                            details,
                          })
                        }
                      />
                      <UploadForm
                        label="Property Application"
                        onSubmit={details =>
                          submitPropertyApplication(auth.token, {
                            id: Date.now(),
                            realtor: auth.username,
                            property_id: s.id,
                            details,
                          })
                        }
                      />
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

export default Dashboard;

