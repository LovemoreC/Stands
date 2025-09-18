import { useEffect, useState } from 'react';
import apiFetch from './client';

export interface Project {
  id: number;
  name: string;
  description?: string;
}

export type ProjectCreate = Omit<Project, 'id'>;

export interface Stand {
  id: number;
  project_id: number;
  name: string;
  size: number;
  price: number;
  status?: string;
}

export type StandCreate = Omit<Stand, 'id'>;

export async function listProjects(): Promise<Project[]> {
  return apiFetch('/projects');
}

export async function createProject(project: ProjectCreate): Promise<Project> {
  return apiFetch('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
}

export async function updateProject(
  id: number,
  project: Project,
): Promise<Project> {
  return apiFetch(`/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
}

export async function deleteProject(id: number): Promise<Project> {
  return apiFetch(`/projects/${id}`, { method: 'DELETE' });
}

export interface ImportPropertiesResult {
  message?: string;
  imported?: number;
}

export async function importProperties(file: File): Promise<ImportPropertiesResult> {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch('/import/properties', {
    method: 'POST',
    body: formData,
  });
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    listProjects().then(setProjects).catch(console.error);
  }, []);
  return { projects, setProjects };
}

export async function listStands(projectId: number): Promise<Stand[]> {
  return apiFetch(`/projects/${projectId}/stands`);
}

export async function createStand(
  projectId: number,
  stand: StandCreate,
): Promise<Stand> {
  return apiFetch(`/projects/${projectId}/stands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stand),
  });
}

export async function updateStand(
  projectId: number,
  standId: number,
  stand: Stand,
): Promise<Stand> {
  return apiFetch(`/projects/${projectId}/stands/${standId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stand),
  });
}

export async function deleteStand(
  projectId: number,
  standId: number,
): Promise<Stand> {
  return apiFetch(`/projects/${projectId}/stands/${standId}`, {
    method: 'DELETE',
  });
}

export function useProjectStands(projectId: number | undefined) {
  const [stands, setStands] = useState<Stand[]>([]);
  useEffect(() => {
    if (projectId === undefined) return;
    listStands(projectId).then(setStands).catch(console.error);
  }, [projectId]);
  return { stands, setStands };
}
