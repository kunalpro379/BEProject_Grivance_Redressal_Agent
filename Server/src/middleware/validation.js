import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      console.log('Validation failed:', errors);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        errors 
      });
    }
    
    next();
  };
};

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^[+]?[0-9\s\-()]{10,15}$/).optional().allow(''),
    address: Joi.string().optional().allow(''),
    date_of_birth: Joi.date().optional().allow(null, ''),
    gender: Joi.string().valid('male', 'female', 'other').optional().allow(''),
    aadhaar_number: Joi.string().pattern(/^[0-9]{12}$/).optional().allow(''),
    occupation: Joi.string().optional().allow(''),
    // Department officer registration fields
    role: Joi.string().valid('citizen', 'department_officer', 'department_head', 'admin', 'ward_officer', 'city_commissioner', 'district_collector', 'government_official').optional().allow(''),
    role_id: Joi.string().uuid().optional().allow(''), // Government role ID from government_roles table
    department_id: Joi.string().uuid().optional().allow(''),
    department_name: Joi.string().optional().allow(''),
    designation: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    ward: Joi.string().optional().allow(''),
    zone: Joi.string().optional().allow(''),
    official_type: Joi.string().optional().allow(''),
    district: Joi.string().optional().allow(''),
    hierarchy_level: Joi.string().optional().allow('', null),
    level_type: Joi.string().optional().allow(''),
    ministry_name: Joi.string().optional().allow(''),
    taluka: Joi.string().optional().allow(''),
    block_name: Joi.string().optional().allow(''),
    corporation_name: Joi.string().optional().allow(''),
    jurisdiction: Joi.string().optional().allow('')
    // Note: If role is not provided, defaults to 'citizen'
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),

  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    role: Joi.string().valid('citizen', 'department_officer', 'department_head', 'admin', 'ward_officer', 'city_commissioner', 'district_collector').required(),
    department_id: Joi.string().uuid().optional(),
    address: Joi.string().optional()
  }),

  updateUser: Joi.object({
    full_name: Joi.string().min(2).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    department_id: Joi.string().uuid().optional(),
    address: Joi.string().optional()
  }),

  createGrievance: Joi.object({
    grievance_text: Joi.string().min(10).required(),
    image_path: Joi.string().optional(),
    category: Joi.object().optional()
  }),

  updateGrievance: Joi.object({
    status: Joi.string().valid('pending', 'in_progress', 'resolved', 'rejected', 'escalated').optional(),
    assigned_officer_id: Joi.string().uuid().optional(),
    resolution_text: Joi.string().optional()
  })
};
