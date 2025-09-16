const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

const apiUrl = (path: string) => {
  const normalizedBase = API_BASE.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const headers = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export async function getDashboard(token: string) {
  const res = await fetch(apiUrl('/dashboard'), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function getAuditLog(
  token: string,
  filters: { start?: string; end?: string; user?: string; action?: string } = {}
) {
  const params = new URLSearchParams(filters as Record<string, string>);
  const url = params.toString() ? `/audit-log?${params}` : '/audit-log';
  const res = await fetch(apiUrl(url), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load audit log');
  return res.json();
}

export async function getProjects(token: string) {
  const res = await fetch(apiUrl('/projects'), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function createProject(token: string, project: { id: number; name: string }) {
  const res = await fetch(apiUrl('/projects'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function getStands(token: string) {
  const res = await fetch(apiUrl('/stands/available'), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load stands');
  return res.json();
}

export async function createStand(token: string, stand: { id: number; project_id: number; name: string; size: number; price: number }) {
  const res = await fetch(apiUrl('/stands'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to create stand');
  return res.json();
}

export async function updateStand(token: string, id: number, stand: { project_id: number; name: string; size: number; price: number }) {
  const res = await fetch(apiUrl(`/stands/${id}`), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to update stand');
  return res.json();
}

export async function deleteStand(token: string, id: number) {
  const res = await fetch(apiUrl(`/stands/${id}`), {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error('Failed to delete stand');
  return res.json();
}

export async function assignMandate(token: string, standId: number, agent: string) {
  const res = await fetch(apiUrl(`/stands/${standId}/mandate`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ agent }),
  });
  if (!res.ok) throw new Error('Failed to assign mandate');
  return res.json();
}

export async function listMandates(token: string) {
  const res = await fetch(apiUrl('/mandates'), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load mandates');
  return res.json();
}

export async function createMandate(
  token: string,
  mandate: { id: number; project_id: number; agent: string; status?: string },
) {
  const res = await fetch(apiUrl('/mandates'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(mandate),
  });
  if (!res.ok) throw new Error('Failed to create mandate');
  return res.json();
}

export async function updateMandate(
  token: string,
  id: number,
  mandate: { id: number; project_id: number; agent: string; status: string },
) {
  const res = await fetch(apiUrl(`/mandates/${id}`), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(mandate),
  });
  if (!res.ok) throw new Error('Failed to update mandate');
  return res.json();
}

export async function getMandateHistory(token: string, id: number) {
  const res = await fetch(apiUrl(`/mandates/${id}/history`), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load mandate history');
  return res.json();
}

export async function submitOffer(
  token: string,
  offer: { id: number; realtor: string; property_id: number; details?: string; file?: File }
) {
  const opts: RequestInit = { method: 'POST' };
  if (offer.file) {
    const form = new FormData();
    form.append('id', String(offer.id));
    form.append('realtor', offer.realtor);
    form.append('property_id', String(offer.property_id));
    if (offer.details) form.append('details', offer.details);
    form.append('file', offer.file);
    opts.body = form;
    opts.headers = { Authorization: `Bearer ${token}` };
  } else {
    opts.body = JSON.stringify(offer);
    opts.headers = headers(token);
  }
  const res = await fetch(apiUrl('/offers'), opts);
  if (!res.ok) throw new Error('Failed to submit offer');
  return res.json();
}

export async function submitAccountOpening(
  token: string,
  req: { id: number; realtor: string; details?: string; file?: File }
) {
  const opts: RequestInit = { method: 'POST' };
  if (req.file) {
    const form = new FormData();
    form.append('id', String(req.id));
    form.append('realtor', req.realtor);
    if (req.details) form.append('details', req.details);
    form.append('file', req.file);
    opts.body = form;
    opts.headers = { Authorization: `Bearer ${token}` };
  } else {
    opts.body = JSON.stringify(req);
    opts.headers = headers(token);
  }
  const res = await fetch(apiUrl('/account-openings'), opts);
  if (!res.ok) throw new Error('Failed to submit account opening');
  return res.json();
}

export async function submitPropertyApplication(
  token: string,
  app: { id: number; realtor: string; property_id: number; details?: string; file?: File }
) {
  const opts: RequestInit = { method: 'POST' };
  if (app.file) {
    const form = new FormData();
    form.append('id', String(app.id));
    form.append('realtor', app.realtor);
    form.append('property_id', String(app.property_id));
    if (app.details) form.append('details', app.details);
    form.append('file', app.file);
    opts.body = form;
    opts.headers = { Authorization: `Bearer ${token}` };
  } else {
    opts.body = JSON.stringify(app);
    opts.headers = headers(token);
  }
  const res = await fetch(apiUrl('/property-applications'), opts);
  if (!res.ok) throw new Error('Failed to submit property application');
  return res.json();
}

export async function getAccountOpenings(token: string, status?: string) {
  const url = status ? `/account-openings?status=${status}` : '/account-openings';
  const res = await fetch(apiUrl(url), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load account openings');
  return res.json();
}

export async function getAccountOpening(token: string, id: number) {
  const res = await fetch(apiUrl(`/account-openings/${id}`), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load account opening');
  return res.json();
}

export async function openAccount(
  token: string,
  id: number,
  data: { account_number: string; deposit_threshold: number }
) {
  const res = await fetch(apiUrl(`/account-openings/${id}/open`), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to open account');
  return res.json();
}

export async function recordDeposit(token: string, id: number, amount: number) {
  const res = await fetch(apiUrl(`/account-openings/${id}/deposit`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('Failed to record deposit');
  return res.json();
}

export async function getPendingDeposits(token: string) {
  const res = await fetch(apiUrl('/accounts/deposits/pending'), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load pending deposits');
  return res.json();
}

export async function openDepositAccount(
  token: string,
  id: number,
  data: { account_number: string; deposit_threshold: number },
) {
  const res = await fetch(apiUrl(`/accounts/deposits/${id}/open`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to open account');
  return res.json();
}

export async function recordAccountDeposit(token: string, id: number, amount: number) {
  const res = await fetch(apiUrl(`/accounts/deposits/${id}/deposit`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('Failed to record deposit');
  return res.json();
}

export async function getLoanApplications(token: string, status?: string) {
  const url = status ? `/loan-applications?status=${status}` : '/loan-applications';
  const res = await fetch(apiUrl(url), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load loan applications');
  return res.json();
}

export async function decideLoanApplication(
  token: string,
  id: number,
  decision: { decision: string; reason?: string }
) {
  const res = await fetch(apiUrl(`/loan-applications/${id}/decision`), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(decision),
  });
  if (!res.ok) throw new Error('Failed to decide loan application');
  return res.json();
}

export async function generateAgreement(
  token: string,
  data: { id: number; loan_application_id: number; property_id: number }
) {
  const res = await fetch(apiUrl('/agreements'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to generate agreement');
  return res.json();
}

export async function signAgreement(
  token: string,
  id: number,
  documentUrl: string,
) {
  const res = await fetch(apiUrl(`/agreements/${id}/sign`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ document_url: documentUrl }),
  });
  if (!res.ok) throw new Error('Failed to sign agreement');
  return res.json();
}

export async function openLoanAccount(token: string, agreementId: number) {
  const res = await fetch(apiUrl('/loan-accounts'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ agreement_id: agreementId }),
  });
  if (!res.ok) throw new Error('Failed to open loan account');
  return res.json();
}

export async function submitLoan(
  token: string,
  loan: { id: number; borrower: string; amount: number }
) {
  const res = await fetch(apiUrl('/loans'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(loan),
  });
  if (!res.ok) throw new Error('Failed to submit loan');
  return res.json();
}

export async function getPendingLoans(token: string) {
  const res = await fetch(apiUrl('/loans/pending'), { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load loans');
  return res.json();
}

export async function decideLoan(
  token: string,
  id: number,
  decision: { decision: string; reason?: string }
) {
  const res = await fetch(apiUrl(`/loans/${id}/decision`), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(decision),
  });
  if (!res.ok) throw new Error('Failed to decide loan');
  return res.json();
}
