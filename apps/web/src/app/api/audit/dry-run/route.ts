import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import {
  AUDIT_TABLE_ID,
  mapAuditEntryToAirtable,
} from "@/features/audit/audit-airtable-mapper";

export const dynamic = "force-dynamic";

export async function GET() {
  const audit = AuditEntry.create({
    action:
      "individuals.audit.dry-run",
    outcome: "success",
    occurredAt: new Date(),
    processedCount: 5,
    successCount: 5,
    metadata: {
      mode: "dry-run",
    },
  });

  return NextResponse.json({
    success: true,
    mode: "dry-run",
    writesPerformed: 0,
    tableId: AUDIT_TABLE_ID,
    correlationId:
      audit.correlationId,
    payload:
      mapAuditEntryToAirtable(
        audit,
      ),
  });
}
