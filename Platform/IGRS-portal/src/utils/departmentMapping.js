// Department name to ID mapping
export const departmentMapping = {
  'Water Supply Department': 'DEPT_WATER_001',
  'Municipal Corporation': 'DEPT_MUNICIPAL_001',
  'Public Works Department': 'DEPT_PWD_001',
  'Health Department': 'DEPT_HEALTH_001',
  'Education Department': 'DEPT_EDU_001',
  'Transport Department': 'DEPT_TRANSPORT_001',
  'Electricity Department': 'DEPT_ELEC_001',
  'Revenue Department': 'DEPT_REVENUE_001'
};

// Get department ID from name
export const getDepartmentId = (departmentName) => {
  return departmentMapping[departmentName] || null; // Return null instead of hardcoded default
};

// Get department name from ID
export const getDepartmentName = (departmentId) => {
  return Object.keys(departmentMapping).find(key => departmentMapping[key] === departmentId) || 'Water Supply Department';
};
