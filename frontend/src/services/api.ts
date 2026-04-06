import { ApiResponse, Document, DocumentVersion, SignatureRequest, ExpiryAlert, DistributionRecord } from '../types';

const BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3001/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers ?? {}) as Record<string, string>,
    },
  });
  return response.json() as Promise<ApiResponse<T>>;
}

// Documents
export const documentsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Document[]>(`/documents${qs}`);
  },
  get: (id: string) => request<Document>(`/documents/${id}`),
  create: (data: Partial<Document>) =>
    request<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Document>) =>
    request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archive: (id: string) =>
    request<{ archived: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  getVersions: (id: string) => request<DocumentVersion[]>(`/documents/${id}/versions`),
  getSignatures: (id: string) => request<SignatureRequest[]>(`/documents/${id}/signatures`),
  uploadVersion: (id: string, formData: FormData) =>
    fetch(`${BASE_URL}/documents/${id}/versions`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    }).then((r) => r.json()) as Promise<ApiResponse<DocumentVersion>>,
};

// Signatures
export const signaturesApi = {
  createRequest: (data: Partial<SignatureRequest>) =>
    request<SignatureRequest>('/signatures/request', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<SignatureRequest>(`/signatures/${id}`),
  sign: (id: string, signatureData: string) =>
    request<SignatureRequest>(`/signatures/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature_data: signatureData }),
    }),
  decline: (id: string) =>
    request<SignatureRequest>(`/signatures/${id}/decline`, { method: 'POST' }),
};

// Alerts
export const alertsApi = {
  getAlerts: (days?: number) =>
    request<ExpiryAlert[]>(`/alerts${days !== undefined ? `?days=${days}` : ''}`),
  getUpcoming: (days?: number) =>
    request<ExpiryAlert[]>(`/alerts/upcoming${days !== undefined ? `?days=${days}` : ''}`),
  acknowledge: (documentId: string) =>
    request<{ acknowledged: boolean }>(`/alerts/${documentId}/acknowledge`, { method: 'POST' }),
};

// Distribution
export const distributionApi = {
  send: (data: {
    document_id: string;
    document_version_id: string;
    sender_id: string;
    recipient_email: string;
    recipient_name?: string;
  }) => request<DistributionRecord>('/distribution/send', { method: 'POST', body: JSON.stringify(data) }),
  bulk: (data: {
    document_id: string;
    document_version_id: string;
    sender_id: string;
    recipients: { email: string; name?: string }[];
  }) =>
    request<{ batch_id: string; records: DistributionRecord[] }>('/distribution/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getBatches: () =>
    request<{ batch_id: string; sent_at: string; total: number }[]>('/distribution/batches'),
  getBatchStatus: (batchId: string) =>
    request<DistributionRecord[]>(`/distribution/batches/${batchId}`),
};

// Citadel
export const citadelApi = {
  check: (documentId: string) =>
    request<unknown>(`/citadel/check/${documentId}`, { method: 'POST' }),
  getStatus: (documentId: string) => request<unknown>(`/citadel/status/${documentId}`),
  sync: () => request<{ synced: number; errors: number }>('/citadel/sync', { method: 'POST' }),
};
