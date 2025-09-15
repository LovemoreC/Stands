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
    <form onSubmit={submit}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
      <input
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        placeholder="Property ID"
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit">Submit Offer</button>
      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'success' && <p>Uploaded!</p>}
      {status === 'error' && <p>{error}</p>}
    </form>
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
    <form onSubmit={submit}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
      <input
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        placeholder="Property ID"
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit">Submit Property App</button>
      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'success' && <p>Uploaded!</p>}
      {status === 'error' && <p>{error}</p>}
    </form>
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
    <form onSubmit={submit}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit">Submit Account App</button>
      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'success' && <p>Uploaded!</p>}
      {status === 'error' && <p>{error}</p>}
    </form>
  );
}
