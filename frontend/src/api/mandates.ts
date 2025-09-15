import { useEffect, useState } from 'react';

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

const jsonHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'X-Token': token,
});

export async function listMandates(token: string): Promise<Mandate[]> {
  const res = await fetch('/mandates', { headers: jsonHeaders(token) });
  if (!res.ok) throw new Error('Failed to load mandates');
  return res.json();
}

export async function createMandate(token: string, mandate: Mandate): Promise<Mandate> {
  const res = await fetch('/mandates', {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(mandate),
  });
  if (!res.ok) throw new Error('Failed to create mandate');
  return res.json();
}

export async function updateMandate(token: string, id: number, mandate: Mandate): Promise<Mandate> {
  const res = await fetch(`/mandates/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify(mandate),
  });
  if (!res.ok) throw new Error('Failed to update mandate');
  return res.json();
}

export async function getMandateHistory(token: string, id: number): Promise<MandateHistoryEntry[]> {
  const res = await fetch(`/mandates/${id}/history`, { headers: jsonHeaders(token) });
  if (!res.ok) throw new Error('Failed to load mandate history');
  return res.json();
}

export function useMandates(token: string | undefined) {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  useEffect(() => {
    if (!token) return;
    listMandates(token).then(setMandates).catch(console.error);
  }, [token]);
  return { mandates, setMandates };
}
