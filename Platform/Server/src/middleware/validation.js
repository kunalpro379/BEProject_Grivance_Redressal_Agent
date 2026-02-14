import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ errors });
    }
    
    next();
  };
};

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    address: Joi.string().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    role: Joi.string().valid('citizen', 'department_officer', 'department_head', 'admin').required(),
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
