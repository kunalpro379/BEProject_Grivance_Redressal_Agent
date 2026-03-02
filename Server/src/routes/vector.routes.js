import express from 'express';
import * as vectorController from '../controllers/vector.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Search and similarity endpoints
router.post('/similar-grievances', vectorController.findSimilarGrievances);
router.post('/similar-resolved', vectorController.findSimilarResolved);
router.post('/relevant-policies', vectorController.findRelevantPolicies);
router.post('/relevant-faqs', vectorController.findRelevantFAQs);
router.post('/search', vectorController.searchGrievances);

// REACT Agent endpoint for guaranteed policy retrieval
router.get('/policies/department/:departmentId/react',
  authorize('admin', 'department_head', 'department_officer', 'citizen'),
  vectorController.getDepartmentPoliciesReact
);

// Department analytics
router.get('/clusters/:departmentId', 
  authorize('admin', 'department_head', 'department_officer'),
  vectorController.getDepartmentClusters
);

// Embedding management (admin/officer only)
router.post('/embeddings/:grievanceId',
  authorize('admin', 'department_officer', 'department_head'),
  vectorController.storeEmbedding
);

router.post('/embeddings/batch',
  authorize('admin'),
  vectorController.batchUpdateEmbeddings
);

router.get('/unprocessed',
  authorize('admin', 'department_officer'),
  vectorController.getUnprocessedGrievances
);

// Policy and FAQ management (admin only)
router.post('/policies',
  authorize('admin', 'department_head'),
  vectorController.addPolicy
);

router.post('/faqs',
  authorize('admin', 'department_head'),
  vectorController.addFAQ
);

export default router;
