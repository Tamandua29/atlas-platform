import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

import type {
  OperationalEntity,
  OperationalPriority,
} from "./operational-map.types";

type AirtableOccurrenceFields = {
  "ID Ocorrência"?: string;
  "Número da Ocorrência"?: string;
  "Data e Hora"?: string;
  Natureza?: string;
  Categoria?: string;
  Situação?: string;
  Descrição?: string;
  "Resultado Operacional"?: string;
  Fonte?: string;
  Confiabilidade?: string;
  Endereços?: string[];
};

type AirtableAddressFields = {
  "ID Endereço"?: string;
  "Endereço Completo"?: string;
  Logradouro?: string;
  Número?: string;
  Complemento?: string;
  Bairro?: string;
  Município?: string;
  Estado?: string;
  CEP?: string;
  Latitude?: number;
  Longitude?: number;
  "Situação da Verificação"?: string;
  Fonte?: string;
};

type AirtableRecord<Fields> = {
  id: string;
  createdTime: string;
  fields: Fields;
};

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    value !== null &&
    typeof value === "object" &&
    "name" in value
  ) {
    const namedValue = value as {
      name?: unknown;
    };

    if (typeof namedValue.name === "string") {
      return namedValue.name.trim();
    }
  }

  return "";
}

function determinePriority(
  occurrence: AirtableOccurrenceFields,
): OperationalPriority {
  const searchableText = [
    occurrence.Natureza,
    occurrence.Categoria,
    occurrence.Situação,
    occurrence.Descrição,
    occurrence["Resultado Operacional"],
  ]
    .map((value) =>
      normalizeText(value).toLowerCase(),
    )
    .join(" ");

  const highPriorityTerms = [
    "homicídio",
    "homicidio",
    "latrocínio",
    "latrocinio",
    "sequestro",
    "arma de fogo",
    "roubo",
    "tráfico",
    "trafico",
    "mandado",
    "foragido",
    "ameaça",
    "ameaca",
  ];

  const hasHighPriorityTerm =
    highPriorityTerms.some((term) =>
      searchableText.includes(term),
    );

  if (hasHighPriorityTerm) {
    return "high";
  }

  const mediumPriorityTerms = [
    "furto",
    "lesão corporal",
    "lesao corporal",
    "perturbação",
    "perturbacao",
    "dano",
    "suspeito",
    "averiguação",
    "averiguacao",
  ];

  const hasMediumPriorityTerm =
    mediumPriorityTerms.some((term) =>
      searchableText.includes(term),
    );

  if (hasMediumPriorityTerm) {
    return "medium";
  }

  return "normal";
}

