import { useEffect, useState } from 'react';
import { authHeaders } from './auth';

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

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

export async function listProjects(): Promise<Project[]> {
  const res = await fetch('/projects', { headers: jsonHeaders() });
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function createProject(project: Project): Promise<Project> {
  const res = await fetch('/projects', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id: number, project: Project): Promise<Project> {
  const res = await fetch(`/projects/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: number): Promise<Project> {
  const res = await fetch(`/projects/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    listProjects().then(setProjects).catch(console.error);
  }, []);
  return { projects, setProjects };
}

export async function listStands(projectId: number): Promise<Stand[]> {
  const res = await fetch(`/projects/${projectId}/stands`, { headers: jsonHeaders() });
  if (!res.ok) throw new Error('Failed to load stands');
  return res.json();
}

export async function createStand(projectId: number, stand: Stand): Promise<Stand> {
  const res = await fetch(`/projects/${projectId}/stands`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to create stand');
  return res.json();
}

export async function updateStand(
  projectId: number,
  standId: number,
  stand: Stand,
): Promise<Stand> {
  const res = await fetch(`/projects/${projectId}/stands/${standId}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(stand),
  });
  if (!res.ok) throw new Error('Failed to update stand');
  return res.json();
}

export async function deleteStand(projectId: number, standId: number): Promise<Stand> {
  const res = await fetch(`/projects/${projectId}/stands/${standId}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete stand');
  return res.json();
}

export function useProjectStands(projectId: number | undefined) {
  const [stands, setStands] = useState<Stand[]>([]);
  useEffect(() => {
    if (projectId === undefined) return;
    listStands(projectId).then(setStands).catch(console.error);
  }, [projectId]);
  return { stands, setStands };
}
