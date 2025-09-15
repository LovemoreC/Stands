export interface UploadedFile {
  filename: string;
  content_type: string;
  content: string;
}

const authHeaders = (token: string) => ({ 'X-Token': token });

export async function submitOfferApplication(
  token: string,
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
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error('Failed to submit offer application');
  return res.json();
}

export async function submitPropertyApplication(
  token: string,
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
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error('Failed to submit property application');
  return res.json();
}

export async function submitAccountApplication(
  token: string,
  params: { id: number; realtor: string; details?: string; file: File },
) {
  const form = new FormData();
  form.append('id', String(params.id));
  form.append('realtor', params.realtor);
  if (params.details) form.append('details', params.details);
  form.append('file', params.file);
  const res = await fetch('/applications/account', {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error('Failed to submit account application');
  return res.json();
}
