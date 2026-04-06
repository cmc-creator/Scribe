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

export type CreateDocumentInput = Pick<Document, 'title' | 'description' | 'category' | 'owner_id' | 'expires_at' | 'tags'>;
export type UpdateDocumentInput = Partial<Pick<Document, 'title' | 'description' | 'category' | 'status' | 'expires_at' | 'tags'>>;
