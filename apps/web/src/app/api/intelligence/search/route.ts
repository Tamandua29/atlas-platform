import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listIndividualDirectory } from "@/features/intelligence/individual-directory";
import { listOperationalWarrants } from "@/features/intelligence/individual-warrants";
import { listOrganizationDirectory } from "@/features/intelligence/organization-directory";
import { isUnifiedSearchCategory, searchUnifiedIntelligence, validateUnifiedSearchQuery } from "@/features/intelligence/unified-search";
import { listVehicleDirectory } from "@/features/intelligence/vehicle-directory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;
  const correlationId = crypto.randomUUID();
  const validation = validateUnifiedSearchQuery(request.nextUrl.searchParams.get("q") || "");
  const rawCategory = request.nextUrl.searchParams.get("category") || "all";
  if (!validation.valid) return NextResponse.json({ success: false, correlationId, message: validation.message }, { status: 400 });
  if (!isUnifiedSearchCategory(rawCategory)) return NextResponse.json({ success: false, correlationId, message: "Categoria de pesquisa inválida." }, { status: 400 });

  try {
    const [individuals, organizations, vehicles, warrants] = await Promise.all([
      listIndividualDirectory(100), listOrganizationDirectory(200), listVehicleDirectory(200), listOperationalWarrants(200),
    ]);
    const results = searchUnifiedIntelligence({ individuals, organizations, vehicles, warrants }, validation.query, rawCategory);
    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.unified-search.query", outcome: "success", occurredAt: new Date(), correlationId,
      processedCount: results.length, successCount: results.length,
      metadata: { actorId: authorization.session.actorId, actorRole: authorization.session.role, mode: "protected-unified-search", queryLength: validation.query.length, category: rawCategory, resultCount: results.length },
    }));
    return NextResponse.json({ success: true, auditPersisted, correlationId, query: { length: validation.query.length, category: rawCategory }, count: results.length, results }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json(
      { success: false, correlationId, message: "Não foi possível concluir a pesquisa protegida." },
      { status: 500 },
    );
  }
}
