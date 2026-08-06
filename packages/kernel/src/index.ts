export const ATLAS_KERNEL_VERSION =
  "0.2.0";

export {
  Result,
} from "./result/result";

export type {
  ResultState,
} from "./result/result";

export {
  ApplicationError,
  ConflictError,
  ForbiddenError,
  InfrastructureError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors/application-error";

export type {
  ApplicationErrorMetadata,
} from "./errors/application-error";

export {
  UniqueEntityId,
} from "./identifiers/unique-entity-id";

export {
  FixedClock,
  SystemClock,
} from "./clock/clock";

export type {
  Clock,
} from "./clock/clock";

export {
  BaseDomainEvent,
} from "./domain-events/domain-event";

export type {
  DomainEvent,
  DomainEventHandler,
  DomainEventOptions,
  EventBus,
} from "./domain-events/domain-event";

export {
  InMemoryEventBus,
} from "./event-bus";

export type {
  Command,
  CommandBus,
  CommandHandler,
} from "./commands/command";

export type {
  Query,
  QueryBus,
  QueryHandler,
} from "./queries/query";

export {
  collapseWhitespace,
  normalizeDigits,
  normalizeSearchText,
} from "./normalization/text-normalization";

export {
  SourceRecordReference,
} from "./provenance/source-record-reference";

export type {
  SourceRecordReferenceInput,
  SourceSystem,
} from "./provenance/source-record-reference";

export {
  CanonicalIndividual,
} from "./individuals/canonical-individual";

export type {
  CanonicalIndividualInput,
} from "./individuals/canonical-individual";

export type {
  CanonicalIndividualRepository,
} from "./individuals/canonical-individual-repository";

export {
  RegisterCanonicalIndividual,
} from "./individuals/register-canonical-individual";

export type {
  RegisterCanonicalIndividualInput,
  RegisterCanonicalIndividualOutput,
} from "./individuals/register-canonical-individual";

export {
  buildIndividualMatchKey,
  isStructurallyValidCpf,
  normalizeCpf,
  normalizeIdentityDocument,
} from "./individuals/individual-identifiers";

export type {
  IndividualMatchKey,
} from "./individuals/individual-identifiers";

export {
  findDuplicateCandidates,
} from "./individuals/find-duplicate-candidates";

export type {
  DuplicateCandidate,
} from "./individuals/find-duplicate-candidates";

export {
  DuplicateReviewItem,
} from "./individuals/duplicate-review-item";

export type {
  DecideDuplicateReviewInput,
  DuplicateReviewConfidence,
  DuplicateReviewDecision,
  DuplicateReviewItemInput,
  DuplicateReviewStrategy,
  FinalDuplicateReviewDecision,
} from "./individuals/duplicate-review-item";

export { AuditEntry } from "./audit/audit-entry";
export type { AuditEntryInput, AuditOutcome } from "./audit/audit-entry";

export type { AuditRepository } from "./audit/audit-repository";
