import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listAddressesForIndividual } from "@/features/intelligence/individual-addresses";
import { getIndividualDirectoryEntry } from "@/features/intelligence/individual-directory";
import { listOccurrencesForIndividual } from "@/features/intelligence/individual-occurrences";
import { listPhonesForIndividual } from "@/features/intelligence/individual-phones";
import { listPhotosForIndividual } from "@/features/intelligence/individual-photos";
import { listVehiclesForIndividual } from "@/features/intelligence/individual-vehicles";
import { listWarrantsForIndividual } from "@/features/intelligence/individual-warrants";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ recordId: string }> },
) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { recordId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const [individual, addresses, phones, vehicles, warrants, photos, occurrences] = await Promise.all([
      getIndividualDirectoryEntry(recordId),
      listAddressesForIndividual(recordId),
      listPhonesForIndividual(recordId),
      listVehiclesForIndividual(recordId),
      listWarrantsForIndividual(recordId),
      listPhotosForIndividual(recordId),
      listOccurrencesForIndividual(recordId),
    ]);

    if (!individual) {
      return NextResponse.json(
        { success: false, correlationId, message: "Indivíduo não encontrado." },
        { status: 404 },
      );
    }

    const relationshipCount = addresses.length
      + phones.length
      + vehicles.length
      + warrants.length
      + photos.length
      + occurrences.length;

    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.individuals.profile",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1 + relationshipCount,
      successCount: 1 + relationshipCount,
      metadata: {
        actorId: authorization.session.actorId,
        actorRole: authorization.session.role,
        recordId,
        addressCount: addresses.length,
        phoneCount: phones.length,
        vehicleCount: vehicles.length,
        warrantCount: warrants.length,
        photoCount: photos.length,
        occurrenceCount: occurrences.length,
        mode: "protected-individual-profile",
      },
    }));

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        individual,
        relationships: { addresses, phones, vehicles, warrants, photos, occurrences },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, correlationId, message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
