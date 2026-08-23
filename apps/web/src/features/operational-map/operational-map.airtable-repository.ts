import "server-only";

import { createHash } from "node:crypto";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";
import { maskVehiclePlate } from "@/features/intelligence/vehicle-directory-policy";
import { classifyWarrantAttention } from "@/features/intelligence/warrant-monitoring";

import { isCoordinateConsistentWithNeighborhood } from "./geographic-consistency";
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

type AirtableAddressFields = Record<string, unknown> & {
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

type AirtableIndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
};

type AirtableVehicleFields = Record<string, unknown> & {
  Placa?: string;
  Marca?: string;
  Modelo?: string;
  Cor?: string;
  Ano?: number;
  Situação?: string;
  "Tipo de Vínculo"?: string;
  "Data da Informação"?: string;
  Endereços?: string[];
};

type AirtableWarrantFields = Record<string, unknown> & {
  "Número do Mandado"?: string;
  "Número do Processo"?: string;
  "Tipo de Mandado"?: string;
  "Data de Emissão"?: string;
  "Data de Validade"?: string;
  "Status do Mandado"?: string;
  Endereços?: string[];
};

type AirtableOrganizationFields = {
  "Nome da Organização"?: string;
  Sigla?: string;
  Tipo?: string;
  Situação?: string;
};

type AirtableOrganizationalLinkFields = {
  Indivíduo?: string[];
  Organização?: string[];
  "Registro Ativo"?: boolean;
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

  if (value !== null && typeof value === "object" && "name" in value) {
    const namedValue = value as {
      name?: unknown;
    };

    if (typeof namedValue.name === "string") {
      return namedValue.name.trim();
    }
  }

  return "";
}

