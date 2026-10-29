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

export type DevelopmentUnit = Tables<"properties"> & {
  sale_terms: Tables<"property_sale_terms"> | null;
};

export type DevelopmentDetail = Tables<"developments"> & {
  units: DevelopmentUnit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DevelopmentSummary = {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string | null;
  total_units: number | null;
  payment_plan_label: string | null;
  sales_table_reference: string | null;
  sales_table_updated_at: string | null;
  units_imported: number;
  units_available: number;
  units_reserved: number;
  units_sold: number;
  min_available_price: number | null;
  max_available_price: number | null;
  available_inventory_value: number;
};

export type DeterministicPropertyMatch = {
  property: Tables<"properties">;
  score: number;
  reasons: string[];
};
