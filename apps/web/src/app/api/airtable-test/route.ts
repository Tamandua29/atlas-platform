import { NextResponse } from "next/server";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type AirtableOccurrenceFields = {
  "ID Ocorrência"?: string;
  "Número da Ocorrência"?: string;
  "Data e Hora"?: string;
  Natureza?: string;
  Categoria?: string;
  Situação?: string;
  Descrição?: string;
};

export async function GET() {
  try {
    const configuration = getAirtableConfiguration();

    const records =
      await listAllAirtableRecords<AirtableOccurrenceFields>(
        configuration.occurrencesTableId,
        {
          fields: [
            "ID Ocorrência",
            "Número da Ocorrência",
            "Data e Hora",
            "Natureza",
            "Categoria",
            "Situação",
            "Descrição",
          ],
          maxRecords: 5,
        },
      );

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Falha no teste do Airtable:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao consultar o Airtable.",
      },
      {
        status: 500,
      },
    );
  }
}