function relationshipKey(kind: string, recordId: string): string {
  return createHash("sha256")
    .update(`${kind}:${recordId}`)
    .digest("hex")
    .slice(0, 20);
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
    .map((value) => normalizeText(value).toLowerCase())
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

  const hasHighPriorityTerm = highPriorityTerms.some((term) =>
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

  const hasMediumPriorityTerm = mediumPriorityTerms.some((term) =>
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

function linkedIndividualRecordIds(
  address: AirtableAddressFields,
  individualRecordIds: Set<string>,
): string[] {
  const linkedIds = new Set<string>();

  for (const value of Object.values(address)) {
    if (!Array.isArray(value)) {
      continue;
    }

    for (const candidate of value) {
      if (typeof candidate === "string" && individualRecordIds.has(candidate)) {
        linkedIds.add(candidate);
      }
    }
  }

  return [...linkedIds];
}

function linkedRecordIds(
  fields: Record<string, unknown>,
  allowedRecordIds: Set<string>,
): string[] {
  const linkedIds = new Set<string>();

  for (const value of Object.values(fields)) {
    if (!Array.isArray(value)) continue;

    for (const candidate of value) {
      if (typeof candidate === "string" && allowedRecordIds.has(candidate)) {
        linkedIds.add(candidate);
      }
    }
  }

  return [...linkedIds];
}

function maskReference(value: unknown, fallback: string): string {
  const reference = normalizeText(value).replace(/\s/g, "");
  if (!reference) return fallback;
  if (reference.length <= 4) return "•".repeat(reference.length);
  return `${"•".repeat(Math.min(reference.length - 4, 10))}${reference.slice(-4)}`;
}

function mapWarrantToAlert(
  warrantRecord: AirtableRecord<AirtableWarrantFields>,
  addressRecord: AirtableRecord<AirtableAddressFields>,
  now = new Date(),
): OperationalEntity | null {
  const coordinates = getValidCoordinates(
    addressRecord.fields.Latitude,
    addressRecord.fields.Longitude,
  );

  if (
    !coordinates ||
    !isCoordinateConsistentWithNeighborhood({
      neighborhood: addressRecord.fields.Bairro,
      latitude: coordinates[1],
      longitude: coordinates[0],
    })
  ) {
    return null;
  }

  const status = normalizeText(warrantRecord.fields["Status do Mandado"]);
  const expiresAt = normalizeText(warrantRecord.fields["Data de Validade"]);
  const attention = classifyWarrantAttention(
    status || null,
    expiresAt || null,
    now,
  );
  if (attention !== "active" && attention !== "expiring") return null;

  const issuedAt = normalizeText(warrantRecord.fields["Data de Emissão"]);
  const parsedIssuedAt = issuedAt ? new Date(issuedAt) : null;
  const warrantType = normalizeText(warrantRecord.fields["Tipo de Mandado"]);
  const maskedWarrant = maskReference(
    warrantRecord.fields["Número do Mandado"],
    "Mandado sem referência",
  );
  const maskedCase = maskReference(
    warrantRecord.fields["Número do Processo"],
    "Processo não informado",
  );

  return {
    id: `alert:${warrantRecord.id}:${addressRecord.id}`,
    type: "alert",
    title: warrantType || "Mandado sob monitoramento",
    description: `${maskedWarrant} — ${maskedCase}`,
    coordinates,
    createdAt:
      parsedIssuedAt && !Number.isNaN(parsedIssuedAt.getTime())
        ? parsedIssuedAt.toISOString()
        : warrantRecord.createdTime,
    priority: attention === "expiring" ? "high" : "medium",
    status: status || "Vigência requer verificação",
    reference: warrantRecord.id,
    locationLabel:
      buildAddressLabel(addressRecord.fields) || "Localização não informada",
    relationshipKeys: [relationshipKey("address", addressRecord.id)],
  };
}

function mapIndividualToEntity(
  individualRecord: AirtableRecord<AirtableIndividualFields>,
  addressRecord: AirtableRecord<AirtableAddressFields>,
): OperationalEntity | null {
  const legalName = normalizeText(individualRecord.fields["Nome Completo"]);
  const coordinates = getValidCoordinates(
    addressRecord.fields.Latitude,
    addressRecord.fields.Longitude,
  );

  if (!legalName || !coordinates) {
    return null;
  }

  const neighborhood = normalizeText(addressRecord.fields.Bairro);

  if (
    !isCoordinateConsistentWithNeighborhood({
      neighborhood: neighborhood || null,
      latitude: coordinates[1],
      longitude: coordinates[0],
    })
  ) {
    return null;
  }

  const alias = normalizeText(individualRecord.fields["Vulgo Principal"]);
  const verificationStatus = normalizeText(
    addressRecord.fields["Situação da Verificação"],
  );

  return {
    id: `person:${individualRecord.id}:${addressRecord.id}`,
    type: "person",
    title: legalName,
    description: alias
      ? `Vulgo: ${alias}`
      : "Pessoa vinculada ao endereço georreferenciado.",
    coordinates,
    createdAt: individualRecord.createdTime,
    priority: "normal",
    status: verificationStatus || "Localização vinculada",
    reference: individualRecord.id,
    locationLabel:
      buildAddressLabel(addressRecord.fields) || "Localização não informada",
    relationshipKeys: [
      relationshipKey("individual", individualRecord.id),
      relationshipKey("address", addressRecord.id),
    ],
  };
}

function mapOrganizationToEntity(
  organizationRecord: AirtableRecord<AirtableOrganizationFields>,
  addressRecord: AirtableRecord<AirtableAddressFields>,
  individualRecordId: string,
): OperationalEntity | null {
  const name = normalizeText(organizationRecord.fields["Nome da Organização"]);
  const coordinates = getValidCoordinates(
    addressRecord.fields.Latitude,
    addressRecord.fields.Longitude,
  );

  if (
    !name ||
    !coordinates ||
    !isCoordinateConsistentWithNeighborhood({
      neighborhood: addressRecord.fields.Bairro,
      latitude: coordinates[1],
      longitude: coordinates[0],
    })
  ) {
    return null;
  }

  const acronym = normalizeText(organizationRecord.fields.Sigla);
  const organizationType = normalizeText(organizationRecord.fields.Tipo);
  const status =
    normalizeText(organizationRecord.fields.Situação) ||
    "Situação não informada";

  return {
    id: `organization:${organizationRecord.id}:${addressRecord.id}`,
    type: "organization",
    title: acronym ? `${name} (${acronym})` : name,
    description: organizationType || "Organização explicitamente vinculada.",
    coordinates,
    createdAt: organizationRecord.createdTime,
    priority: "normal",
    status,
    reference: organizationRecord.id,
    locationLabel:
      buildAddressLabel(addressRecord.fields) || "Localização não informada",
    relationshipKeys: [
      relationshipKey("organization", organizationRecord.id),
      relationshipKey("individual", individualRecordId),
      relationshipKey("address", addressRecord.id),
    ],
  };
}

function vehiclePriority(fields: AirtableVehicleFields): OperationalPriority {
  const status = normalizeText(fields.Situação).toLocaleLowerCase("pt-BR");

  if (
    ["roubad", "furtad", "procurad", "apreendid"].some((term) =>
      status.includes(term),
    )
  ) {
    return "high";
  }

  if (
    ["suspeit", "restrição", "restricao", "irregular"].some((term) =>
      status.includes(term),
    )
  ) {
    return "medium";
  }

  return "normal";
}

function mapVehicleToEntity(
  vehicleRecord: AirtableRecord<AirtableVehicleFields>,
  addressRecord: AirtableRecord<AirtableAddressFields>,
  individualRecordIds: string[],
): OperationalEntity | null {
  const coordinates = getValidCoordinates(
    addressRecord.fields.Latitude,
    addressRecord.fields.Longitude,
  );

  if (
    !coordinates ||
    !isCoordinateConsistentWithNeighborhood({
      neighborhood: addressRecord.fields.Bairro,
      latitude: coordinates[1],
      longitude: coordinates[0],
    })
  ) {
    return null;
  }

  const brand = normalizeText(vehicleRecord.fields.Marca);
  const model = normalizeText(vehicleRecord.fields.Modelo);
  const color = normalizeText(vehicleRecord.fields.Cor);
  const relationshipType = normalizeText(
    vehicleRecord.fields["Tipo de Vínculo"],
  );
  const maskedPlate = maskVehiclePlate(vehicleRecord.fields.Placa);
  const year = vehicleRecord.fields.Ano;
  const status =
    normalizeText(vehicleRecord.fields.Situação) || "Situação não informada";
  const informationDate = normalizeText(
    vehicleRecord.fields["Data da Informação"],
  );
  const parsedInformationDate = informationDate
    ? new Date(informationDate)
    : null;

  const descriptionParts = [
    maskedPlate,
    color ? `Cor: ${color}` : "",
    typeof year === "number" && Number.isInteger(year) ? `Ano: ${year}` : "",
    relationshipType ? `Vínculo: ${relationshipType}` : "",
  ].filter(Boolean);

  return {
    id: `vehicle:${vehicleRecord.id}:${addressRecord.id}`,
    type: "vehicle",
    title: [brand, model].filter(Boolean).join(" ") || "Veículo monitorado",
    description:
      descriptionParts.join(" — ") ||
      "Veículo vinculado ao endereço georreferenciado.",
    coordinates,
    createdAt:
      parsedInformationDate && !Number.isNaN(parsedInformationDate.getTime())
        ? parsedInformationDate.toISOString()
        : vehicleRecord.createdTime,
    priority: vehiclePriority(vehicleRecord.fields),
    status,
    reference: vehicleRecord.id,
    locationLabel:
      buildAddressLabel(addressRecord.fields) || "Localização não informada",
    relationshipKeys: [
      relationshipKey("vehicle", vehicleRecord.id),
      relationshipKey("address", addressRecord.id),
      ...individualRecordIds.map((recordId) =>
        relationshipKey("individual", recordId),
      ),
    ],
  };
}

function buildAddressLabel(address: AirtableAddressFields): string {
  const fullAddress = normalizeText(address["Endereço Completo"]);

  if (fullAddress) {
    return fullAddress;
  }

  const street = normalizeText(address.Logradouro);

  const number = normalizeText(address.Número);

  const complement = normalizeText(address.Complemento);

  const neighborhood = normalizeText(address.Bairro);

  const city = normalizeText(address.Município);

  const state = normalizeText(address.Estado);

  const postalCode = normalizeText(address.CEP);

  const streetAndNumber = [street, number].filter(Boolean).join(", ");

  return [streetAndNumber, complement, neighborhood, city, state, postalCode]
    .filter(Boolean)
    .join(" — ");
}

function mapAddressToEntity(
  addressRecord: AirtableRecord<AirtableAddressFields>,
): OperationalEntity | null {
  const fields = addressRecord.fields;
  const coordinates = getValidCoordinates(fields.Latitude, fields.Longitude);

  if (
    !coordinates ||
    !isCoordinateConsistentWithNeighborhood({
      neighborhood: fields.Bairro,
      latitude: coordinates[1],
      longitude: coordinates[0],
    })
  ) {
    return null;
  }

  const locationLabel =
    buildAddressLabel(fields) || "Endereço georreferenciado";
  const context = [
    normalizeText(fields.Bairro),
    normalizeText(fields.Município),
    normalizeText(fields.Estado),
  ]
    .filter(Boolean)
    .join(" — ");
  const verificationStatus = normalizeText(fields["Situação da Verificação"]);

  return {
    id: `address:${addressRecord.id}`,
    type: "address",
    title: locationLabel,
    description: context || "Localização validada na base operacional.",
    coordinates,
    createdAt: addressRecord.createdTime,
    priority: "normal",
    status: verificationStatus || "Georreferenciado",
    reference: normalizeText(fields["ID Endereço"]) || addressRecord.id,
    locationLabel,
    relationshipKeys: [relationshipKey("address", addressRecord.id)],
  };
}

function buildOccurrenceDescription(
  occurrence: AirtableOccurrenceFields,
): string {
  const description = normalizeText(occurrence.Descrição);

  if (description) {
    return description;
  }

  const operationalResult = normalizeText(occurrence["Resultado Operacional"]);

  if (operationalResult) {
    return operationalResult;
  }

  return "Ocorrência operacional registrada no SIO.";
}

function buildOccurrenceTitle(occurrence: AirtableOccurrenceFields): string {
  const nature = normalizeText(occurrence.Natureza);

  if (nature) {
    return nature;
  }

  const category = normalizeText(occurrence.Categoria);

  if (category) {
    return category;
  }

  return "Ocorrência operacional";
}

function isExplicitPointOfSale(
  occurrence: AirtableOccurrenceFields,
): boolean {
  const explicitClassification = [occurrence.Natureza, occurrence.Categoria]
    .map((value) =>
      normalizeText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR"),
    )
    .join(" ");

  return /\b(ponto de venda|boca de fumo|local de comercializacao de drogas)\b/.test(
    explicitClassification,
  );
}

function buildOccurrenceReference(
  occurrence: AirtableOccurrenceFields,
  recordId: string,
): string {
  const occurrenceNumber = normalizeText(occurrence["Número da Ocorrência"]);

  if (occurrenceNumber) {
    return occurrenceNumber;
  }

  const occurrenceId = normalizeText(occurrence["ID Ocorrência"]);

  if (occurrenceId) {
    return occurrenceId;
  }

  return recordId;
}

function buildCreatedAt(
  occurrence: AirtableOccurrenceFields,
  fallbackCreatedTime: string,
): string {
  const occurrenceDate = normalizeText(occurrence["Data e Hora"]);

  if (occurrenceDate) {
    const parsedDate = new Date(occurrenceDate);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  const fallbackDate = new Date(fallbackCreatedTime);

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

  if (
    !coordinates ||
    !isCoordinateConsistentWithNeighborhood({
      neighborhood: addressRecord.fields.Bairro,
      latitude: coordinates[1],
      longitude: coordinates[0],
    })
  ) {
    return null;
  }

  const occurrence = occurrenceRecord.fields;

  const address = addressRecord.fields;

  const addressLabel = buildAddressLabel(address);

  const status = normalizeText(occurrence.Situação) || "Sem classificação";
  const isPointOfSale = isExplicitPointOfSale(occurrence);

  return {
    id: occurrenceRecord.id,
    type: isPointOfSale ? "point-of-sale" : "occurrence",
    title: isPointOfSale ? "Ponto de venda sinalizado" : buildOccurrenceTitle(occurrence),
    description: isPointOfSale
      ? "Classificação explícita na fonte; requer validação humana."
      : buildOccurrenceDescription(occurrence),
    reference: buildOccurrenceReference(occurrence, occurrenceRecord.id),
    locationLabel: addressLabel || "Localização não informada",
    coordinates,
    createdAt: buildCreatedAt(occurrence, occurrenceRecord.createdTime),
    priority: determinePriority(occurrence),
    status,
    relationshipKeys: [relationshipKey("address", addressRecord.id)],
  };
}

export async function loadOperationalEntitiesFromAirtable(): Promise<
  OperationalEntity[]
> {
  const configuration = getAirtableConfiguration();

  const [
    occurrenceRecords,
    addressRecords,
    individualRecords,
    vehicleRecords,
    warrantRecords,
    organizationRecords,
    organizationalLinkRecords,
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
        baseId: configuration.individualsPreviewBaseId,
      },
    ),

    listAllAirtableRecords<AirtableIndividualFields>(
      configuration.individualsTableId,
      {
        baseId: configuration.individualsPreviewBaseId,
        fields: ["Nome Completo", "Vulgo Principal"],
      },
    ),

    listAllAirtableRecords<AirtableVehicleFields>(
      configuration.vehiclesTableId,
      {
        baseId: configuration.individualsPreviewBaseId,
      },
    ),

    listAllAirtableRecords<AirtableWarrantFields>(
      configuration.warrantsTableId,
      {
        baseId: configuration.individualsPreviewBaseId,
      },
    ),

    listAllAirtableRecords<AirtableOrganizationFields>(
      configuration.organizationsTableId,
      {
        baseId: configuration.baseId,
        fields: ["Nome da Organização", "Sigla", "Tipo", "Situação"],
      },
    ),

    listAllAirtableRecords<AirtableOrganizationalLinkFields>(
      configuration.organizationalLinksTableId,
      {
        baseId: configuration.baseId,
        fields: ["Indivíduo", "Organização", "Registro Ativo"],
      },
    ),
  ]);

  const addressesByRecordId = new Map<
    string,
    AirtableRecord<AirtableAddressFields>
  >(addressRecords.map((record) => [record.id, record]));

  const entities: OperationalEntity[] = [];

  for (const addressRecord of addressRecords) {
    const entity = mapAddressToEntity(addressRecord);

    if (entity) {
      entities.push(entity);
    }
  }

  for (const occurrenceRecord of occurrenceRecords) {
    const linkedAddressIds = occurrenceRecord.fields.Endereços ?? [];

    for (const addressId of linkedAddressIds) {
      const addressRecord = addressesByRecordId.get(addressId);

      if (!addressRecord) {
        continue;
      }

      const entity = mapOccurrenceToEntity(occurrenceRecord, addressRecord);

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

  const individualsByRecordId = new Map(
    individualRecords.map((record) => [record.id, record]),
  );
  const individualRecordIds = new Set(individualsByRecordId.keys());
  const addressesByIndividualRecordId = new Map<
    string,
    AirtableRecord<AirtableAddressFields>[]
  >();

  for (const addressRecord of addressRecords) {
    const linkedIndividualIds = linkedIndividualRecordIds(
      addressRecord.fields,
      individualRecordIds,
    );

    for (const individualRecordId of linkedIndividualIds) {
      const linkedAddresses =
        addressesByIndividualRecordId.get(individualRecordId) ?? [];
      linkedAddresses.push(addressRecord);
      addressesByIndividualRecordId.set(individualRecordId, linkedAddresses);

      const individualRecord = individualsByRecordId.get(individualRecordId);

      if (!individualRecord) {
        continue;
      }

      const entity = mapIndividualToEntity(individualRecord, addressRecord);

      if (entity) {
        entities.push(entity);
      }
    }
  }

  const organizationsByRecordId = new Map(
    organizationRecords.map((record) => [record.id, record]),
  );
  const organizationAddressPairs = new Set<string>();

  for (const linkRecord of organizationalLinkRecords) {
    if (linkRecord.fields["Registro Ativo"] === false) continue;

    const linkedIndividualIds = linkRecord.fields.Indivíduo ?? [];
    const linkedOrganizationIds = linkRecord.fields.Organização ?? [];

    for (const organizationRecordId of linkedOrganizationIds) {
      const organizationRecord =
        organizationsByRecordId.get(organizationRecordId);
      if (!organizationRecord) continue;

      for (const individualRecordId of linkedIndividualIds) {
        const linkedAddresses =
          addressesByIndividualRecordId.get(individualRecordId) ?? [];

        for (const addressRecord of linkedAddresses) {
          const pairKey = `${organizationRecordId}:${addressRecord.id}`;
          if (organizationAddressPairs.has(pairKey)) continue;

          const entity = mapOrganizationToEntity(
            organizationRecord,
            addressRecord,
            individualRecordId,
          );
          if (!entity) continue;

          organizationAddressPairs.add(pairKey);
          entities.push(entity);
        }
      }
    }
  }

  const warrantsByRecordId = new Map(
    warrantRecords.map((record) => [record.id, record]),
  );
  const addressRecordIds = new Set(addressesByRecordId.keys());
  const warrantRecordIds = new Set(warrantsByRecordId.keys());
  const linkedWarrantAddressPairs = new Set<string>();

  const addWarrantAtAddress = (
    warrantRecordId: string,
    addressRecordId: string,
  ) => {
    const pairKey = `${warrantRecordId}:${addressRecordId}`;
    if (linkedWarrantAddressPairs.has(pairKey)) return;

    const warrantRecord = warrantsByRecordId.get(warrantRecordId);
    const addressRecord = addressesByRecordId.get(addressRecordId);
    if (!warrantRecord || !addressRecord) return;

    linkedWarrantAddressPairs.add(pairKey);
    const entity = mapWarrantToAlert(warrantRecord, addressRecord);
    if (entity) entities.push(entity);
  };

  for (const warrantRecord of warrantRecords) {
    for (const addressRecordId of linkedRecordIds(
      warrantRecord.fields,
      addressRecordIds,
    )) {
      addWarrantAtAddress(warrantRecord.id, addressRecordId);
    }
  }

  for (const addressRecord of addressRecords) {
    for (const warrantRecordId of linkedRecordIds(
      addressRecord.fields,
      warrantRecordIds,
    )) {
      addWarrantAtAddress(warrantRecordId, addressRecord.id);
    }
  }

  const vehiclesByRecordId = new Map(
    vehicleRecords.map((record) => [record.id, record]),
  );
  const vehicleRecordIds = new Set(vehiclesByRecordId.keys());
  const linkedVehicleAddressPairs = new Set<string>();

  const addVehicleAtAddress = (
    vehicleRecordId: string,
    addressRecordId: string,
  ) => {
    const pairKey = `${vehicleRecordId}:${addressRecordId}`;
    if (linkedVehicleAddressPairs.has(pairKey)) return;

    const vehicleRecord = vehiclesByRecordId.get(vehicleRecordId);
    const addressRecord = addressesByRecordId.get(addressRecordId);
    if (!vehicleRecord || !addressRecord) return;

    linkedVehicleAddressPairs.add(pairKey);
    const linkedIndividualIds = linkedRecordIds(
      vehicleRecord.fields,
      individualRecordIds,
    );
    const entity = mapVehicleToEntity(
      vehicleRecord,
      addressRecord,
      linkedIndividualIds,
    );
    if (entity) entities.push(entity);
  };

  for (const vehicleRecord of vehicleRecords) {
    for (const addressRecordId of linkedRecordIds(
      vehicleRecord.fields,
      addressRecordIds,
    )) {
      addVehicleAtAddress(vehicleRecord.id, addressRecordId);
    }
  }

  for (const addressRecord of addressRecords) {
    for (const vehicleRecordId of linkedRecordIds(
      addressRecord.fields,
      vehicleRecordIds,
    )) {
      addVehicleAtAddress(vehicleRecordId, addressRecord.id);
    }
  }

  return entities.sort(
    (firstEntity, secondEntity) =>
      new Date(secondEntity.createdAt).getTime() -
      new Date(firstEntity.createdAt).getTime(),
  );
}
