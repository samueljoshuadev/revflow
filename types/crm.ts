import type { Tables } from "@/types/database";

export type BoardLead = Tables<"leads"> & {
  service_name: string | null;
  owner_name: string | null;
};

export type BoardStage = Tables<"pipeline_stages"> & {
  leads: BoardLead[];
};

export type PipelineBoard = {
  pipeline: Tables<"pipelines">;
  stages: BoardStage[];
};

export type LeadDetail = Tables<"leads"> & {
  service: Tables<"services"> | null;
  owner: Tables<"profiles"> | null;
  stage: Tables<"pipeline_stages">;
  pipeline: Tables<"pipelines">;
  events: Tables<"lead_events">[];
  notes: (Tables<"lead_notes"> & { author_name: string | null })[];
  tags: Tables<"tags">[];
};

export type PropertyListItem = Tables<"properties"> & {
  responsible_name: string | null;
  photo_count: number;
};

export type PropertyDetail = Tables<"properties"> & {
  responsible_name: string | null;
  photos: (Tables<"property_photos"> & { signed_url: string | null })[];
  matches: (Tables<"property_matches"> & {
    lead_name: string | null;
  })[];
  visits: (Tables<"meetings"> & {
    lead_name: string | null;
    owner_name: string | null;
  })[];
  events: Tables<"real_estate_events">[];
};

export type DeterministicPropertyMatch = {
  property: Tables<"properties">;
  score: number;
  reasons: string[];
};

export type DevelopmentListItem = Tables<"developments"> & {
  overview: {
    total_units: number;
    available_units: number;
    in_proposal_units: number;
    reserved_units: number;
    sold_units: number;
    rented_units: number;
    blocked_units: number;
    total_vgv: number;
    sold_vgv: number;
    available_vgv: number;
  };
};

export type MirrorFloor = {
  floor: number | null;
  units: Tables<"development_units">[];
};

export type MirrorTower = {
  tower: Tables<"development_towers"> | null;
  floors: MirrorFloor[];
};

export type DevelopmentMirror = DevelopmentListItem & {
  towers: Tables<"development_towers">[];
  mirror: MirrorTower[];
  unitCount: number;
  truncated: boolean;
};

export type DevelopmentUnitDetail = Tables<"development_units"> & {
  tower_name: string | null;
  status_changed_by_name: string | null;
  events: Tables<"real_estate_events">[];
};

export type ProposalListItem = Tables<"property_proposals"> & {
  unit_code: string;
  development_id: string;
  development_name: string;
  buyer_name: string | null;
  broker_name: string | null;
};

export type ProposalDetail = ProposalListItem & {
  unit: Tables<"development_units">;
  development: Tables<"developments">;
  parties: Tables<"proposal_parties">[];
  documents: (Tables<"proposal_documents"> & { signed_url: string | null })[];
  events: Tables<"real_estate_events">[];
  missing: string[];
  manager_name: string | null;
  director_name: string | null;
  decided_by_name: string | null;
  partner_agency: Tables<"partner_agencies"> | null;
  lead: { id: string; name: string } | null;
};

export type UnitProposalSummary = {
  hasActive: boolean;
  queued: number;
  visible: ProposalListItem[];
};
