-- Migration: 003_vector_enhancements
-- Description: Enhanced pgvector support with similarity search functions
-- Created: 2024-02-14

-- Create vector index for faster similarity search
CREATE INDEX IF NOT EXISTS idx_grievance_embedding ON "UserGrievance" 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Function to find similar grievances using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_grievances(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  grievance_text text,
  category jsonb,
  status grievance_status,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.grievance_text,
    g.category,
    g.status,
    1 - (g.embedding <=> query_embedding) as similarity
  FROM "UserGrievance" g
  WHERE g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY g.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar resolved cases for reference
CREATE OR REPLACE FUNCTION find_similar_resolved_cases(
  query_embedding vector(384),
  max_results int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  grievance_text text,
  resolution_text text,
  category jsonb,
  resolved_at timestamptz,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.grievance_text,
    g.resolution_text,
    g.category,
    g.resolved_at,
    1 - (g.embedding <=> query_embedding) as similarity
  FROM "UserGrievance" g
  WHERE g.embedding IS NOT NULL
    AND g.status = 'resolved'
    AND g.resolution_text IS NOT NULL
  ORDER BY g.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get department-wise grievance clusters
CREATE OR REPLACE FUNCTION get_department_grievance_clusters(
  dept_id uuid,
  cluster_threshold float DEFAULT 0.8
)
RETURNS TABLE (
  cluster_id int,
  grievance_count bigint,
  sample_text text,
  avg_similarity float
) AS $$
BEGIN
  RETURN QUERY
  WITH clustered AS (
    SELECT 
      g1.id,
      g1.grievance_text,
      COUNT(DISTINCT g2.id) as similar_count,
      AVG(1 - (g1.embedding <=> g2.embedding)) as avg_sim
    FROM "UserGrievance" g1
    LEFT JOIN "UserGrievance" g2 
      ON g1.id != g2.id 
      AND g1.department_id = g2.department_id
      AND 1 - (g1.embedding <=> g2.embedding) >= cluster_threshold
    WHERE g1.department_id = dept_id
      AND g1.embedding IS NOT NULL
    GROUP BY g1.id, g1.grievance_text
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY similar_count DESC)::int as cluster_id,
    similar_count as grievance_count,
    grievance_text as sample_text,
    avg_sim as avg_similarity
  FROM clustered
  WHERE similar_count > 0
  ORDER BY similar_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a table for storing embedding metadata
CREATE TABLE IF NOT EXISTS "EmbeddingMetadata" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  entity_type varchar(50) NOT NULL, -- 'grievance', 'policy', 'faq'
  entity_id uuid NOT NULL,
  model_name varchar(100) DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
  embedding_dimension int DEFAULT 384,
  
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_embedding_metadata_entity ON "EmbeddingMetadata"(entity_type, entity_id);

-- Create a table for policy documents with embeddings
CREATE TABLE IF NOT EXISTS "PolicyDocuments" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  title varchar(500) NOT NULL,
  content text NOT NULL,
  department_id uuid REFERENCES "Departments"(id) ON DELETE SET NULL,
  document_url text,
  
  embedding vector(384),
  metadata jsonb,
  
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_policy_embedding ON "PolicyDocuments" 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_policy_department ON "PolicyDocuments"(department_id);

-- Function to find relevant policies for a grievance
CREATE OR REPLACE FUNCTION find_relevant_policies(
  query_embedding vector(384),
  dept_id uuid DEFAULT NULL,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title varchar,
  content text,
  document_url text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.document_url,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM "PolicyDocuments" p
  WHERE p.embedding IS NOT NULL
    AND p.is_active = true
    AND (dept_id IS NULL OR p.department_id = dept_id)
  ORDER BY p.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create FAQ table with embeddings
CREATE TABLE IF NOT EXISTS "FAQs" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  question text NOT NULL,
  answer text NOT NULL,
  category varchar(100),
  department_id uuid REFERENCES "Departments"(id) ON DELETE SET NULL,
  
  embedding vector(384),
  view_count int DEFAULT 0,
  helpful_count int DEFAULT 0,
  
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_faq_embedding ON "FAQs" 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

-- Function to find relevant FAQs
CREATE OR REPLACE FUNCTION find_relevant_faqs(
  query_embedding vector(384),
  max_results int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category varchar,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.category,
    1 - (f.embedding <=> query_embedding) as similarity
  FROM "FAQs" f
  WHERE f.embedding IS NOT NULL
    AND f.is_active = true
  ORDER BY f.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create a view for grievance analytics with vector similarity
CREATE OR REPLACE VIEW "GrievanceAnalytics" AS
SELECT 
  g.id,
  g.grievance_text,
  g.category,
  g.status,
  g.priority,
  g.created_at,
  g.department_id,
  d.name as department_name,
  u.full_name as citizen_name,
  o.full_name as officer_name,
  CASE 
    WHEN g.embedding IS NOT NULL THEN true 
    ELSE false 
  END as has_embedding,
  g.sentiment_priority,
  g.emotion,
  g.severity
FROM "UserGrievance" g
LEFT JOIN "Departments" d ON g.department_id = d.id
LEFT JOIN "Users" u ON g.user_id = u.id
LEFT JOIN "Users" o ON g.assigned_officer_id = o.id;

-- Record this migration
INSERT INTO "Migrations" (migration_name) 
VALUES ('003_vector_enhancements') 
ON CONFLICT (migration_name) DO NOTHING;
