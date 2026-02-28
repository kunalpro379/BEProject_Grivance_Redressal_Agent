-- Add ai_analysis column to contractors table
ALTER TABLE public.contractors 
ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT '{}'::jsonb;

-- Update existing contractors with AI analysis data
UPDATE public.contractors
SET ai_analysis = jsonb_build_object(
  'project_types_accepted', ARRAY['Road Construction', 'Water Supply', 'Drainage Systems'],
  'resources_available', jsonb_build_object(
    'workers', 45,
    'equipment', jsonb_build_array('Excavators', 'Bulldozers', 'Concrete Mixers', 'Trucks'),
    'vehicles', 12
  ),
  'work_history', jsonb_build_object(
    'active_projects', 3,
    'completed_projects', 28,
    'success_rate', 92.5,
    'avg_project_duration', 45
  ),
  'performance_insights', jsonb_build_object(
    'strengths', ARRAY['On-time delivery', 'Quality workmanship', 'Good communication'],
    'areas_for_improvement', ARRAY['Cost management'],
    'risk_level', 'Low'
  ),
  'financial_summary', jsonb_build_object(
    'total_contract_value', 15000000,
    'pending_payments', 2500000,
    'payment_reliability', 'Excellent'
  )
)
WHERE contractor_id LIKE 'CONT-%';

