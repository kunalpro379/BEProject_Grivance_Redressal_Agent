-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.AuditLog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  action character varying NOT NULL,
  entity_type character varying,
  entity_id uuid,
  details jsonb,
  ip_address character varying,
  CONSTRAINT AuditLog_pkey PRIMARY KEY (id),
  CONSTRAINT AuditLog_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.Users(id)
);
CREATE TABLE public.Citizens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  telegram_id bigint UNIQUE,
  phone character varying NOT NULL,
  username character varying,
  full_name character varying,
  latitude numeric,
  longitude numeric,
  location_address text,
  is_registered boolean DEFAULT false,
  is_active boolean DEFAULT true,
  user_id uuid,
  email character varying UNIQUE,
  password_hash character varying,
  address text,
  email_verified boolean DEFAULT false,
  verification_token text,
  reset_token text,
  reset_token_expiry timestamp with time zone,
  last_login timestamp with time zone,
  profile_image text,
  CONSTRAINT Citizens_pkey PRIMARY KEY (id),
  CONSTRAINT Citizens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.Users(id)
);
CREATE TABLE public.Departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name character varying NOT NULL UNIQUE,
  description text,
  contact_email character varying,
  contact_phone character varying,
  is_active boolean DEFAULT true,
  CONSTRAINT Departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.EmbeddingMetadata (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  entity_type character varying NOT NULL,
  entity_id uuid NOT NULL,
  model_name character varying DEFAULT 'sentence-transformers/all-MiniLM-L6-v2'::character varying,
  embedding_dimension integer DEFAULT 384,
  CONSTRAINT EmbeddingMetadata_pkey PRIMARY KEY (id)
);
CREATE TABLE public.FAQs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  question text NOT NULL,
  answer text NOT NULL,
  category character varying,
  department_id uuid,
  embedding USER-DEFINED,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  CONSTRAINT FAQs_pkey PRIMARY KEY (id),
  CONSTRAINT FAQs_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.Departments(id)
);
CREATE TABLE public.GrievanceComments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  grievance_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  CONSTRAINT GrievanceComments_pkey PRIMARY KEY (id),
  CONSTRAINT GrievanceComments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.Users(id),
  CONSTRAINT grievancecomments_grievance_id_fkey FOREIGN KEY (grievance_id) REFERENCES public.Grievances(id)
);
CREATE TABLE public.Grievances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  assigned_officer_id uuid,
  department_id uuid,
  status USER-DEFINED DEFAULT 'pending'::grievance_status,
  priority character varying DEFAULT 'medium'::character varying,
  query_type jsonb,
  category jsonb,
  similar_cases_summary text,
  sentiment_priority jsonb,
  emotion jsonb,
  severity jsonb,
  patterns jsonb,
  fraud jsonb,
  department jsonb,
  policy_search jsonb,
  past_queries_summary text,
  full_result jsonb,
  resolution_text text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  citizen_id uuid,
  grievance_id uuid,
  CONSTRAINT Grievances_pkey PRIMARY KEY (id),
  CONSTRAINT UserGrievance_assigned_officer_id_fkey FOREIGN KEY (assigned_officer_id) REFERENCES public.Users(id),
  CONSTRAINT UserGrievance_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.Departments(id),
  CONSTRAINT UserGrievance_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.Users(id),
  CONSTRAINT UserGrievance_citizen_id_fkey FOREIGN KEY (citizen_id) REFERENCES public.Citizens(id),
  CONSTRAINT UserGrievance_grivience_id_fkey FOREIGN KEY (grievance_id) REFERENCES public.UserGrievance(id)
);
CREATE TABLE public.Migrations (
  id integer NOT NULL DEFAULT nextval('"Migrations_id_seq"'::regclass),
  migration_name character varying NOT NULL UNIQUE,
  executed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT Migrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.PolicyDocuments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  title character varying NOT NULL,
  content text NOT NULL,
  department_id uuid,
  document_url text,
  embedding USER-DEFINED,
  metadata jsonb,
  is_active boolean DEFAULT true,
  CONSTRAINT PolicyDocuments_pkey PRIMARY KEY (id),
  CONSTRAINT PolicyDocuments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.Departments(id)
);
CREATE TABLE public.RefreshTokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  revoked boolean DEFAULT false,
  CONSTRAINT RefreshTokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.UserGrievance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  grievance_text text,
  image_path text,
  image_description text,
  enhanced_query text,
  embedding USER-DEFINED,
  citizen_id uuid,
  CONSTRAINT UserGrievance_pkey PRIMARY KEY (id),
  CONSTRAINT UserGrivience_citizen_id_fkey FOREIGN KEY (citizen_id) REFERENCES public.Citizens(id)
);
CREATE TABLE public.Users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  full_name character varying NOT NULL,
  phone character varying,
  role USER-DEFINED NOT NULL DEFAULT 'citizen'::user_role,
  status USER-DEFINED NOT NULL DEFAULT 'active'::user_status,
  department_id uuid,
  profile_image text,
  address text,
  last_login timestamp with time zone,
  email_verified boolean DEFAULT false,
  verification_token text,
  reset_token text,
  reset_token_expiry timestamp with time zone,
  approval_status USER-DEFINED DEFAULT 'pending'::approval_status,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  department_name character varying,
  designation character varying,
  city character varying,
  official_type character varying,
  ward character varying,
  district character varying,
  admin_id character varying,
  admin_passkey_hash character varying,
  CONSTRAINT Users_pkey PRIMARY KEY (id),
  CONSTRAINT Users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.Departments(id),
  CONSTRAINT Users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.Users(id)
);