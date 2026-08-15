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
