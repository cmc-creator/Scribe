export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  category?: string;
  owner_id: string;
  current_version: number;
  status: 'draft' | 'active' | 'expired' | 'archived';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  tags?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  content_hash?: string;
  change_notes?: string;
  created_by: string;
  created_at: string;
}

export interface SignatureRequest {
  id: string;
  document_id: string;
  document_version_id: string;
  requester_id: string;
  recipient_email: string;
  recipient_name: string;
  status: 'pending' | 'signed' | 'declined' | 'expired';
  message?: string;
  expires_at?: string;
  signed_at?: string;
  signature_data?: string;
  created_at: string;
}

export interface ExpiryAlert {
  document_id: string;
  title: string;
  status: string;
  expires_at: string;
  days_until_expiry: number;
}

export interface DistributionRecord {
  id: string;
  document_id: string;
  document_version_id: string;
  sender_id: string;
  batch_id?: string;
  recipient_email: string;
  recipient_name?: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  sent_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
