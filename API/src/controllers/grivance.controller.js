const grievanceService = require('../services/grivience.services');

class GrievanceController {
    async submitGrievance(req, res) {
        try {
            const { query, userId, userName } = req.body;
            const proofFile = req.file;

            // Validation
            if (!query || !query.trim()) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Query is required!' 
                });
            }

            if (!proofFile) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Proof document (image or PDF) is mandatory!' 
                });
            }

            // Process grievance
            const result = await grievanceService.submitGrievance({
                query,
                userId,
                userName
            }, proofFile);

            res.json(result);

        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error. Please try again later.',
                error: error.message
            });
        }
    }

    async healthCheck(req, res) {
        res.json({ 
            success: true, 
            message: 'Grievance API is running!', 
            timestamp: new Date().toISOString() 
        });
    }
}

module.exports = new GrievanceController();