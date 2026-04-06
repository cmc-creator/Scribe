export interface AuditLog {
  id: string;
  entity_type: 'document' | 'signature' | 'distribution' | 'citadel';
  entity_id: string;
  action: string;
  performed_by?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'created_at'>;
