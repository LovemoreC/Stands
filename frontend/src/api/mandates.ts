import { useEffect, useState } from 'react';
import { authHeaders } from './auth';

export interface Mandate {
  id: number;
  project_id: number;
  agent: string;
  status: string;
  document?: string;
  agreement_status?: string;
  expiration_date?: string;
}

export interface MandateHistoryEntry {
  timestamp: string;
  status: string;
}

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

export async function listMandates(): Promise<Mandate[]> {
  const res = await fetch('/mandates', { headers: jsonHeaders() });
  if (!res.ok) throw new Error('Failed to load mandates');
  return res.json();
}

export async function createMandate(mandate: Mandate): Promise<Mandate> {
  const res = await fetch('/mandates', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(mandate),
  });
  if (!res.ok) throw new Error('Failed to create mandate');
  return res.json();
}

export async function updateMandate(id: number, mandate: Mandate): Promise<Mandate> {
  const res = await fetch(`/mandates/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(mandate),
  });
  if (!res.ok) throw new Error('Failed to update mandate');
  return res.json();
}

export async function getMandateHistory(id: number): Promise<MandateHistoryEntry[]> {
  const res = await fetch(`/mandates/${id}/history`, { headers: jsonHeaders() });
  if (!res.ok) throw new Error('Failed to load mandate history');
  return res.json();
}

export function useMandates() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  useEffect(() => {
    listMandates().then(setMandates).catch(console.error);
  }, []);
  return { mandates, setMandates };
}
