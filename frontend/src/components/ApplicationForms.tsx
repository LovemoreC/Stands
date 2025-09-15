import React, { useState } from 'react';
import {
  submitOfferApplication,
  submitPropertyApplication,
  submitAccountApplication,
} from '../api/applications';

type Status = 'idle' | 'uploading' | 'success' | 'error';

export function OfferApplicationForm({
  token,
  realtor,
}: {
  token: string;
  realtor: string;
}) {
  const [id, setId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    try {
      await submitOfferApplication(token, {
        id: Number(id),
        realtor,
        property_id: Number(propertyId),
        file,
      });
      setStatus('success');
    } catch {
      setStatus('error');
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
      {status === 'error' && <p>Error</p>}
    </form>
  );
}

export function PropertyApplicationForm({
  token,
  realtor,
}: {
  token: string;
  realtor: string;
}) {
  const [id, setId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    try {
      await submitPropertyApplication(token, {
        id: Number(id),
        realtor,
        property_id: Number(propertyId),
        file,
      });
      setStatus('success');
    } catch {
      setStatus('error');
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
      {status === 'error' && <p>Error</p>}
    </form>
  );
}

export function AccountApplicationForm({
  token,
  realtor,
}: {
  token: string;
  realtor: string;
}) {
  const [id, setId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    try {
      await submitAccountApplication(token, {
        id: Number(id),
        realtor,
        file,
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={submit}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit">Submit Account App</button>
      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'success' && <p>Uploaded!</p>}
      {status === 'error' && <p>Error</p>}
    </form>
  );
}
