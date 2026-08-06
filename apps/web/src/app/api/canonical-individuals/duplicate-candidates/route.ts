import { NextResponse } from "next/server";

import { previewDuplicateCandidatesFromAirtable } from "@/features/individuals/duplicate-candidates-preview";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const candidates =
      await previewDuplicateCandidatesFromAirtable();

    return NextResponse.json({
      success: true,
      mode:
        "read-only-human-review",
      count: candidates.length,
      candidates,
      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Falha ao analisar candidatos a duplicidade:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        mode:
          "read-only-human-review",
        count: 0,
        candidates: [],
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido na análise de duplicidades.",
      },
      {
        status: 500,
      },
    );
  }
}
