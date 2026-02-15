import citizenService from '../services/citizen.service.js';

class CitizenController {
    /**
     * Register a new citizen
     */
    async register(req, res) {
        try {
            const {
                telegram_id,
                phone,
                username,
                full_name,
                latitude,
                longitude,
                location_address
            } = req.body;

            // Validation
            if (!telegram_id || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'telegram_id and phone are required'
                });
            }

            const result = await citizenService.registerCitizen({
                telegram_id,
                phone,
                username,
                full_name,
                latitude,
                longitude,
                location_address
            });

            res.json(result);
        } catch (error) {
            console.error('Register citizen error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to register citizen',
                error: error.message
            });
        }
    }

    /**
     * Get citizen by telegram_id
     */
    async getCitizen(req, res) {
        try {
            const { telegram_id } = req.params;

            if (!telegram_id) {
                return res.status(400).json({
                    success: false,
                    message: 'telegram_id is required'
                });
            }

            const citizen = await citizenService.getCitizenByTelegramId(parseInt(telegram_id));

            if (!citizen) {
                return res.status(404).json({
                    success: false,
                    message: 'Citizen not found'
                });
            }

            res.json({
                success: true,
                data: citizen
            });
        } catch (error) {
            console.error('Get citizen error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch citizen',
                error: error.message
            });
        }
    }

    /**
     * Update citizen location
     */
    async updateLocation(req, res) {
        try {
            const { telegram_id } = req.params;
            const { latitude, longitude, location_address } = req.body;

            if (!telegram_id || !latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'telegram_id, latitude, and longitude are required'
                });
            }

            const result = await citizenService.updateLocation(
                parseInt(telegram_id),
                latitude,
                longitude,
                location_address
            );

            res.json(result);
        } catch (error) {
            console.error('Update location error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update location',
                error: error.message
            });
        }
    }

    /**
     * Get all grievances for a citizen
     */
    async getGrievances(req, res) {
        try {
            const { telegram_id } = req.params;

            if (!telegram_id) {
                return res.status(400).json({
                    success: false,
                    message: 'telegram_id is required'
                });
            }

            const result = await citizenService.getCitizenGrievances(parseInt(telegram_id));

            res.json(result);
        } catch (error) {
            console.error('Get grievances error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch grievances',
                error: error.message
            });
        }
    }
}

const citizenController = new CitizenController();
export const register = citizenController.register.bind(citizenController);
export const getCitizen = citizenController.getCitizen.bind(citizenController);
export const updateLocation = citizenController.updateLocation.bind(citizenController);
export const getGrievances = citizenController.getGrievances.bind(citizenController);
