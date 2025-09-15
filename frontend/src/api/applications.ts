export interface UploadedFile {
  filename: string;
  content_type: string;
  content: string;
}

import { authHeaders } from './auth';

export async function submitOfferApplication(
  params: {
    id: number;
    realtor: string;
    property_id: number;
    details?: string;
    file: File;
  },
) {
  const form = new FormData();
  form.append('id', String(params.id));
  form.append('realtor', params.realtor);
  form.append('property_id', String(params.property_id));
  if (params.details) form.append('details', params.details);
  form.append('file', params.file);
  const res = await fetch('/applications/offer', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error('Failed to submit offer application');
  return res.json();
}

export async function submitPropertyApplication(
  params: {
    id: number;
    realtor: string;
    property_id: number;
    details?: string;
    file: File;
  },
) {
  const form = new FormData();
  form.append('id', String(params.id));
  form.append('realtor', params.realtor);
  form.append('property_id', String(params.property_id));
  if (params.details) form.append('details', params.details);
  form.append('file', params.file);
  const res = await fetch('/applications/property', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error('Failed to submit property application');
  return res.json();
}

export async function submitAccountApplication(
  params: { id: number; realtor: string; details?: string; file: File },
) {
  const form = new FormData();
  form.append('id', String(params.id));
  form.append('realtor', params.realtor);
  if (params.details) form.append('details', params.details);
  form.append('file', params.file);
  const res = await fetch('/applications/account', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error('Failed to submit account application');
  return res.json();
}
