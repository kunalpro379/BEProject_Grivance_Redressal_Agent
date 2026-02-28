-- Add department_id column to contractors table
ALTER TABLE public.contractors 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- Get Water & Sanitation department ID (replace with actual ID from your database)
-- Run this first to get the department ID:
-- SELECT id, name FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%';

-- Then replace 'YOUR_WATER_DEPT_ID_HERE' below with the actual UUID

-- Insert Water Department Contractors
INSERT INTO public.contractors (
  contractor_id, company_name, contact_person, phone, email, address,
  specialization, performance_score, active_projects, completed_projects,
  avg_completion_time, contract_value, is_active, ai_analysis, department_id
) VALUES
(
  'CONT-WAT-2024-001',
  'AquaTech Solutions Pvt Ltd',
  'Suresh Patil',
  '+91-9876501234',
  'suresh@aquatech.com',
  'Water Works Complex, Ambernath East',
  'Water Pipeline Installation, Leak Detection',
  93.8,
  5,
  38,
  28,
  28000000,
  true,
  '{"project_types_accepted": ["Water Pipeline Installation", "Leak Detection & Repair", "Water Tank Construction", "Pump Installation"], "resources_available": {"workers": 72, "equipment": ["Pipe Laying Machines (4)", "Leak Detection Equipment (8)", "Welding Units (10)", "Excavators (3)", "Water Tankers (6)"], "vehicles": 20}, "work_history": {"active_projects": 5, "completed_projects": 38, "success_rate": 94.7, "avg_project_duration": 28, "on_time_delivery_rate": 92.1}, "performance_insights": {"strengths": ["Advanced leak detection technology", "Quick response time", "Minimal water wastage", "Quality pipeline work"], "areas_for_improvement": ["Documentation updates"], "risk_level": "Very Low", "reliability_score": 9.3}, "financial_summary": {"total_contract_value": 28000000, "pending_payments": 3800000, "payment_reliability": "Excellent", "credit_rating": "AAA"}}'::jsonb,
  (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
),
(
  'CONT-WAT-2024-002',
  'HydroFlow Engineering',
  'Meera Kulkarni',
  '+91-9823401234',
  'meera@hydroflow.com',
  'Industrial Area, Ambernath West',
  'Water Treatment, Filtration Systems',
  91.2,
  4,
  31,
  32,
  24000000,
  true,
  '{"project_types_accepted": ["Water Treatment Plants", "Filtration Systems", "Water Quality Testing", "Purification Units"], "resources_available": {"workers": 58, "equipment": ["Filtration Units (6)", "Testing Labs (2)", "Chemical Dosing Systems (4)", "Pumps (12)", "Trucks (5)"], "vehicles": 15}, "work_history": {"active_projects": 4, "completed_projects": 31, "success_rate": 93.5, "avg_project_duration": 32, "on_time_delivery_rate": 90.3}, "performance_insights": {"strengths": ["Water quality expertise", "Modern filtration technology", "Certified technicians", "Compliance with standards"], "areas_for_improvement": ["Project timeline optimization"], "risk_level": "Low", "reliability_score": 9.1}, "financial_summary": {"total_contract_value": 24000000, "pending_payments": 3200000, "payment_reliability": "Excellent", "credit_rating": "AAA"}}'::jsonb,
  (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
),
(
  'CONT-WAT-2024-003',
  'PureWater Infrastructure Ltd',
  'Rajesh Desai',
  '+91-9765401234',
  'rajesh@purewater.com',
  'Municipal Complex, Ambernath',
  'Water Storage Tanks, Overhead Reservoirs',
  89.5,
  3,
  26,
  35,
  21000000,
  true,
  '{"project_types_accepted": ["Water Storage Tanks", "Overhead Reservoirs", "Underground Tanks", "Tank Cleaning & Maintenance"], "resources_available": {"workers": 45, "equipment": ["Cranes (2)", "Welding Equipment (8)", "Tank Cleaning Robots (3)", "Excavators (2)", "Trucks (4)"], "vehicles": 12}, "work_history": {"active_projects": 3, "completed_projects": 26, "success_rate": 92.3, "avg_project_duration": 35, "on_time_delivery_rate": 88.4}, "performance_insights": {"strengths": ["Tank construction expertise", "Quality materials", "Safety protocols", "Maintenance services"], "areas_for_improvement": ["Resource allocation", "Timeline management"], "risk_level": "Low", "reliability_score": 8.9}, "financial_summary": {"total_contract_value": 21000000, "pending_payments": 2800000, "payment_reliability": "Very Good", "credit_rating": "AA"}}'::jsonb,
  (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
),
(
  'CONT-WAT-2024-004',
  'Sewage Solutions India',
  'Anjali Sharma',
  '+91-9834501234',
  'anjali@sewagesolutions.com',
  'Sanitation Depot, Ambernath East',
  'Sewage Treatment, Drainage Systems',
  87.8,
  4,
  29,
  38,
  26000000,
  true,
  '{"project_types_accepted": ["Sewage Treatment Plants", "Drainage Systems", "Septic Tank Installation", "Wastewater Management"], "resources_available": {"workers": 62, "equipment": ["Excavators (4)", "Suction Machines (6)", "Jetting Machines (5)", "Treatment Units (3)", "Trucks (8)"], "vehicles": 18}, "work_history": {"active_projects": 4, "completed_projects": 29, "success_rate": 89.6, "avg_project_duration": 38, "on_time_delivery_rate": 86.2}, "performance_insights": {"strengths": ["Sewage treatment expertise", "Environmental compliance", "Modern equipment", "Emergency response"], "areas_for_improvement": ["Project completion time", "Documentation"], "risk_level": "Low", "reliability_score": 8.7}, "financial_summary": {"total_contract_value": 26000000, "pending_payments": 3500000, "payment_reliability": "Very Good", "credit_rating": "AA"}}'::jsonb,
  (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
),
(
  'CONT-WAT-2024-005',
  'CleanFlow Systems',
  'Vikram Joshi',
  '+91-9712401234',
  'vikram@cleanflow.com',
  'Water Supply Zone, Ambernath West',
  'Water Distribution, Meter Installation',
  90.4,
  6,
  34,
  25,
  19000000,
  true,
  '{"project_types_accepted": ["Water Distribution Networks", "Meter Installation", "Valve Replacement", "Connection Services"], "resources_available": {"workers": 68, "equipment": ["Pipe Cutters (12)", "Threading Machines (8)", "Meters (500+)", "Testing Equipment (6)", "Trucks (7)"], "vehicles": 16}, "work_history": {"active_projects": 6, "completed_projects": 34, "success_rate": 94.1, "avg_project_duration": 25, "on_time_delivery_rate": 91.1}, "performance_insights": {"strengths": ["Fast installation", "Large workforce", "Quality meters", "Customer service"], "areas_for_improvement": ["Equipment maintenance"], "risk_level": "Very Low", "reliability_score": 9.0}, "financial_summary": {"total_contract_value": 19000000, "pending_payments": 2400000, "payment_reliability": "Excellent", "credit_rating": "AAA"}}'::jsonb,
  (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
),
(
  'CONT-WAT-2024-006',
  'DrainTech Professionals',
  'Priya Reddy',
  '+91-9898401234',
  'priya@draintech.com',
  'Drainage Division, Ambernath',
  'Drain Cleaning, Sewer Maintenance',
  86.3,
  3,
  22,
  30,
  15000000,
  true,
  '{"project_types_accepted": ["Drain Cleaning", "Sewer Line Maintenance", "Blockage Removal", "CCTV Inspection"], "resources_available": {"workers": 38, "equipment": ["Jetting Machines (6)", "CCTV Cameras (4)", "Suction Trucks (4)", "Rodding Equipment (10)", "Safety Gear"], "vehicles": 10}, "work_history": {"active_projects": 3, "completed_projects": 22, "success_rate": 90.9, "avg_project_duration": 30, "on_time_delivery_rate": 86.3}, "performance_insights": {"strengths": ["Emergency response", "CCTV inspection capability", "Experienced team", "Safety focus"], "areas_for_improvement": ["Equipment upgrades", "Response time"], "risk_level": "Medium", "reliability_score": 8.6}, "financial_summary": {"total_contract_value": 15000000, "pending_payments": 2000000, "payment_reliability": "Good", "credit_rating": "A"}}'::jsonb,
  (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
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
  ai_analysis = EXCLUDED.ai_analysis,
  department_id = EXCLUDED.department_id,
  updated_at = now();

-- Verify the results
SELECT 
  c.contractor_id,
  c.company_name,
  c.performance_score,
  c.active_projects,
  c.completed_projects,
  c.ai_analysis->'resources_available'->>'workers' as workers,
  c.ai_analysis->'work_history'->>'success_rate' as success_rate,
  c.ai_analysis->'performance_insights'->>'risk_level' as risk_level,
  d.name as department_name
FROM public.contractors c
LEFT JOIN public.departments d ON c.department_id = d.id
WHERE c.department_id = (SELECT id FROM public.departments WHERE name ILIKE '%water%' OR name ILIKE '%sanitation%' LIMIT 1)
ORDER BY c.performance_score DESC;
