import React from 'react';
import { useAuth } from '../auth';
import {
  DocumentRequirement,
  DocumentWorkflow,
  getDashboard,
  getStands,
  getAccountOpenings,
  getPropertyApplications,
  listDocumentRequirements,
  submitOffer,
  submitAccountOpening,
  submitPropertyApplication,
  submitLoanApplication,
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

interface AccountOpeningRecord {
  id: number;
  realtor: string;
  status: string;
  account_number?: string | null;
}

interface PropertyApplicationRecord {
  id: number;
  realtor: string;
  status: string;
  property_id?: number | null;
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
  const [eligibleAccounts, setEligibleAccounts] = React.useState<
    AccountOpeningRecord[]
  >([]);
  const [approvedPropertyApps, setApprovedPropertyApps] = React.useState<
    PropertyApplicationRecord[]
  >([]);
  const [loanForm, setLoanForm] = React.useState({
    loanId: '',
    accountId: '',
    propertyApplicationId: '',
    propertyId: '',
    primaryFile: null as File | null,
    documents: {} as Record<string, File | null>,
  });
  const [loanError, setLoanError] = React.useState<string | null>(null);
  const [loanSuccess, setLoanSuccess] = React.useState<string | null>(null);
  const [loanProgress, setLoanProgress] = React.useState(0);
  const [loanSubmitting, setLoanSubmitting] = React.useState(false);
  const loanPrimaryInputRef = React.useRef<HTMLInputElement | null>(null);
  const loanDocumentRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const buildLoanDocumentState = React.useCallback(() => {
    const map: Record<string, File | null> = {};
    requirements.loan_application.forEach(req => {
      map[req.slug] = null;
    });
    return map;
  }, [requirements.loan_application]);

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
        const [offerReqs, propertyReqs, accountReqs, loanReqs] = await Promise.all([
          listDocumentRequirements(auth.token, 'offer'),
          listDocumentRequirements(auth.token, 'property_application'),
          listDocumentRequirements(auth.token, 'account_opening'),
          listDocumentRequirements(auth.token, 'loan_application'),
        ]);
        if (!cancelled) {
          setRequirements(prev => ({
            ...prev,
            offer: offerReqs,
            property_application: propertyReqs,
            account_opening: accountReqs,
            loan_application: loanReqs,
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
            loan_application: [],
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

  React.useEffect(() => {
    setLoanForm(prev => {
      const nextDocuments: Record<string, File | null> = {};
      requirements.loan_application.forEach(req => {
        nextDocuments[req.slug] = prev.documents?.[req.slug] ?? null;
      });
      return { ...prev, documents: nextDocuments };
    });
    loanDocumentRefs.current = {};
  }, [requirements.loan_application]);

  const selectedPropertyApplicationId = loanForm.propertyApplicationId;
  React.useEffect(() => {
    setLoanForm(prev => {
      const selected = approvedPropertyApps.find(
        app => String(app.id) === prev.propertyApplicationId,
      );
      const derived = selected?.property_id ? String(selected.property_id) : '';
      if ((derived || '') === (prev.propertyId || '')) {
        if (!selected && !prev.propertyId) {
          return prev;
        }
        if (selected) {
          return prev;
        }
      }
      if (!selected && !prev.propertyId) {
        return prev;
      }
      return { ...prev, propertyId: derived };
    });
  }, [approvedPropertyApps, selectedPropertyApplicationId]);

  React.useEffect(() => {
    if (!auth) {
      setEligibleAccounts([]);
      setApprovedPropertyApps([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [accountsResult, propertiesResult] = await Promise.allSettled([
        getAccountOpenings(auth.token, { status: 'completed' }),
        getPropertyApplications(auth.token, { status: 'manager_approved' }),
      ]);
      if (cancelled) return;
      if (accountsResult.status === 'fulfilled') {
        const records = (accountsResult.value as AccountOpeningRecord[]).filter(
          record =>
            record.status === 'completed' &&
            (!auth?.username || record.realtor === auth.username),
        );
        setEligibleAccounts(records);
      } else {
        setEligibleAccounts([]);
      }
      if (propertiesResult.status === 'fulfilled') {
        const records = (propertiesResult.value as PropertyApplicationRecord[]).filter(
          record =>
            record.status === 'manager_approved' &&
            (!auth?.username || record.realtor === auth.username),
        );
        setApprovedPropertyApps(records);
      } else {
        setApprovedPropertyApps([]);
      }
    })().catch(err => {
      console.error(err);
      if (!cancelled) {
        setEligibleAccounts([]);
        setApprovedPropertyApps([]);
      }
    });
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

  const loanRequirements = requirements.loan_application;
  const selectedProperty = approvedPropertyApps.find(
    app => String(app.id) === loanForm.propertyApplicationId,
  );
  const loanDocumentsComplete = loanRequirements.every(req =>
    Boolean(loanForm.documents[req.slug]),
  );
  const loanComplete =
    Boolean(loanForm.loanId.trim()) &&
    Boolean(loanForm.accountId.trim()) &&
    Boolean(loanForm.propertyApplicationId.trim()) &&
    Boolean(loanForm.primaryFile) &&
    loanDocumentsComplete;

  const validateLoanFile = (file: File | null) => {
    if (!file) return 'File is required';
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext && (ext === 'pdf' || ext === 'csv')
      ? null
      : 'File must be PDF or CSV';
  };

  const resetLoanForm = React.useCallback(() => {
    setLoanForm({
      loanId: '',
      accountId: '',
      propertyApplicationId: '',
      propertyId: '',
      primaryFile: null,
      documents: buildLoanDocumentState(),
    });
    if (loanPrimaryInputRef.current) {
      loanPrimaryInputRef.current.value = '';
    }
    Object.values(loanDocumentRefs.current).forEach(input => {
      if (input) {
        input.value = '';
      }
    });
    loanDocumentRefs.current = {};
  }, [buildLoanDocumentState]);

  const updateLoanDocument = (slug: string, file: File | null) => {
    setLoanForm(prev => ({
      ...prev,
      documents: { ...prev.documents, [slug]: file },
    }));
  };

  const submitLoanForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loanSubmitting) return;
    setLoanError(null);
    setLoanSuccess(null);
    if (!requirementsLoaded) {
      setLoanError('Document requirements are still loading');
      return;
    }
    if (!loanForm.loanId.trim()) {
      setLoanError('Loan application ID is required');
      return;
    }
    const parsedLoanId = Number(loanForm.loanId);
    if (!Number.isFinite(parsedLoanId)) {
      setLoanError('Loan application ID must be a number');
      return;
    }
    if (!loanForm.accountId.trim()) {
      setLoanError('Completed account ID is required');
      return;
    }
    const parsedAccountId = Number(loanForm.accountId);
    if (!Number.isFinite(parsedAccountId)) {
      setLoanError('Completed account ID must be a number');
      return;
    }
    if (!loanForm.propertyApplicationId.trim()) {
      setLoanError('Approved property application is required');
      return;
    }
    const parsedPropertyApplicationId = Number(loanForm.propertyApplicationId);
    if (!Number.isFinite(parsedPropertyApplicationId)) {
      setLoanError('Property application ID must be a number');
      return;
    }
    let parsedPropertyId: number | undefined;
    if (loanForm.propertyId.trim()) {
      parsedPropertyId = Number(loanForm.propertyId);
      if (!Number.isFinite(parsedPropertyId)) {
        setLoanError('Property ID must be a number');
        return;
      }
    }
    const primaryError = validateLoanFile(loanForm.primaryFile);
    if (primaryError) {
      setLoanError(primaryError);
      return;
    }
    for (const requirement of loanRequirements) {
      const file = loanForm.documents[requirement.slug] ?? null;
      const error = validateLoanFile(file);
      if (error) {
        setLoanError(`${requirement.name}: ${error}`);
        return;
      }
    }
    const documentFiles: Record<string, File> = {};
    loanRequirements.forEach(requirement => {
      const file = loanForm.documents[requirement.slug];
      if (file) {
        documentFiles[requirement.slug] = file;
      }
    });
    setLoanSubmitting(true);
    setLoanProgress(0);
    const interval = setInterval(
      () => setLoanProgress(progress => Math.min(progress + 10, 90)),
      200,
    );
    try {
      await submitLoanApplication(auth.token, {
        id: parsedLoanId,
        realtor: auth.username,
        account_id: parsedAccountId,
        property_application_id: parsedPropertyApplicationId,
        property_id: parsedPropertyId,
        file: loanForm.primaryFile!,
        documents: documentFiles,
      });
      setLoanSuccess('Loan application submitted');
      resetLoanForm();
    } catch (err: any) {
      setLoanError(err?.message ?? 'Submission failed');
    } finally {
      clearInterval(interval);
      setLoanSubmitting(false);
      setLoanProgress(100);
      setTimeout(() => setLoanProgress(0), 500);
    }
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
      <section className="form-section">
        <form className="form-card" onSubmit={submitLoanForm}>
          <h3 className="form-title">Loan Application</h3>
          {loanError && <p className="form-message form-message--error">{loanError}</p>}
          {loanSuccess && <p className="form-message form-message--success">{loanSuccess}</p>}
          <div className="form-fields">
            <label htmlFor="loan-application-id">
              Loan Application ID
              <input
                id="loan-application-id"
                placeholder="Enter loan application ID"
                value={loanForm.loanId}
                onChange={e =>
                  setLoanForm(prev => ({ ...prev, loanId: e.target.value }))
                }
              />
            </label>
            <label htmlFor="loan-account-id">
              Completed Account
              {eligibleAccounts.length > 0 ? (
                <select
                  id="loan-account-id"
                  value={loanForm.accountId}
                  onChange={e =>
                    setLoanForm(prev => ({ ...prev, accountId: e.target.value }))
                  }
                >
                  <option value="">Select a completed account</option>
                  {eligibleAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      #{account.id}
                      {account.account_number
                        ? ` • Account ${account.account_number}`
                        : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="loan-account-id"
                  placeholder="Enter completed account ID"
                  value={loanForm.accountId}
                  onChange={e =>
                    setLoanForm(prev => ({ ...prev, accountId: e.target.value }))
                  }
                />
              )}
            </label>
            <label htmlFor="loan-property-application">
              Approved Property Application
              {approvedPropertyApps.length > 0 ? (
                <select
                  id="loan-property-application"
                  value={loanForm.propertyApplicationId}
                  onChange={e =>
                    setLoanForm(prev => ({
                      ...prev,
                      propertyApplicationId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select an approved property application</option>
                  {approvedPropertyApps.map(app => (
                    <option key={app.id} value={app.id}>
                      #{app.id}
                      {typeof app.property_id === 'number'
                        ? ` • Property ${app.property_id}`
                        : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="loan-property-application"
                  placeholder="Enter approved property application ID"
                  value={loanForm.propertyApplicationId}
                  onChange={e =>
                    setLoanForm(prev => ({
                      ...prev,
                      propertyApplicationId: e.target.value,
                    }))
                  }
                />
              )}
            </label>
            <label htmlFor="loan-property-id">
              Property ID
              <input
                id="loan-property-id"
                placeholder="Derived from property application"
                value={loanForm.propertyId}
                onChange={e =>
                  setLoanForm(prev => ({ ...prev, propertyId: e.target.value }))
                }
                readOnly={Boolean(selectedProperty)}
              />
            </label>
            <label htmlFor="loan-primary">
              Primary Document
              <input
                id="loan-primary"
                type="file"
                accept=".pdf,.csv"
                onChange={e =>
                  setLoanForm(prev => ({
                    ...prev,
                    primaryFile: e.target.files?.[0] ?? null,
                  }))
                }
                ref={loanPrimaryInputRef}
                required
              />
            </label>
            {loanRequirements.map(requirement => {
              const inputId = `loan-${requirement.slug}`;
              return (
                <label key={requirement.id} htmlFor={inputId}>
                  {requirement.name}
                  <input
                    id={inputId}
                    type="file"
                    accept=".pdf,.csv"
                    onChange={e =>
                      updateLoanDocument(
                        requirement.slug,
                        e.target.files?.[0] ?? null,
                      )
                    }
                    ref={el => {
                      loanDocumentRefs.current[requirement.slug] = el;
                    }}
                    required
                  />
                </label>
              );
            })}
          </div>
          <div className="form-actions">
            <button
              type="submit"
              disabled={
                !requirementsLoaded || !loanComplete || loanSubmitting
              }
            >
              Submit Loan Application
            </button>
          </div>
          {loanProgress > 0 && <progress value={loanProgress} max={100} />}
        </form>
      </section>
    </div>
  );
};

export default Dashboard;

