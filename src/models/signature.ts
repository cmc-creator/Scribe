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
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type CreateSignatureRequestInput = Pick<
  SignatureRequest,
  'document_id' | 'document_version_id' | 'requester_id' | 'recipient_email' | 'recipient_name' | 'message' | 'expires_at'
>;
