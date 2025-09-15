import { useEffect, useState } from 'react';
import apiFetch from './client';

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

export async function listMandates(): Promise<Mandate[]> {
  return apiFetch('/mandates');
}

export async function createMandate(mandate: Mandate): Promise<Mandate> {
  return apiFetch('/mandates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mandate),
  });
}

export async function updateMandate(
  id: number,
  mandate: Mandate,
): Promise<Mandate> {
  return apiFetch(`/mandates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mandate),
  });
}

export async function getMandateHistory(
  id: number,
): Promise<MandateHistoryEntry[]> {
  return apiFetch(`/mandates/${id}/history`);
}

export function useMandates() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  useEffect(() => {
    listMandates().then(setMandates).catch(console.error);
  }, []);
  return { mandates, setMandates };
}
