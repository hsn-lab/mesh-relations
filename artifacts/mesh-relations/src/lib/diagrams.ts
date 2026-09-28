export type DiagramRelation = 'neutral' | 'negative' | 'positive';

export type DiagramNode = {
  id: string;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
};

export type DiagramSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Diagram = DiagramSummary & {
  nodes: DiagramNode[];
  relations: Record<string, DiagramRelation>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep the status-based message when the server has no JSON error body.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listDiagrams() {
  return request<DiagramSummary[]>('/diagrams');
}

export function getDiagram(id: string) {
  return request<Diagram>(`/diagrams/${encodeURIComponent(id)}`);
}

export function createDiagram(payload: Pick<Diagram, 'name' | 'nodes' | 'relations'>) {
  return request<Diagram>('/diagrams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDiagram(id: string, payload: Pick<Diagram, 'name' | 'nodes' | 'relations'>) {
  return request<Diagram>(`/diagrams/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDiagram(id: string) {
  return request<void>(`/diagrams/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}