import React from 'react';
import { useAuth } from '../auth';
import {
  DocumentRequirement,
  DocumentWorkflow,
  listDocumentRequirements,
  submitOffer,
  submitPropertyApplication,
  submitAccountOpening,
} from '../api';

interface FileData {
  primaryFile: File | null;
  details: string;
  propertyId?: string;
  documents: Record<string, File | null>;
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
    primaryFile: null,
    documents: {},
  });
  const [account, setAccount] = React.useState<FileData>({
    details: '',
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
  }, [requirements]);

  if (!auth) return null;

  const offerComplete =
    Boolean(offer.propertyId?.trim()) &&
    Boolean(offer.details.trim()) &&
    Boolean(offer.primaryFile) &&
    requirements.offer.every(req => Boolean(offer.documents[req.slug]));
  const applicationComplete =
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

  const validateFile = (f?: File) => {
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
        id: Date.now(),
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
      {step > 3 && <p className="form-message form-message--success">All steps completed.</p>}
    </div>
  );
};

export default MultiStepForm;
