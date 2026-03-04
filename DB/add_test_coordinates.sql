-- Add test coordinates to spread markers across Ambernath area
-- This will make the map visualization work properly

-- Update grievance_processed with random coordinates around Ambernath
UPDATE grievance_processed 
SET 
  latitude = 19.1975 + (random() * 0.08 - 0.04),  -- Spread ±4km north-south
  longitude = 73.194 + (random() * 0.08 - 0.04),  -- Spread ±4km east-west
  location_address = CASE 
    WHEN location_address IS NULL OR location_address = '' 
    THEN 'Ambernath Area ' || substring(grievance_id from 1 for 8)
    ELSE location_address
  END,
  extracted_location = jsonb_build_object(
    'source', 'test_data',
    'context', 'Test coordinates for visualization',
    'coordinates', jsonb_build_object(
      'latitude', 19.1975 + (random() * 0.08 - 0.04),
      'longitude', 73.194 + (random() * 0.08 - 0.04)
    )
  )
WHERE latitude IS NULL 
   OR (latitude BETWEEN 19.195 AND 19.200 AND longitude BETWEEN 73.192 AND 73.196);

-- Show results
SELECT 
  grievance_id,
  ROUND(latitude::numeric, 6) as lat,
  ROUND(longitude::numeric, 6) as lng,
  location_address
FROM grievance_processed
WHERE latitude IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Show coordinate spread
SELECT 
  COUNT(*) as total_with_coords,
  ROUND(MIN(latitude)::numeric, 6) as min_lat,
  ROUND(MAX(latitude)::numeric, 6) as max_lat,
  ROUND(MIN(longitude)::numeric, 6) as min_lng,
  ROUND(MAX(longitude)::numeric, 6) as max_lng,
  ROUND((MAX(latitude) - MIN(latitude))::numeric, 6) as lat_range,
  ROUND((MAX(longitude) - MIN(longitude))::numeric, 6) as lng_range
FROM grievance_processed
WHERE latitude IS NOT NULL;
