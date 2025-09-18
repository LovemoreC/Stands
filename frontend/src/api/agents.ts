import apiFetch from './client';

export type AgentRole = 'admin' | 'agent' | 'manager' | 'compliance';

export interface Agent {
  username: string;
  role: AgentRole;
}

export interface AgentCreate {
  username: string;
  role: AgentRole;
  password: string;
}

export const AGENT_ROLES: AgentRole[] = ['admin', 'manager', 'compliance', 'agent'];

export async function listAgents(): Promise<Agent[]> {
  return apiFetch('/agents');
}

export async function createAgent(agent: AgentCreate): Promise<Agent> {
  return apiFetch('/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });
}
