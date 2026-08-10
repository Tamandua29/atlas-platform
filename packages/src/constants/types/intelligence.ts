import { ManausZone } from '../constants/territories';

export interface LinkNode {
  id: string;
  label: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'ASSET';
  zone?: ManausZone;
  verified: boolean;
}

export interface LinkEdge {
  source: string;
  target: string;
  relationshipType: string;
  confidenceScore: number;
  firstObservedAt: string;
  lastObservedAt: string;
}

export interface OrganizationIntelligenceSummary {
  organizationId: string;
  canonicalName: string;
  primaryZone: ManausZone;
  totalVerifiedMembers: number;
  distinctEntitiesCount: number;
  nodes: LinkNode[];
  edges: LinkEdge[];
  updatedAt: string;
}