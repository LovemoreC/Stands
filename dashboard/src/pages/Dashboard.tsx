import React from 'react';
import { useAuth } from '../auth';
import {
  DocumentRequirement,
  DocumentWorkflow,
  getDashboard,
  getStands,
  listDocumentRequirements,
  submitOffer,
  submitAccountOpening,
  submitPropertyApplication,
} from '../api';
import { BarChartCard, LineChartCard, PieChartCard, toChartData } from '../components/ChartCard';

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
  const [requirements, setRequirements] = React.useState<
    Record<DocumentWorkflow, DocumentRequirement[]>
  >({
    offer: [],
    property_application: [],
    account_opening: [],
    loan_application: [],
  });
  const [requirementsLoaded, setRequirementsLoaded] = React.useState(false);
  const [dashboardSummary, setDashboardSummary] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (auth) {
      getStands(auth.token).then(setStands).catch(console.error);
      getDashboard(auth.token).then(setDashboardSummary).catch(console.error);
    }
  }, [auth]);

  React.useEffect(() => {
    if (!auth) {
      setRequirements({
        offer: [],
        property_application: [],
        account_opening: [],
        loan_application: [],
      });
      setRequirementsLoaded(false);
      return;
    }
    setRequirementsLoaded(false);
    let cancelled = false;
    (async () => {
      try {
        const [offerReqs, propertyReqs, accountReqs] = await Promise.all([
          listDocumentRequirements(auth.token, 'offer'),
          listDocumentRequirements(auth.token, 'property_application'),
          listDocumentRequirements(auth.token, 'account_opening'),
        ]);
        if (!cancelled) {
          setRequirements(prev => ({
            ...prev,
            offer: offerReqs,
            property_application: propertyReqs,
            account_opening: accountReqs,
          }));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setRequirements(prev => ({
            ...prev,
            offer: [],
            property_application: [],
            account_opening: [],
          }));
        }
      } finally {
        if (!cancelled) {
          setRequirementsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const filtered = stands.filter(s =>
    (!project || s.project_id === Number(project)) &&
    (!price || s.price <= Number(price)) &&
    (!status || s.status === status)
  );

  const inventoryData = React.useMemo(
    () => toChartData(dashboardSummary?.property_status),
    [dashboardSummary?.property_status],
  );
  const mandateData = React.useMemo(
    () => toChartData(dashboardSummary?.mandates),
    [dashboardSummary?.mandates],
  );
  const loanData = React.useMemo(
    () => toChartData(dashboardSummary?.loan_approvals),
    [dashboardSummary?.loan_approvals],
  );
  const depositData = React.useMemo(() => {
    const summary = dashboardSummary;
    if (!summary) return [];
    if (Array.isArray(summary.deposit_trend)) {
      return summary.deposit_trend
        .filter((point: any) => point && typeof point.value === 'number' && point.label)
        .map((point: any) => ({ label: String(point.label), value: point.value }));
    }
    if (summary.deposits_breakdown && typeof summary.deposits_breakdown === 'object') {
      return toChartData(summary.deposits_breakdown as Record<string, number>);
    }
    if (typeof summary.deposits === 'number') {
      return [{ label: 'Total Deposits', value: summary.deposits }];
    }
    return [];
  }, [dashboardSummary]);

  const UploadForm: React.FC<{
    label: string;
    requirements: DocumentRequirement[];
    onSubmit: (payload: {
      details: string;
      primaryFile: File;
      documents: Record<string, File>;
    }) => Promise<void>;
    disabled?: boolean;
  }> = ({ label, requirements, onSubmit, disabled }) => {
    const baseId = React.useId();
    const [details, setDetails] = React.useState('');
    const [primaryFile, setPrimaryFile] = React.useState<File | null>(null);
    const [documents, setDocuments] = React.useState<Record<string, File | null>>({});
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const primaryInputRef = React.useRef<HTMLInputElement | null>(null);
    const documentRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    React.useEffect(() => {
      const initial: Record<string, File | null> = {};
      requirements.forEach(req => {
        initial[req.slug] = null;
      });
      setDocuments(initial);
      documentRefs.current = {};
    }, [requirements]);

    const validateFile = (file: File | null) => {
      if (!file) return 'File is required';
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext && (ext === 'pdf' || ext === 'csv')
        ? null
        : 'File must be PDF or CSV';
    };

    const updateDocument = (slug: string, file: File | null) => {
      setDocuments(prev => ({ ...prev, [slug]: file }));
    };

    const resetForm = () => {
      setDetails('');
      setPrimaryFile(null);
      const cleared: Record<string, File | null> = {};
      requirements.forEach(req => {
        cleared[req.slug] = null;
      });
      setDocuments(cleared);
      if (primaryInputRef.current) {
        primaryInputRef.current.value = '';
      }
      Object.values(documentRefs.current).forEach(input => {
        if (input) {
          input.value = '';
        }
      });
    };

    const allDocsSelected = requirements.every(req => Boolean(documents[req.slug]));
    const isComplete = Boolean(details.trim()) && Boolean(primaryFile) && allDocsSelected;

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (disabled) return;
      setError(null);
      if (!isComplete) {
        setError('All fields are required');
        return;
      }
      const primaryError = validateFile(primaryFile);
      if (primaryError) {
        setError(primaryError);
        return;
      }
      for (const req of requirements) {
        const docError = validateFile(documents[req.slug] ?? null);
        if (docError) {
          setError(`${req.name}: ${docError}`);
          return;
        }
      }
      const docFiles: Record<string, File> = {};
      requirements.forEach(req => {
        const file = documents[req.slug];
        if (file) {
          docFiles[req.slug] = file;
        }
      });
      setProgress(0);
      const interval = setInterval(
        () => setProgress(p => Math.min(p + 10, 90)),
        200
      );
      try {
        await onSubmit({
          details: details.trim(),
          primaryFile: primaryFile as File,
          documents: docFiles,
        });
        resetForm();
      } catch (err: any) {
        setError(err?.message ?? 'Submission failed');
      } finally {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      }
    };

    return (
      <form className="upload-inline-form" onSubmit={submit}>
        <div className="form-fields">
          <label htmlFor={`${baseId}-details`}>
            Details
            <input
              id={`${baseId}-details`}
              placeholder="Provide submission details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              required
            />
          </label>
          <label htmlFor={`${baseId}-primary`}>
            Primary Document
            <input
              id={`${baseId}-primary`}
              type="file"
              accept=".pdf,.csv"
              onChange={e => setPrimaryFile(e.target.files?.[0] ?? null)}
              ref={primaryInputRef}
              required
            />
          </label>
          {requirements.map(req => {
            const inputId = `${baseId}-${req.slug}`;
            return (
              <label key={req.id} htmlFor={inputId}>
                {req.name}
                <input
                  id={inputId}
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e => updateDocument(req.slug, e.target.files?.[0] ?? null)}
                  ref={el => {
                    documentRefs.current[req.slug] = el;
                  }}
                  required
                />
              </label>
            );
          })}
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={disabled || !isComplete}>
            {label}
          </button>
        </div>
        {progress > 0 && <progress value={progress} max={100} />}
      </form>
    );
  };

  if (!auth) return null;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="chart-grid" role="presentation">
        {inventoryData.length > 0 && (
          <BarChartCard
            title="Inventory you can sell"
            description="Properties by current availability"
            data={inventoryData}
            valueLabel="Properties"
          />
        )}
        {mandateData.length > 0 && (
          <PieChartCard
            title="Mandate readiness"
            description="Mandates tracked across your accounts"
            data={mandateData}
            valueLabel="Mandates"
          />
        )}
        {depositData.length > 0 && (
          <LineChartCard
            title="Deposit inflows"
            description="Payments received for your allocations"
            data={depositData}
            valueLabel="Deposits"
          />
        )}
        {loanData.length > 0 && (
          <BarChartCard
            title="Loan outcomes"
            description="Status of loan requests submitted by your clients"
            data={loanData}
            valueLabel="Applications"
          />
        )}
      </div>
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
                        requirements={requirements.offer}
                        disabled={!requirementsLoaded}
                        onSubmit={({ details, primaryFile, documents }) =>
                          submitOffer(auth.token, {
                            id: Date.now(),
                            realtor: auth.username,
                            property_id: s.id,
                            details,
                            file: primaryFile,
                            documents,
                          })
                        }
                      />
                      <UploadForm
                        label="Account Opening"
                        requirements={requirements.account_opening}
                        disabled={!requirementsLoaded}
                        onSubmit={({ details, primaryFile, documents }) =>
                          submitAccountOpening(auth.token, {
                            id: Date.now(),
                            realtor: auth.username,
                            details,
                            file: primaryFile,
                            documents,
                          })
                        }
                      />
                      <UploadForm
                        label="Property Application"
                        requirements={requirements.property_application}
                        disabled={!requirementsLoaded}
                        onSubmit={({ details, primaryFile, documents }) =>
                          submitPropertyApplication(auth.token, {
                            id: Date.now(),
                            realtor: auth.username,
                            property_id: s.id,
                            details,
                            file: primaryFile,
                            documents,
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

