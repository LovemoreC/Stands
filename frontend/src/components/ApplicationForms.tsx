import React, { useState } from 'react';
import {
  submitOfferApplication,
  submitPropertyApplication,
  submitAccountApplication,
} from '../api/applications';

type Status = 'idle' | 'uploading' | 'success' | 'error';

export function OfferApplicationForm({
  realtor,
}: {
  realtor: string;
}) {
  const [id, setId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    try {
      await submitOfferApplication({
        id: Number(id),
        realtor,
        property_id: Number(propertyId),
        file,
      });
      setStatus('success');
      setError('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to submit offer');
    }
  };

  return (
    <section className="form-section">
      <form className="form-card" onSubmit={submit}>
        <h3 className="form-title">Submit offer application</h3>
        <div className="form-fields">
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
          <input
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="Property ID"
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={status === 'uploading'}>
            Submit Offer
          </button>
        </div>
        {status === 'uploading' && (
          <p className="form-message form-message--info">Uploading...</p>
        )}
        {status === 'success' && (
          <p className="form-message form-message--success">Uploaded!</p>
        )}
        {status === 'error' && (
          <p className="form-message form-message--error">{error}</p>
        )}
      </form>
    </section>
  );
}

export function PropertyApplicationForm({
  realtor,
}: {
  realtor: string;
}) {
  const [id, setId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    try {
      await submitPropertyApplication({
        id: Number(id),
        realtor,
        property_id: Number(propertyId),
        file,
      });
      setStatus('success');
      setError('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to submit property app');
    }
  };

  return (
    <section className="form-section">
      <form className="form-card" onSubmit={submit}>
        <h3 className="form-title">Submit property application</h3>
        <div className="form-fields">
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
          <input
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="Property ID"
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={status === 'uploading'}>
            Submit Property App
          </button>
        </div>
        {status === 'uploading' && (
          <p className="form-message form-message--info">Uploading...</p>
        )}
        {status === 'success' && (
          <p className="form-message form-message--success">Uploaded!</p>
        )}
        {status === 'error' && (
          <p className="form-message form-message--error">{error}</p>
        )}
      </form>
    </section>
  );
}

export function AccountApplicationForm({
  realtor,
}: {
  realtor: string;
}) {
  const [id, setId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    try {
      await submitAccountApplication({
        id: Number(id),
        realtor,
        file,
      });
      setStatus('success');
      setError('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to submit account app');
    }
  };

  return (
    <section className="form-section">
      <form className="form-card" onSubmit={submit}>
        <h3 className="form-title">Submit account application</h3>
        <div className="form-fields">
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={status === 'uploading'}>
            Submit Account App
          </button>
        </div>
        {status === 'uploading' && (
          <p className="form-message form-message--info">Uploading...</p>
        )}
        {status === 'success' && (
          <p className="form-message form-message--success">Uploaded!</p>
        )}
        {status === 'error' && (
          <p className="form-message form-message--error">{error}</p>
        )}
      </form>
    </section>
  );
}