function getValidCoordinates(
  latitude: unknown,
  longitude: unknown,
): [longitude: number, latitude: number] | null {
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  if (
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [longitude, latitude];
}

function buildAddressLabel(
  address: AirtableAddressFields,
): string {
  const fullAddress = normalizeText(
    address["Endereço Completo"],
  );

  if (fullAddress) {
    return fullAddress;
  }

  const street = normalizeText(
    address.Logradouro,
  );

  const number = normalizeText(
    address.Número,
  );

  const complement = normalizeText(
    address.Complemento,
  );

  const neighborhood = normalizeText(
    address.Bairro,
  );

  const city = normalizeText(
    address.Município,
  );

  const state = normalizeText(
    address.Estado,
  );

  const postalCode = normalizeText(
    address.CEP,
  );

  const streetAndNumber = [
    street,
    number,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    streetAndNumber,
    complement,
    neighborhood,
    city,
    state,
    postalCode,
  ]
    .filter(Boolean)
    .join(" — ");
}

function buildOccurrenceDescription(
  occurrence: AirtableOccurrenceFields,
): string {
  const description = normalizeText(
    occurrence.Descrição,
  );

  if (description) {
    return description;
  }

  const operationalResult = normalizeText(
    occurrence["Resultado Operacional"],
  );

  if (operationalResult) {
    return operationalResult;
  }

  return "Ocorrência operacional registrada no SIO.";
}

function buildOccurrenceTitle(
  occurrence: AirtableOccurrenceFields,
): string {
  const nature = normalizeText(
    occurrence.Natureza,
  );

  if (nature) {
    return nature;
  }

  const category = normalizeText(
    occurrence.Categoria,
  );

  if (category) {
    return category;
  }

  return "Ocorrência operacional";
}

function buildOccurrenceReference(
  occurrence: AirtableOccurrenceFields,
  recordId: string,
): string {
  const occurrenceNumber = normalizeText(
    occurrence["Número da Ocorrência"],
  );

  if (occurrenceNumber) {
    return occurrenceNumber;
  }

  const occurrenceId = normalizeText(
    occurrence["ID Ocorrência"],
  );

  if (occurrenceId) {
    return occurrenceId;
  }

  return recordId;
}

function buildCreatedAt(
  occurrence: AirtableOccurrenceFields,
  fallbackCreatedTime: string,
): string {
  const occurrenceDate = normalizeText(
    occurrence["Data e Hora"],
  );

  if (occurrenceDate) {
    const parsedDate = new Date(
      occurrenceDate,
    );

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  const fallbackDate = new Date(
    fallbackCreatedTime,
  );

  if (!Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate.toISOString();
  }

  return new Date(0).toISOString();
}

function mapOccurrenceToEntity(
  occurrenceRecord: AirtableRecord<AirtableOccurrenceFields>,
  addressRecord: AirtableRecord<AirtableAddressFields>,
): OperationalEntity | null {
  const coordinates = getValidCoordinates(
    addressRecord.fields.Latitude,
    addressRecord.fields.Longitude,
  );

  if (!coordinates) {
    return null;
  }

  const occurrence =
    occurrenceRecord.fields;

  const address =
    addressRecord.fields;

  const addressLabel =
    buildAddressLabel(address);

  const status =
    normalizeText(occurrence.Situação) ||
    "Sem classificação";

  return {
    id: occurrenceRecord.id,
    type: "occurrence",
    title: buildOccurrenceTitle(
      occurrence,
    ),
    description:
      buildOccurrenceDescription(
        occurrence,
      ),
    reference:
      buildOccurrenceReference(
        occurrence,
        occurrenceRecord.id,
      ),
    locationLabel:
      addressLabel ||
      "Localização não informada",
    coordinates,
    createdAt: buildCreatedAt(
      occurrence,
      occurrenceRecord.createdTime,
    ),
    priority:
      determinePriority(occurrence),
    status,
  };
}

export async function loadOperationalEntitiesFromAirtable(): Promise<
  OperationalEntity[]
> {
  const configuration =
    getAirtableConfiguration();

  const [
    occurrenceRecords,
    addressRecords,
  ] = await Promise.all([
    listAllAirtableRecords<AirtableOccurrenceFields>(
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
          "Resultado Operacional",
          "Fonte",
          "Confiabilidade",
          "Endereços",
        ],

        sort: [
          {
            field: "Data e Hora",
            direction: "desc",
          },
        ],
      },
    ),

    listAllAirtableRecords<AirtableAddressFields>(
      configuration.addressesTableId,
      {
        fields: [
          "ID Endereço",
          "Endereço Completo",
          "Logradouro",
          "Número",
          "Complemento",
          "Bairro",
          "Município",
          "Estado",
          "CEP",
          "Latitude",
          "Longitude",
          "Situação da Verificação",
          "Fonte",
        ],
      },
    ),
  ]);

  const addressesByRecordId = new Map<
    string,
    AirtableRecord<AirtableAddressFields>
  >(
    addressRecords.map((record) => [
      record.id,
      record,
    ]),
  );

  const entities: OperationalEntity[] =
    [];

  for (
    const occurrenceRecord of
    occurrenceRecords
  ) {
    const linkedAddressIds =
      occurrenceRecord.fields.Endereços ??
      [];

    for (
      const addressId of linkedAddressIds
    ) {
      const addressRecord =
        addressesByRecordId.get(
          addressId,
        );

      if (!addressRecord) {
        continue;
      }

      const entity =
        mapOccurrenceToEntity(
          occurrenceRecord,
          addressRecord,
        );

      if (!entity) {
        continue;
      }

      entities.push(entity);

      // Nesta fase, cada ocorrência será
      // representada pelo primeiro endereço
      // georreferenciado válido.
      break;
    }
  }

  return entities.sort(
    (
      firstEntity,
      secondEntity,
    ) =>
      new Date(
        secondEntity.createdAt,
      ).getTime() -
      new Date(
        firstEntity.createdAt,
      ).getTime(),
  );
}