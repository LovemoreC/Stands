export interface UploadedFile {
  filename: string;
  content_type: string;
  content: string;
}

import apiFetch from './client';

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
  return apiFetch('/applications/offer', {
    method: 'POST',
    body: form,
  });
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
  return apiFetch('/applications/property', {
    method: 'POST',
    body: form,
  });
}

export async function submitAccountApplication(
  params: { id: number; realtor: string; details?: string; file: File },
) {
  const form = new FormData();
  form.append('id', String(params.id));
  form.append('realtor', params.realtor);
  if (params.details) form.append('details', params.details);
  form.append('file', params.file);
  return apiFetch('/applications/account', {
    method: 'POST',
    body: form,
  });
}
