import React from 'react';
import { useAuth } from '../auth';
import { submitOffer, submitPropertyApplication, submitAccountOpening } from '../api';

interface FileData {
  file?: File;
  details: string;
  propertyId?: string;
}

const MultiStepForm: React.FC = () => {
  const { auth } = useAuth();
  const [step, setStep] = React.useState(1);
  const [offer, setOffer] = React.useState<FileData>({ details: '', propertyId: '' });
  const [application, setApplication] = React.useState<FileData>({ details: '', propertyId: '' });
  const [account, setAccount] = React.useState<FileData>({ details: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  if (!auth) return null;

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
    if (!offer.propertyId) return setError('Property ID is required');
    if (!offer.details) return setError('Details are required');
    const fileErr = validateFile(offer.file);
    if (fileErr) return setError(fileErr);
    try {
      await submitOffer(auth.token, {
        id: Date.now(),
        realtor: auth.username,
        property_id: Number(offer.propertyId),
        details: offer.details,
        file: offer.file,
      });
      setSuccess('Offer submitted successfully');
      next();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitApplicationStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application.propertyId) return setError('Property ID is required');
    if (!application.details) return setError('Details are required');
    const fileErr = validateFile(application.file);
    if (fileErr) return setError(fileErr);
    try {
      await submitPropertyApplication(auth.token, {
        id: Date.now(),
        realtor: auth.username,
        property_id: Number(application.propertyId),
        details: application.details,
        file: application.file,
      });
      setSuccess('Property application submitted');
      next();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitAccountStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.details) return setError('Details are required');
    const fileErr = validateFile(account.file);
    if (fileErr) return setError(fileErr);
    try {
      await submitAccountOpening(auth.token, {
        id: Date.now(),
        realtor: auth.username,
        details: account.details,
        file: account.file,
      });
      setSuccess('Account opening submitted');
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
              <label htmlFor="offer-file">
                Supporting File
                <input
                  id="offer-file"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e => setOffer({ ...offer, file: e.target.files?.[0] })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Next</button>
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
              <label htmlFor="application-file">
                Supporting File
                <input
                  id="application-file"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e => setApplication({ ...application, file: e.target.files?.[0] })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Next</button>
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
              <label htmlFor="account-file">
                Supporting File
                <input
                  id="account-file"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={e => setAccount({ ...account, file: e.target.files?.[0] })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Submit</button>
            </div>
          </form>
        </section>
      )}
      {step > 3 && <p className="form-message form-message--success">All steps completed.</p>}
    </div>
  );
};

export default MultiStepForm;
