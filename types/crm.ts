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
