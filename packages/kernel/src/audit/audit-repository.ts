import type { AuditEntry } from "./audit-entry";

export interface AuditRepository {
  save(entry: AuditEntry): Promise<void>;
}
