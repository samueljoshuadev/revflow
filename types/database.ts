export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationRole =
  "owner" | "admin" | "manager" | "member" | "viewer";
export type OrganizationVertical = "agency" | "real_estate";
export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type PropertyStatus = "available" | "reserved" | "sold" | "inactive";
export type PropertyType =
  "apartment" | "house" | "commercial" | "land" | "rural" | "other";
export type PropertyPurpose = "sale" | "rent";
export type PropertyMatchStatus =
  "recommended" | "sent" | "favorite" | "rejected" | "visit_scheduled";

type Organization = {
  id: string;
  name: string;
  slug: string;
  vertical: OrganizationVertical;
  created_by: string | null;
  settings: Json;
  document: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  timezone: string;
  currency: string;
  business_hours: Json;
  booking_enabled: boolean;
  booking_duration_minutes: number;
  booking_buffer_minutes: number;
  meeting_location: string | null;
  branding: Json;
  notification_settings: Json;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
  updated_at: string;
};

type OrganizationInvitation = {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  token_hash: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type Pipeline = {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type PipelineStage = {
  id: string;
  organization_id: string;
  pipeline_id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  probability: number;
  is_closed: boolean;
  is_won: boolean;
  created_at: string;
  updated_at: string;
};

type Service = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  description: string | null;
  base_price: number | null;
  meeting_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type Lead = {
  id: string;
  organization_id: string;
  pipeline_id: string;
  stage_id: string;
  service_id: string | null;
  owner_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  campaign: string | null;
  estimated_budget: number | null;
  priority: LeadPriority;
  score: number;
  summary: string | null;
  next_action: string | null;
  next_action_at: string | null;
  first_response_at: string | null;
  normalized_email: string | null;
  normalized_phone: string | null;
  custom_fields: Json;
  last_interaction_at: string | null;
  archived_at: string | null;
  lost_reason: string | null;
  qualified_at: string | null;
  ai_status: "not_analyzed" | "pending" | "analyzed" | "reviewed" | "failed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type LeadImport = {
  id: string;
  organization_id: string;
  import_key: string;
  file_name: string;
  status: "processing" | "completed" | "failed";
  total_rows: number;
  created_count: number;
  duplicate_count: number;
  invalid_count: number;
  created_by: string;
  completed_at: string | null;
  created_at: string;
};

type LeadImportItem = {
  id: string;
  organization_id: string;
  import_id: string;
  row_number: number;
  status: "created" | "duplicate" | "invalid";
  reason: string | null;
  lead_id: string | null;
  created_at: string;
};

type LeadCaptureSource = {
  id: string;
  organization_id: string;
  source_key: string;
  name: string;
  channel: "form" | "webhook";
  source_label: string;
  campaign: string | null;
  default_service_id: string | null;
  default_owner_id: string | null;
  token_hash: string | null;
  token_hint: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type FollowUpRule = {
  id: string;
  organization_id: string;
  name: string;
  trigger_kind:
    "first_contact" | "return" | "proposal" | "reactivation" | "stale";
  delay_days: number;
  notify_in_app: boolean;
  notify_email: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type LeadFollowUpState = {
  id: string;
  organization_id: string;
  lead_id: string;
  rule_id: string;
  status: "active" | "paused" | "completed" | "cancelled";
  next_run_at: string;
  pause_reason: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

type Notification = {
  id: string;
  organization_id: string;
  user_id: string;
  lead_id: string | null;
  kind: string;
  title: string;
  body: string;
  dedupe_key: string;
  read_at: string | null;
  created_at: string;
};

type NotificationOutbox = {
  id: string;
  organization_id: string;
  notification_id: string;
  user_id: string;
  channel: "email";
  status: "pending" | "processing" | "sent" | "failed" | "blocked";
  idempotency_key: string;
  attempts: number;
  available_at: string;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type KanbanAutomationRule = {
  id: string;
  organization_id: string;
  event_key:
    | "lead_created"
    | "meeting_scheduled"
    | "meeting_completed"
    | "proposal_sent"
    | "proposal_accepted"
    | "proposal_rejected";
  target_stage_slug: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type LeadEvent = {
  id: string;
  organization_id: string;
  lead_id: string;
  actor_user_id: string | null;
  event_type: string;
  metadata: Json;
  source: "system" | "user" | "webhook" | "api" | "automation" | "ai";
  idempotency_key: string | null;
  created_at: string;
};

type LeadNote = {
  id: string;
  organization_id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type Tag = {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
};

type LeadTag = {
  organization_id: string;
  lead_id: string;
  tag_id: string;
  created_at: string;
};

type Meeting = {
  id: string;
  organization_id: string;
  lead_id: string;
  property_id: string | null;
  owner_id: string | null;
  title: string;
  description: string | null;
  status: "scheduled" | "cancelled" | "completed" | "no_show";
  starts_at: string;
  ends_at: string;
  location: string | null;
  timezone: string;
  confirmation_status: "pending" | "confirmed" | "declined";
  reminder_sent_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  external_provider: string | null;
  external_id: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Property = {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  status: PropertyStatus;
  property_type: PropertyType;
  purpose: PropertyPurpose;
  price: number;
  city: string;
  neighborhood: string | null;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  description: string | null;
  features: string[];
  responsible_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type PropertyPhoto = {
  id: string;
  organization_id: string;
  property_id: string;
  storage_path: string;
  alt_text: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
};

type RealEstateLeadProfile = {
  lead_id: string;
  organization_id: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_city: string | null;
  preferred_neighborhood: string | null;
  property_type: PropertyType | null;
  purpose: PropertyPurpose | null;
  minimum_bedrooms: number | null;
  payment_method:
    "cash" | "financing" | "consortium" | "exchange" | "other" | null;
  available_down_payment: number | null;
  urgency: "low" | "medium" | "high" | "immediate" | null;
  purchase_deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PropertyMatch = {
  id: string;
  organization_id: string;
  lead_id: string;
  property_id: string;
  score: number;
  match_reason: string;
  status: PropertyMatchStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RealEstateEvent = {
  id: string;
  organization_id: string;
  entity_type: "property" | "property_match" | "lead_profile" | "visit";
  entity_id: string;
  actor_user_id: string | null;
  event_type: string;
  metadata: Json;
  created_at: string;
};

type Client = {
  id: string;
  organization_id: string;
  source_lead_id: string | null;
  owner_id: string | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  status: "active" | "inactive" | "churned";
  metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Proposal = {
  id: string;
  organization_id: string;
  client_id: string | null;
  lead_id: string | null;
  owner_id: string | null;
  number: number;
  title: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProposalItem = {
  id: string;
  organization_id: string;
  proposal_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  position: number;
  created_at: string;
};

type Project = {
  id: string;
  organization_id: string;
  client_id: string;
  proposal_id: string | null;
  owner_id: string | null;
  name: string;
  status: "planned" | "active" | "paused" | "completed" | "cancelled";
  starts_on: string | null;
  due_on: string | null;
  completed_at: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Task = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  client_id: string | null;
  project_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: LeadPriority;
  due_at: string | null;
  reminder_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type AiAnalysis = {
  id: string;
  organization_id: string;
  lead_id: string;
  requested_by: string | null;
  status: "pending" | "completed" | "failed" | "reviewed";
  provider: string;
  model: string | null;
  prompt_version: string;
  schema_version: string;
  result: Json | null;
  error_code: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type IntegrationConnection = {
  id: string;
  organization_id: string;
  provider: "openai" | "google_calendar" | "calendly" | "whatsapp";
  status:
    | "disconnected"
    | "incomplete"
    | "pending"
    | "connecting"
    | "connected"
    | "attention"
    | "expired"
    | "error"
    | "revoked";
  external_account_id: string | null;
  credentials_reference: string | null;
  config: Json;
  last_synced_at: string | null;
  last_tested_at: string | null;
  last_event_at: string | null;
  last_error_code: string | null;
  diagnostic_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type IntegrationCredential = {
  id: string;
  organization_id: string;
  provider: "openai" | "google_calendar" | "calendly" | "whatsapp";
  encrypted_payload: string;
  iv: string;
  auth_tag: string;
  key_version: number;
  secret_hint: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type IntegrationEvent = {
  id: string;
  organization_id: string;
  connection_id: string | null;
  provider: "openai" | "google_calendar" | "calendly" | "whatsapp";
  event_type: string;
  status: "success" | "warning" | "error";
  error_code: string | null;
  diagnostic_id: string;
  occurred_at: string;
};

type Conversation = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  client_id: string | null;
  provider: "whatsapp";
  external_contact_id: string;
  contact_name: string | null;
  status: "open" | "closed" | "blocked";
  opt_in_at: string | null;
  opt_out_at: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  status: "queued" | "sent" | "delivered" | "read" | "received" | "failed";
  external_id: string | null;
  message_type: string;
  body: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  metadata: Json;
  created_at: string;
};

type AuditLog = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Json | null;
  new_values: Json | null;
  metadata: Json;
  created_at: string;
};

type WebhookEvent = {
  id: string;
  organization_id: string | null;
  provider: string;
  external_event_id: string;
  status: "pending" | "processing" | "processed" | "failed" | "ignored";
  payload: Json;
  attempts: number;
  last_error: string | null;
  processed_at: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<Organization>;
      profiles: Table<Profile>;
      organization_members: Table<OrganizationMember>;
      organization_invitations: Table<OrganizationInvitation>;
      pipelines: Table<Pipeline>;
      pipeline_stages: Table<PipelineStage>;
      services: Table<Service>;
      leads: Table<Lead>;
      lead_imports: Table<LeadImport>;
      lead_import_items: Table<LeadImportItem>;
      lead_capture_sources: Table<LeadCaptureSource>;
      follow_up_rules: Table<FollowUpRule>;
      lead_follow_up_states: Table<LeadFollowUpState>;
      notifications: Table<Notification>;
      notification_outbox: Table<NotificationOutbox>;
      kanban_automation_rules: Table<KanbanAutomationRule>;
      lead_events: Table<LeadEvent>;
      lead_notes: Table<LeadNote>;
      tags: Table<Tag>;
      lead_tags: Table<LeadTag>;
      meetings: Table<Meeting>;
      properties: Table<Property>;
      property_photos: Table<PropertyPhoto>;
      real_estate_lead_profiles: Table<RealEstateLeadProfile>;
      property_matches: Table<PropertyMatch>;
      real_estate_events: Table<RealEstateEvent>;
      clients: Table<Client>;
      proposals: Table<Proposal>;
      proposal_items: Table<ProposalItem>;
      projects: Table<Project>;
      tasks: Table<Task>;
      ai_analyses: Table<AiAnalysis>;
      integration_connections: Table<IntegrationConnection>;
      integration_credentials: Table<IntegrationCredential>;
      integration_events: Table<IntegrationEvent>;
      conversations: Table<Conversation>;
      messages: Table<Message>;
      webhook_events: Table<WebhookEvent>;
      audit_logs: Table<AuditLog>;
    };
    Views: Record<string, never>;
    Functions: {
      create_organization_with_defaults: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      create_organization_with_vertical: {
        Args: {
          p_name: string;
          p_slug: string;
          p_vertical: OrganizationVertical;
        };
        Returns: string;
      };
      move_lead_stage: {
        Args: { p_lead_id: string; p_to_stage_id: string };
        Returns: Json;
      };
      get_dashboard_metrics: {
        Args: { p_organization_id: string };
        Returns: Json;
      };
      accept_organization_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      update_organization_member_role: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
          p_role: OrganizationRole;
        };
        Returns: undefined;
      };
      remove_organization_member: {
        Args: { p_organization_id: string; p_user_id: string };
        Returns: undefined;
      };
      queue_whatsapp_outbound_message: {
        Args: {
          p_organization_id: string;
          p_conversation_id: string;
          p_body: string;
        };
        Returns: string;
      };
      update_lead_details: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_name: string;
          p_email: string;
          p_phone: string;
          p_company: string;
          p_service_id: string | null;
          p_owner_id: string | null;
          p_source: string;
          p_campaign: string;
          p_estimated_budget: number | null;
          p_priority: LeadPriority;
          p_score: number;
          p_summary: string;
          p_next_action: string;
          p_tag_ids?: string[];
        };
        Returns: undefined;
      };
      set_lead_archived: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_archived: boolean;
        };
        Returns: undefined;
      };
      get_public_booking_profile: {
        Args: { p_slug: string };
        Returns: Json;
      };
      book_public_meeting: {
        Args: {
          p_slug: string;
          p_name: string;
          p_email: string;
          p_phone: string;
          p_company: string;
          p_starts_at: string;
          p_idempotency_key: string;
          p_website?: string;
        };
        Returns: Json;
      };
      healthcheck: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_operational_metrics: {
        Args: { p_organization_id: string };
        Returns: Json;
      };
      get_real_estate_dashboard_metrics: {
        Args: { p_organization_id: string };
        Returns: Json;
      };
      reschedule_property_visit: {
        Args: {
          p_organization_id: string;
          p_meeting_id: string;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: undefined;
      };
      schedule_property_visit: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_property_id: string;
          p_owner_id: string;
          p_title: string;
          p_starts_at: string;
          p_ends_at: string;
          p_timezone: string;
          p_description?: string | null;
          p_location?: string | null;
        };
        Returns: string;
      };
      schedule_meeting: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_owner_id: string;
          p_title: string;
          p_starts_at: string;
          p_ends_at: string;
          p_timezone: string;
          p_description?: string | null;
          p_location?: string | null;
        };
        Returns: string;
      };
      update_meeting_status: {
        Args: {
          p_organization_id: string;
          p_meeting_id: string;
          p_status: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      convert_won_lead: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_project_name: string;
        };
        Returns: Json;
      };
      apply_lead_ai_analysis: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_model: string;
          p_prompt_version: string;
          p_schema_version: string;
          p_result: Json;
          p_input_tokens?: number | null;
          p_output_tokens?: number | null;
        };
        Returns: string;
      };
      apply_lead_ai_analysis_and_advance: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_model: string;
          p_prompt_version: string;
          p_schema_version: string;
          p_result: Json;
          p_target_stage_id: string | null;
          p_automation_reason: string;
          p_input_tokens?: number | null;
          p_output_tokens?: number | null;
        };
        Returns: Json;
      };
      import_lead_batch: {
        Args: {
          p_organization_id: string;
          p_import_key: string;
          p_file_name: string;
          p_rows: Json;
        };
        Returns: Json;
      };
      get_public_lead_capture_profile: {
        Args: { p_organization_slug: string; p_source_key: string };
        Returns: Json;
      };
      capture_external_lead: {
        Args: {
          p_organization_slug: string;
          p_source_key: string;
          p_channel: "form" | "webhook";
          p_token: string | null;
          p_idempotency_key: string;
          p_identifier: string;
          p_name: string;
          p_email: string;
          p_phone: string;
          p_company?: string | null;
          p_summary?: string | null;
          p_website?: string | null;
        };
        Returns: Json;
      };
      set_lead_next_action: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_action: string;
          p_due_at: string;
        };
        Returns: undefined;
      };
      clear_lead_next_action: {
        Args: {
          p_organization_id: string;
          p_lead_id: string;
          p_outcome: "completed" | "cancelled";
        };
        Returns: undefined;
      };
      process_due_followups: {
        Args: { p_limit?: number };
        Returns: Json;
      };
      claim_notification_outbox: {
        Args: { p_limit?: number };
        Returns: NotificationOutbox[];
      };
      complete_notification_delivery: {
        Args: {
          p_outbox_id: string;
          p_status: "sent" | "failed" | "blocked";
          p_error?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      organization_vertical: OrganizationVertical;
      property_status: PropertyStatus;
      property_type: PropertyType;
      property_purpose: PropertyPurpose;
      property_match_status: PropertyMatchStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
