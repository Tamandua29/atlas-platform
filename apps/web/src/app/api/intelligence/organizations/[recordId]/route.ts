import { AuditEntry } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { getOrganizationProfile } from "@/features/intelligence/organization-profile";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ recordId: string }> },
) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { recordId } = await context.params;
  const correlationId = crypto.randomUUID();

  if (!/^rec[a-zA-Z0-9]+$/.test(recordId)) {
    return NextResponse.json(
      {
        success: false,
        correlationId,
        message: "Identificador de organização inválido.",
      },
      { status: 400 },
    );
  }

  try {
    const organization = await getOrganizationProfile(recordId);
    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          correlationId,
          message: "Organização não localizada.",
        },
        { status: 404 },
      );
    }

    const auditPersisted = await persistAuditSafely(
      AuditEntry.create({
        action: "intelligence.organizations.profile",
        outcome: "success",
        occurredAt: new Date(),
        correlationId,
        processedCount: 1,
        successCount: 1,
        metadata: {
          actorId: authorization.session.actorId,
          actorRole: authorization.session.role,
          organizationRecordId: recordId,
          explicitLinkCount: organization.links.length,
          mode: "protected-organization-profile",
        },
      }),
    );

    return NextResponse.json(
      { success: true, auditPersisted, correlationId, organization },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        correlationId,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
