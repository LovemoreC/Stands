export const headers = (token: string) => ({
  'Content-Type': 'application/json',
  'X-Token': token,
});

export async function getProjects(token: string) {
  const res = await fetch('/projects', { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function createProject(token: string, project: { id: number; name: string }) {
  const res = await fetch('/projects', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function getStands(token: string) {
  const res = await fetch('/stands/available', { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to load stands');
  return res.json();
}

export async function createStand(token: string, stand: { id: number; project_id: number; name: string; size: number; price: number }) {
  const res = await fetch('/stands', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to create stand');
  return res.json();
}

export async function updateStand(token: string, id: number, stand: { project_id: number; name: string; size: number; price: number }) {
  const res = await fetch(`/stands/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to update stand');
  return res.json();
}

export async function deleteStand(token: string, id: number) {
  const res = await fetch(`/stands/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) throw new Error('Failed to delete stand');
  return res.json();
}

export async function assignMandate(token: string, standId: number, agent: string) {
  const res = await fetch(`/stands/${standId}/mandate`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ agent }),
  });
  if (!res.ok) throw new Error('Failed to assign mandate');
  return res.json();
}

export async function submitOffer(
  token: string,
  offer: { id: number; realtor: string; property_id: number; details?: string }
) {
  const res = await fetch('/offers', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(offer),
  });
  if (!res.ok) throw new Error('Failed to submit offer');
  return res.json();
}

export async function submitAccountOpening(
  token: string,
  req: { id: number; realtor: string; details?: string }
) {
  const res = await fetch('/account-openings', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Failed to submit account opening');
  return res.json();
}

export async function submitPropertyApplication(
  token: string,
  app: { id: number; realtor: string; property_id: number; details?: string }
) {
  const res = await fetch('/property-applications', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(app),
  });
  if (!res.ok) throw new Error('Failed to submit property application');
  return res.json();
}
