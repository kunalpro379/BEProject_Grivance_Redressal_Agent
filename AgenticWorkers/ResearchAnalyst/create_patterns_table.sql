-- Create grievance_patterns table for pattern-based research caching
-- This table stores research patterns to enable 95% cost reduction through pattern reuse

CREATE TABLE IF NOT EXISTS public.grievance_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pattern identification
    pattern_name VARCHAR(255) NOT NULL,
    pattern_description TEXT,
    keywords TEXT[],
    
    -- Pattern embedding for similarity search
    embedding vector(1536),
    
    -- Cached research data
    research_report JSONB NOT NULL DEFAULT '{}',
    research_sources JSONB NOT NULL DEFAULT '[]',
    
    -- Pattern metadata
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Pattern quality metrics
    avg_similarity_score NUMERIC(5,4),
    success_rate NUMERIC(5,4),
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- Create index on embedding for fast similarity search
CREATE INDEX IF NOT EXISTS idx_grievance_patterns_embedding 
ON public.grievance_patterns USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on pattern_name for lookups
CREATE INDEX IF NOT EXISTS idx_grievance_patterns_name 
ON public.grievance_patterns(pattern_name);

-- Create index on keywords for search
CREATE INDEX IF NOT EXISTS idx_grievance_patterns_keywords 
ON public.grievance_patterns USING gin(keywords);

-- Create grievance_pattern_links table to track which grievances use which patterns
CREATE TABLE IF NOT EXISTS public.grievance_pattern_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    grievance_id VARCHAR(255) NOT NULL,
    pattern_id UUID NOT NULL REFERENCES public.grievance_patterns(id) ON DELETE CASCADE,
    
    similarity_score NUMERIC(5,4) NOT NULL,
    
    -- Prevent duplicate links
    UNIQUE(grievance_id, pattern_id)
);

-- Create index on grievance_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_grievance_pattern_links_grievance 
ON public.grievance_pattern_links(grievance_id);

-- Create index on pattern_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_grievance_pattern_links_pattern 
ON public.grievance_pattern_links(pattern_id);

-- Add comment
COMMENT ON TABLE public.grievance_patterns IS 'Stores research patterns for pattern-based caching to reduce research costs by 95%';
COMMENT ON TABLE public.grievance_pattern_links IS 'Links grievances to their matched patterns for tracking and analytics';
