-- Create department complaints analysis cache table
-- This table stores AI-generated analysis of citizen complaints per department
-- to avoid regenerating the same analysis repeatedly

CREATE TABLE IF NOT EXISTS department_complaints_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Summary metrics
  total_complaints INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  
  -- AI-generated content
  summary TEXT,
  sentiment_analysis JSONB, -- {positive, neutral, negative} percentages
  category_breakdown JSONB, -- Array of {category, count, percentage}
  status_distribution JSONB, -- Array of {status, count, percentage}
  priority_distribution JSONB, -- Array of {priority, count, percentage}
  top_issues JSONB, -- Array of top recurring issues
  geographic_hotspots JSONB, -- Array of zones/wards with most complaints
  key_insights JSONB, -- Array of actionable insights
  recommendations JSONB, -- Array of recommendations
  trends JSONB, -- Array of identified trends
  urgent_matters JSONB, -- Array of urgent issues
  citizen_satisfaction VARCHAR(100), -- Overall satisfaction assessment
  
  -- Metadata
  analyzed_by VARCHAR(100) DEFAULT 'DeepSeek AI',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dept_complaints_analysis_dept 
ON department_complaints_analysis(department_id);

CREATE INDEX IF NOT EXISTS idx_dept_complaints_analysis_date 
ON department_complaints_analysis(analysis_date DESC);

-- Create composite index for cache lookup
CREATE INDEX IF NOT EXISTS idx_dept_complaints_analysis_lookup 
ON department_complaints_analysis(department_id, analysis_date DESC);

-- Add comment
COMMENT ON TABLE department_complaints_analysis IS 'Caches AI-generated analysis of citizen complaints per department to reduce API calls';

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'department_complaints_analysis'
ORDER BY ordinal_position;

-- Show indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'department_complaints_analysis';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ department_complaints_analysis table created successfully!';
  RAISE NOTICE '📊 Department complaints analysis caching is now enabled';
  RAISE NOTICE '💡 Analysis will be cached for 24 hours to reduce API calls';
END $$;
