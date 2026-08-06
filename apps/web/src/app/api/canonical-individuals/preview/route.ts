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

    return NextResponse.json({
      success: true,
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

    return NextResponse.json(
      {
        success: false,
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
