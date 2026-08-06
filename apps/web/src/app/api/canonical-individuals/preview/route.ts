import { AuditEntry } from "@atlas/kernel";

import { NextResponse } from "next/server";

import { previewCanonicalIndividualsFromAirtable } from "@/features/individuals/canonical-individual-preview";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const individuals =
      await previewCanonicalIndividualsFromAirtable(
        5,
      );

    const audit = AuditEntry.create({
      action: "individuals.canonical.preview",
      outcome: "success",
      occurredAt: new Date(),
      processedCount: individuals.length,
      successCount: individuals.length,
      metadata: {
        mode: "read-only",
      },
    });

    return NextResponse.json({
      success: true,
      correlationId:
        audit.correlationId,
      mode: "read-only-preview",
      count: individuals.length,
      individuals,
      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Falha ao gerar prévia canônica de indivíduos:",
      error,
    );

    const audit = AuditEntry.create({
      action: "individuals.canonical.preview",
      outcome: "failure",
      occurredAt: new Date(),
      processedCount: 0,
      failureCount: 1,
      metadata: {
        mode: "read-only",
      },
    });

    return NextResponse.json(
      {
        success: false,
        correlationId:
          audit.correlationId,
        mode: "read-only-preview",
        count: 0,
        individuals: [],
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar a prévia.",
      },
      {
        status: 500,
      },
    );
  }
}
