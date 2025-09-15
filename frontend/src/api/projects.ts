import { useEffect, useState } from 'react';

export interface Project {
  id: number;
  name: string;
  description?: string;
}

export interface Stand {
  id: number;
  project_id: number;
  name: string;
  size: number;
  price: number;
  status?: string;
}

const jsonHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'X-Token': token,
});

export async function listProjects(token: string): Promise<Project[]> {
  const res = await fetch('/projects', { headers: jsonHeaders(token) });
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function createProject(token: string, project: Project): Promise<Project> {
  const res = await fetch('/projects', {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(token: string, id: number, project: Project): Promise<Project> {
  const res = await fetch(`/projects/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(token: string, id: number): Promise<Project> {
  const res = await fetch(`/projects/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}

export function useProjects(token: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    if (!token) return;
    listProjects(token).then(setProjects).catch(console.error);
  }, [token]);
  return { projects, setProjects };
}

export async function listStands(token: string, projectId: number): Promise<Stand[]> {
  const res = await fetch(`/projects/${projectId}/stands`, { headers: jsonHeaders(token) });
  if (!res.ok) throw new Error('Failed to load stands');
  return res.json();
}

export async function createStand(token: string, projectId: number, stand: Stand): Promise<Stand> {
  const res = await fetch(`/projects/${projectId}/stands`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to create stand');
  return res.json();
}

export async function updateStand(
  token: string,
  projectId: number,
  standId: number,
  stand: Stand,
): Promise<Stand> {
  const res = await fetch(`/projects/${projectId}/stands/${standId}`, {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to update stand');
  return res.json();
}

export async function deleteStand(token: string, projectId: number, standId: number): Promise<Stand> {
  const res = await fetch(`/projects/${projectId}/stands/${standId}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to delete stand');
  return res.json();
}

export function useProjectStands(token: string | undefined, projectId: number | undefined) {
  const [stands, setStands] = useState<Stand[]>([]);
  useEffect(() => {
    if (!token || projectId === undefined) return;
    listStands(token, projectId).then(setStands).catch(console.error);
  }, [token, projectId]);
  return { stands, setStands };
}
