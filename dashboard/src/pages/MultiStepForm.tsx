import React from 'react';
import { useAuth } from '../auth';
import {
  DocumentRequirement,
  DocumentWorkflow,
  listDocumentRequirements,
  submitOffer,
  submitPropertyApplication,
  submitAccountOpening,
  submitLoanApplication,
  getAccountOpenings,
  getPropertyApplications,
} from '../api';

interface FileData {
  primaryFile: File | null;
  details: string;
  propertyId?: string;
  id?: string;
  documents: Record<string, File | null>;
}

interface LoanFormData {
  primaryFile: File | null;
  loanId: string;
  accountId: string;
  propertyApplicationId: string;
  propertyId: string;
  documents: Record<string, File | null>;
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

const MultiStepForm: React.FC = () => {
  const { auth } = useAuth();
  const [step, setStep] = React.useState(1);
  const [offer, setOffer] = React.useState<FileData>({
    details: '',
    propertyId: '',
    primaryFile: null,
    documents: {},
  });
  const [application, setApplication] = React.useState<FileData>({
    details: '',
    propertyId: '',
    id: '',
    primaryFile: null,
    documents: {},
  });
  const [account, setAccount] = React.useState<FileData>({
    details: '',
    primaryFile: null,
    documents: {},
  });
  const [loan, setLoan] = React.useState<LoanFormData>({
    loanId: '',
    accountId: '',
    propertyApplicationId: '',
    propertyId: '',
    primaryFile: null,
    documents: {},
  });
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [requirements, setRequirements] = React.useState<
    Record<DocumentWorkflow, DocumentRequirement[]>
  >({
    offer: [],
    property_application: [],
    account_opening: [],
    loan_application: [],
  });
  const [requirementsLoaded, setRequirementsLoaded] = React.useState(false);
  const [eligibleAccounts, setEligibleAccounts] = React.useState<
    AccountOpeningRecord[]
  >([]);
  const [approvedPropertyApps, setApprovedPropertyApps] = React.useState<
    PropertyApplicationRecord[]
  >([]);

  const mergeDocuments = (
    reqs: DocumentRequirement[],
    existing: Record<string, File | null>,
  ): Record<string, File | null> => {
    const next: Record<string, File | null> = {};
    reqs.forEach(req => {
      next[req.slug] = existing?.[req.slug] ?? null;
    });
    return next;
  };

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
    setOffer(prev => ({
      ...prev,
      documents: mergeDocuments(requirements.offer, prev.documents),
    }));
    setApplication(prev => ({
      ...prev,
      documents: mergeDocuments(
        requirements.property_application,
        prev.documents,
      ),
    }));
    setAccount(prev => ({
      ...prev,
      documents: mergeDocuments(requirements.account_opening, prev.documents),
    }));
    setLoan(prev => ({
      ...prev,
      documents: mergeDocuments(requirements.loan_application, prev.documents),
    }));
  }, [requirements]);

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

  React.useEffect(() => {
    const selected = approvedPropertyApps.find(
      app => String(app.id) === loan.propertyApplicationId,
    );
    const derived = selected?.property_id ? String(selected.property_id) : '';
    if ((derived || '') === (loan.propertyId || '')) {
      return;
    }
    setLoan(prev => ({ ...prev, propertyId: derived }));
  }, [approvedPropertyApps, loan.propertyApplicationId, loan.propertyId]);

  if (!auth) return null;

  const offerComplete =
    Boolean(offer.propertyId?.trim()) &&
    Boolean(offer.details.trim()) &&
    Boolean(offer.primaryFile) &&
    requirements.offer.every(req => Boolean(offer.documents[req.slug]));
  const applicationComplete =
    Boolean(application.id?.trim()) &&
    Boolean(application.propertyId?.trim()) &&
    Boolean(application.details.trim()) &&
    Boolean(application.primaryFile) &&
    requirements.property_application.every(
      req => Boolean(application.documents[req.slug]),
    );
  const accountComplete =
    Boolean(account.details.trim()) &&
    Boolean(account.primaryFile) &&
    requirements.account_opening.every(req => Boolean(account.documents[req.slug]));
  const loanComplete =
    Boolean(loan.loanId.trim()) &&
    Boolean(loan.accountId.trim()) &&
    Boolean(loan.propertyApplicationId.trim()) &&
    Boolean(loan.primaryFile) &&
    requirements.loan_application.every(req => Boolean(loan.documents[req.slug]));

  const selectedLoanProperty = React.useMemo(
    () =>
      approvedPropertyApps.find(
        app => String(app.id) === loan.propertyApplicationId,
      ) ?? null,
    [approvedPropertyApps, loan.propertyApplicationId],
  );

  const validateFile = (f?: File | null) => {
    if (!f) return 'File is required';
    const ext = f.name.split('.').pop()?.toLowerCase();
    return ext === 'pdf' || ext === 'csv' ? null : 'File must be PDF or CSV';
  };

  const next = () => {
    setError(null);
    setSuccess(null);
    setStep(s => s + 1);
  };

  const submitOfferStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementsLoaded) return setError('Document requirements are still loading');
    if (!offer.propertyId) return setError('Property ID is required');
    if (!offer.details) return setError('Details are required');
    const fileErr = validateFile(offer.primaryFile);
    if (fileErr) return setError(fileErr);
    const missingDoc = requirements.offer.find(req => !offer.documents[req.slug]);
    if (missingDoc) return setError(`Please upload ${missingDoc.name}`);
    const docFiles: Record<string, File> = {};
    requirements.offer.forEach(req => {
      const file = offer.documents[req.slug];
      if (file) docFiles[req.slug] = file;
    });
    try {
      await submitOffer(auth.token, {
        id: Date.now(),
        realtor: auth.username,
        property_id: Number(offer.propertyId),
        details: offer.details,
        file: offer.primaryFile!,
        documents: docFiles,
      });
      setSuccess('Offer submitted successfully');
      setOffer({
        details: '',
        propertyId: '',
        primaryFile: null,
        documents: mergeDocuments(requirements.offer, {}),
      });
      next();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitApplicationStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementsLoaded) return setError('Document requirements are still loading');
    if (!application.id) return setError('Application ID is required');
    const parsedId = Number(application.id);
    if (!Number.isFinite(parsedId)) {
      return setError('Application ID must be a number');
    }
    if (!application.propertyId) return setError('Property ID is required');
    if (!application.details) return setError('Details are required');
    const fileErr = validateFile(application.primaryFile);
    if (fileErr) return setError(fileErr);
    const missingDoc = requirements.property_application.find(
      req => !application.documents[req.slug],
    );
    if (missingDoc) return setError(`Please upload ${missingDoc.name}`);
    const docFiles: Record<string, File> = {};
    requirements.property_application.forEach(req => {
      const file = application.documents[req.slug];
      if (file) docFiles[req.slug] = file;
    });
    try {
      await submitPropertyApplication(auth.token, {
        id: parsedId,
        realtor: auth.username,
        property_id: Number(application.propertyId),
        details: application.details,
        file: application.primaryFile!,
        documents: docFiles,
      });
      setSuccess('Property application submitted');
      setApplication({
        details: '',
        propertyId: '',
        id: '',
        primaryFile: null,
        documents: mergeDocuments(requirements.property_application, {}),
      });
      next();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitAccountStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementsLoaded) return setError('Document requirements are still loading');
    if (!account.details) return setError('Details are required');
    const fileErr = validateFile(account.primaryFile);
    if (fileErr) return setError(fileErr);
    const missingDoc = requirements.account_opening.find(
      req => !account.documents[req.slug],
    );
    if (missingDoc) return setError(`Please upload ${missingDoc.name}`);
    const docFiles: Record<string, File> = {};
    requirements.account_opening.forEach(req => {
      const file = account.documents[req.slug];
      if (file) docFiles[req.slug] = file;
    });
    try {
      await submitAccountOpening(auth.token, {
        id: Date.now(),
        realtor: auth.username,
        details: account.details,
        file: account.primaryFile!,
        documents: docFiles,
      });
      setSuccess('Account opening submitted');
      setAccount({
        details: '',
        primaryFile: null,
        documents: mergeDocuments(requirements.account_opening, {}),
      });
      next();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitLoanStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementsLoaded) {
      setError('Document requirements are still loading');
      return;
    }
    if (!loan.loanId) {
      setError('Loan application ID is required');
      return;
    }
    const parsedLoanId = Number(loan.loanId);
    if (!Number.isFinite(parsedLoanId)) {
      setError('Loan application ID must be a number');
      return;
    }
    if (!loan.accountId) {
      setError('Completed account ID is required');
      return;
    }
    const parsedAccountId = Number(loan.accountId);
    if (!Number.isFinite(parsedAccountId)) {
      setError('Completed account ID must be a number');
      return;
    }
    if (!loan.propertyApplicationId) {
      setError('Approved property application ID is required');
      return;
    }
    const parsedPropertyApplicationId = Number(loan.propertyApplicationId);
    if (!Number.isFinite(parsedPropertyApplicationId)) {
      setError('Approved property application ID must be a number');
      return;
    }
    let parsedPropertyId: number | undefined;
    if (loan.propertyId) {
      parsedPropertyId = Number(loan.propertyId);
      if (!Number.isFinite(parsedPropertyId)) {
        setError('Property ID must be a number');
        return;
      }
    }
    const fileErr = validateFile(loan.primaryFile);
    if (fileErr) {
      setError(fileErr);
      return;
    }
    const missingDoc = requirements.loan_application.find(
      req => !loan.documents[req.slug],
    );
    if (missingDoc) {
      setError(`Please upload ${missingDoc.name}`);
      return;
    }
    const docFiles: Record<string, File> = {};
    requirements.loan_application.forEach(req => {
      const file = loan.documents[req.slug];
      if (file) docFiles[req.slug] = file;
    });
    try {
      await submitLoanApplication(auth.token, {
        id: parsedLoanId,
        realtor: auth.username,
        account_id: parsedAccountId,
        property_application_id: parsedPropertyApplicationId,
        property_id: parsedPropertyId,
        file: loan.primaryFile!,
        documents: docFiles,
      });
      setSuccess('Loan application submitted');
      setLoan({
        loanId: '',
        accountId: '',
        propertyApplicationId: '',
        propertyId: '',
        primaryFile: null,
        documents: mergeDocuments(requirements.loan_application, {}),
      });
      next();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>New Submission</h2>
      {error && <p className="form-message form-message--error">{error}</p>}
      {success && <p className="form-message form-message--success">{success}</p>}
      {step === 1 && (
        <section className="form-section">
          <form className="form-card" onSubmit={submitOfferStep}>
            <h3 className="form-title">Offer Details</h3>
          <div className="form-fields">
            <label htmlFor="offer-property-id">
              Property ID
              <input
                id="offer-property-id"
                placeholder="Enter property ID"
                value={offer.propertyId}
                onChange={e => setOffer({ ...offer, propertyId: e.target.value })}
              />
            </label>
            <label htmlFor="offer-details">
              Details
              <textarea
                id="offer-details"
                placeholder="Describe the offer"
                value={offer.details}
                onChange={e => setOffer({ ...offer, details: e.target.value })}
              />
            </label>
            <label htmlFor="offer-primary">
              Primary Document
              <input
                id="offer-primary"
                type="file"
                accept=".pdf,.csv"
                onChange={e =>
                  setOffer(prev => ({
                    ...prev,
                    primaryFile: e.target.files?.[0] ?? null,
                  }))
                }
                required
              />
            </label>
            {requirements.offer.map(req => (
              <label key={req.id} htmlFor={`offer-${req.slug}`}>
                {req.name}
                <input
                  id={`offer-${req.slug}`}
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e =>
                    setOffer(prev => ({
                      ...prev,
                      documents: {
                        ...prev.documents,
                        [req.slug]: e.target.files?.[0] ?? null,
                      },
                    }))
                  }
                  required
                />
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button
              type="submit"
              disabled={!requirementsLoaded || !offerComplete}
            >
              Next
            </button>
          </div>
          </form>
        </section>
      )}
      {step === 2 && (
        <section className="form-section">
          <form className="form-card" onSubmit={submitApplicationStep}>
            <h3 className="form-title">Property Application</h3>
            <div className="form-fields">
              <label htmlFor="application-id">
                Application ID
                <input
                  id="application-id"
                  placeholder="Enter application ID"
                  value={application.id}
                  onChange={e => setApplication({ ...application, id: e.target.value })}
                />
              </label>
              <label htmlFor="application-property-id">
                Property ID
                <input
                  id="application-property-id"
                  placeholder="Enter property ID"
                  value={application.propertyId}
                  onChange={e => setApplication({ ...application, propertyId: e.target.value })}
                />
              </label>
              <label htmlFor="application-details">
                Details
                <textarea
                  id="application-details"
                  placeholder="Describe the application"
                  value={application.details}
                  onChange={e => setApplication({ ...application, details: e.target.value })}
                />
              </label>
              <label htmlFor="application-primary">
                Primary Document
                <input
                  id="application-primary"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e =>
                    setApplication(prev => ({
                      ...prev,
                      primaryFile: e.target.files?.[0] ?? null,
                    }))
                  }
                  required
                />
              </label>
              {requirements.property_application.map(req => (
                <label key={req.id} htmlFor={`application-${req.slug}`}>
                  {req.name}
                  <input
                    id={`application-${req.slug}`}
                    type="file"
                    accept=".pdf,.csv"
                    onChange={e =>
                      setApplication(prev => ({
                        ...prev,
                        documents: {
                          ...prev.documents,
                          [req.slug]: e.target.files?.[0] ?? null,
                        },
                      }))
                    }
                    required
                  />
                </label>
              ))}
          </div>
          <div className="form-actions">
            <button
              type="submit"
              disabled={!requirementsLoaded || !applicationComplete}
            >
              Next
            </button>
          </div>
          </form>
        </section>
      )}
      {step === 3 && (
        <section className="form-section">
          <form className="form-card" onSubmit={submitAccountStep}>
            <h3 className="form-title">Account Opening</h3>
            <div className="form-fields">
              <label htmlFor="account-details">
                Details
                <textarea
                  id="account-details"
                  placeholder="Provide account opening details"
                  value={account.details}
                  onChange={e => setAccount({ ...account, details: e.target.value })}
                />
              </label>
              <label htmlFor="account-primary">
                Primary Document
                <input
                  id="account-primary"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e =>
                    setAccount(prev => ({
                      ...prev,
                      primaryFile: e.target.files?.[0] ?? null,
                    }))
                  }
                  required
                />
              </label>
              {requirements.account_opening.map(req => (
                <label key={req.id} htmlFor={`account-${req.slug}`}>
                  {req.name}
                  <input
                    id={`account-${req.slug}`}
                    type="file"
                    accept=".pdf,.csv"
                    onChange={e =>
                      setAccount(prev => ({
                        ...prev,
                        documents: {
                          ...prev.documents,
                          [req.slug]: e.target.files?.[0] ?? null,
                        },
                      }))
                    }
                    required
                  />
                </label>
              ))}
          </div>
          <div className="form-actions">
            <button
              type="submit"
              disabled={!requirementsLoaded || !accountComplete}
            >
              Submit
            </button>
          </div>
          </form>
        </section>
      )}
      {step === 4 && (
        <section className="form-section">
          <form className="form-card" onSubmit={submitLoanStep}>
            <h3 className="form-title">Loan Application</h3>
            <div className="form-fields">
              <label htmlFor="loan-id">
                Loan Application ID
                <input
                  id="loan-id"
                  placeholder="Enter loan application ID"
                  value={loan.loanId}
                  onChange={e =>
                    setLoan(prev => ({ ...prev, loanId: e.target.value }))
                  }
                />
              </label>
              <label htmlFor="loan-account">
                Completed Account
                {eligibleAccounts.length > 0 ? (
                  <select
                    id="loan-account"
                    value={loan.accountId}
                    onChange={e =>
                      setLoan(prev => ({ ...prev, accountId: e.target.value }))
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
                    id="loan-account"
                    placeholder="Enter completed account ID"
                    value={loan.accountId}
                    onChange={e =>
                      setLoan(prev => ({ ...prev, accountId: e.target.value }))
                    }
                  />
                )}
              </label>
              <label htmlFor="loan-property-app">
                Approved Property Application
                {approvedPropertyApps.length > 0 ? (
                  <select
                    id="loan-property-app"
                    value={loan.propertyApplicationId}
                    onChange={e =>
                      setLoan(prev => ({
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
                    id="loan-property-app"
                    placeholder="Enter approved property application ID"
                    value={loan.propertyApplicationId}
                    onChange={e =>
                      setLoan(prev => ({
                        ...prev,
                        propertyApplicationId: e.target.value,
                      }))
                    }
                  />
                )}
              </label>
              <label htmlFor="loan-property">
                Property ID
                <input
                  id="loan-property"
                  placeholder="Derived from property application"
                  value={loan.propertyId}
                  onChange={e =>
                    setLoan(prev => ({ ...prev, propertyId: e.target.value }))
                  }
                  readOnly={Boolean(selectedLoanProperty)}
                />
              </label>
              <label htmlFor="loan-primary">
                Primary Document
                <input
                  id="loan-primary"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e =>
                    setLoan(prev => ({
                      ...prev,
                      primaryFile: e.target.files?.[0] ?? null,
                    }))
                  }
                  required
                />
              </label>
              {requirements.loan_application.map(req => (
                <label key={req.id} htmlFor={`loan-${req.slug}`}>
                  {req.name}
                  <input
                    id={`loan-${req.slug}`}
                    type="file"
                    accept=".pdf,.csv"
                    onChange={e =>
                      setLoan(prev => ({
                        ...prev,
                        documents: {
                          ...prev.documents,
                          [req.slug]: e.target.files?.[0] ?? null,
                        },
                      }))
                    }
                    required
                  />
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button
                type="submit"
                disabled={!requirementsLoaded || !loanComplete}
              >
                Submit
              </button>
            </div>
          </form>
        </section>
      )}
      {step > 4 && <p className="form-message form-message--success">All steps completed.</p>}
    </div>
  );
};

export default MultiStepForm;