-- Insert dummy contractors data
INSERT INTO public.contractors (
  contractor_id,
  company_name,
  contact_person,
  phone,
  email,
  address,
  specialization,
  performance_score,
  active_projects,
  completed_projects,
  avg_completion_time,
  contract_value,
  is_active,
  ai_analysis
) VALUES
(
  'CONT-2024-001',
  'Ambernath Infrastructure Pvt Ltd',
  'Rajesh Kumar',
  '+91-9876543210',
  'rajesh@ambernathinfra.com',
  'Plot 45, MIDC Area, Ambernath East',
  'Road Construction, Drainage Systems',
  94.5,
  4,
  32,
  42,
  25000000,
  true,
  jsonb_build_object(
    'project_types_accepted', ARRAY['Road Construction', 'Bridge Construction', 'Drainage Systems', 'Street Lighting'],
    'resources_available', jsonb_build_object(
      'workers', 65,
      'equipment', jsonb_build_array('Excavators (5)', 'Bulldozers (3)', 'Concrete Mixers (4)', 'Paver Machines (2)', 'Trucks (8)'),
      'vehicles', 18
    ),
    'work_history', jsonb_build_object(
      'active_projects', 4,
      'completed_projects', 32,
      'success_rate', 96.8,
      'avg_project_duration', 42,
      'on_time_delivery_rate', 93.7
    ),
    'performance_insights', jsonb_build_object(
      'strengths', ARRAY['Excellent on-time delivery', 'High-quality workmanship', 'Strong project management', 'Good safety record'],
      'areas_for_improvement', ARRAY['Documentation could be more detailed'],
      'risk_level', 'Very Low',
      'reliability_score', 9.4
    ),
    'financial_summary', jsonb_build_object(
      'total_contract_value', 25000000,
      'pending_payments', 3500000,
      'payment_reliability', 'Excellent',
      'credit_rating', 'AAA'
    )
  )
),
(
  'CONT-2024-002',
  'Shivaji Construction Co',
  'Priya Sharma',
  '+91-9823456789',
  'priya@shivajiconstruction.com',
  'Sector 12, Ambernath West',
  'Water Supply, Sanitation',
  88.2,
  3,
  24,
  38,
  18000000,
  true,
  jsonb_build_object(
    'project_types_accepted', ARRAY['Water Supply Systems', 'Sewage Treatment', 'Pipeline Installation', 'Pump House Construction'],
    'resources_available', jsonb_build_object(
      'workers', 48,
      'equipment', jsonb_build_array('Pipe Laying Machines (3)', 'Welding Equipment (6)', 'Excavators (2)', 'Trucks (5)', 'Testing Equipment'),
      'vehicles', 12
    ),
    'work_history', jsonb_build_object(
      'active_projects', 3,
      'completed_projects', 24,
      'success_rate', 91.6,
      'avg_project_duration', 38,
      'on_time_delivery_rate', 87.5
    ),
    'performance_insights', jsonb_build_object(
      'strengths', ARRAY['Specialized in water systems', 'Technical expertise', 'Quality materials', 'Good coordination'],
      'areas_for_improvement', ARRAY['Timeline management', 'Resource allocation'],
      'risk_level', 'Low',
      'reliability_score', 8.8
    ),
    'financial_summary', jsonb_build_object(
      'total_contract_value', 18000000,
      'pending_payments', 2800000,
      'payment_reliability', 'Very Good',
      'credit_rating', 'AA'
    )
  )
),
(
  'CONT-2024-003',
  'Maharashtra Roads & Bridges Ltd',
  'Amit Deshmukh',
  '+91-9765432109',
  'amit@mrbridges.com',
  'Industrial Estate, Ambernath',
  'Road Repair, Bridge Maintenance',
  91.7,
  5,
  41,
  35,
  32000000,
  true,
  jsonb_build_object(
    'project_types_accepted', ARRAY['Road Repair', 'Bridge Construction', 'Flyover Maintenance', 'Highway Projects'],
    'resources_available', jsonb_build_object(
      'workers', 82,
      'equipment', jsonb_build_array('Asphalt Pavers (4)', 'Road Rollers (6)', 'Excavators (4)', 'Cranes (2)', 'Trucks (12)', 'Testing Lab'),
      'vehicles', 24
    ),
    'work_history', jsonb_build_object(
      'active_projects', 5,
      'completed_projects', 41,
      'success_rate', 95.1,
      'avg_project_duration', 35,
      'on_time_delivery_rate', 92.6
    ),
    'performance_insights', jsonb_build_object(
      'strengths', ARRAY['Large-scale project experience', 'Modern equipment', 'Skilled workforce', 'Strong safety protocols'],
      'areas_for_improvement', ARRAY['Communication during delays'],
      'risk_level', 'Very Low',
      'reliability_score', 9.2
    ),
    'financial_summary', jsonb_build_object(
      'total_contract_value', 32000000,
      'pending_payments', 4200000,
      'payment_reliability', 'Excellent',
      'credit_rating', 'AAA'
    )
  )
),
(
  'CONT-2024-004',
  'Green City Developers',
  'Sneha Patil',
  '+91-9834567890',
  'sneha@greencitydev.com',
  'Green Park, Ambernath East',
  'Waste Management, Sanitation',
  85.3,
  2,
  18,
  45,
  12000000,
  true,
  jsonb_build_object(
    'project_types_accepted', ARRAY['Waste Management', 'Garbage Collection Systems', 'Composting Units', 'Sanitation Facilities'],
    'resources_available', jsonb_build_object(
      'workers', 35,
      'equipment', jsonb_build_array('Garbage Trucks (4)', 'Compactors (2)', 'Shredders (3)', 'Composting Equipment'),
      'vehicles', 8
    ),
    'work_history', jsonb_build_object(
      'active_projects', 2,
      'completed_projects', 18,
      'success_rate', 88.8,
      'avg_project_duration', 45,
      'on_time_delivery_rate', 83.3
    ),
    'performance_insights', jsonb_build_object(
      'strengths', ARRAY['Environmental focus', 'Innovative solutions', 'Community engagement'],
      'areas_for_improvement', ARRAY['Project timeline adherence', 'Equipment maintenance'],
      'risk_level', 'Medium',
      'reliability_score', 8.5
    ),
    'financial_summary', jsonb_build_object(
      'total_contract_value', 12000000,
      'pending_payments', 1800000,
      'payment_reliability', 'Good',
      'credit_rating', 'A'
    )
  )
),
(
  'CONT-2024-005',
  'Urban Solutions Engineering',
  'Vikram Joshi',
  '+91-9712345678',
  'vikram@urbansolutions.com',
  'Tech Park, Ambernath West',
  'Street Lighting, Electrical Works',
  89.6,
  3,
  27,
  40,
  15000000,
  true,
  jsonb_build_object(
    'project_types_accepted', ARRAY['Street Lighting', 'Electrical Infrastructure', 'Solar Panel Installation', 'Smart City Solutions'],
    'resources_available', jsonb_build_object(
      'workers', 42,
      'equipment', jsonb_build_array('Hydraulic Lifts (3)', 'Cable Laying Equipment', 'Testing Instruments', 'Trucks (6)'),
      'vehicles', 10
    ),
    'work_history', jsonb_build_object(
      'active_projects', 3,
      'completed_projects', 27,
      'success_rate', 92.5,
      'avg_project_duration', 40,
      'on_time_delivery_rate', 88.8
    ),
    'performance_insights', jsonb_build_object(
      'strengths', ARRAY['Technical expertise', 'Energy-efficient solutions', 'Good documentation', 'Safety compliance'],
      'areas_for_improvement', ARRAY['Resource planning'],
      'risk_level', 'Low',
      'reliability_score', 9.0
    ),
    'financial_summary', jsonb_build_object(
      'total_contract_value', 15000000,
      'pending_payments', 2100000,
      'payment_reliability', 'Very Good',
      'credit_rating', 'AA'
    )
  )
),
(
  'CONT-2024-006',
  'Kalyan-Dombivli Infrastructure',
  'Rahul Mehta',
  '+91-9898765432',
  'rahul@kdinfra.com',
  'Station Road, Ambernath',
  'Multi-purpose Infrastructure',
  87.4,
  4,
  29,
  48,
  22000000,
  true,
  jsonb_build_object(
    'project_types_accepted', ARRAY['Road Construction', 'Water Supply', 'Drainage', 'Building Construction', 'Park Development'],
    'resources_available', jsonb_build_object(
      'workers', 58,
      'equipment', jsonb_build_array('Excavators (3)', 'Concrete Mixers (3)', 'Trucks (7)', 'Cranes (1)', 'Various Tools'),
      'vehicles', 14
    ),
    'work_history', jsonb_build_object(
      'active_projects', 4,
      'completed_projects', 29,
      'success_rate', 89.6,
      'avg_project_duration', 48,
      'on_time_delivery_rate', 86.2
    ),
    'performance_insights', jsonb_build_object(
      'strengths', ARRAY['Versatile capabilities', 'Local knowledge', 'Good stakeholder management'],
      'areas_for_improvement', ARRAY['Project completion time', 'Cost control'],
      'risk_level', 'Medium',
      'reliability_score', 8.7
    ),
    'financial_summary', jsonb_build_object(
      'total_contract_value', 22000000,
      'pending_payments', 3300000,
      'payment_reliability', 'Good',
      'credit_rating', 'A'
    )
  )
)
ON CONFLICT (contractor_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  contact_person = EXCLUDED.contact_person,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  specialization = EXCLUDED.specialization,
  performance_score = EXCLUDED.performance_score,
  active_projects = EXCLUDED.active_projects,
  completed_projects = EXCLUDED.completed_projects,
  avg_completion_time = EXCLUDED.avg_completion_time,
  contract_value = EXCLUDED.contract_value,
  is_active = EXCLUDED.is_active,
  ai_analysis = EXCLUDED.ai_analysis,
  updated_at = now();

-- Verify the changes
SELECT 
  contractor_id,
  company_name,
  performance_score,
  active_projects,
  completed_projects,
  ai_analysis->>'project_types_accepted' as project_types,
  ai_analysis->'resources_available'->>'workers' as workers,
  ai_analysis->'work_history'->>'success_rate' as success_rate
FROM public.contractors
WHERE is_active = true
ORDER BY performance_score DESC;
