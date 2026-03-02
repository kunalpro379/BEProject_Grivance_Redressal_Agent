import { query } from '../config/database.js';

// Detect which table name exists in the database
let CITIZENS_TABLE = 'citizens'; // default lowercase

async function detectTableName() {
    try {
        // Try lowercase first
        await query(`SELECT 1 FROM citizens LIMIT 1`);
        CITIZENS_TABLE = 'citizens';
        return 'citizens';
    } catch (error) {
        // Try uppercase
        try {
            await query(`SELECT 1 FROM "Citizens" LIMIT 1`);
            CITIZENS_TABLE = '"Citizens"';
            return '"Citizens"';
        } catch (err) {
            console.error('Neither citizens nor Citizens table found');
            return 'citizens'; // fallback
        }
    }
}

// Initialize table name detection
detectTableName().then(tableName => {
    console.log(`Using citizens table: ${tableName}`);
});

class CitizenService {
    /**
     * Register or update citizen from Telegram
     */
    async registerCitizen(citizenData) {
        const {
            telegram_id,
            phone,
            username,
            full_name,
            latitude,
            longitude,
            location_address
        } = citizenData;

        try {
            const result = await query(
                `SELECT register_citizen($1, $2, $3, $4, $5, $6, $7) as citizen_id`,
                [
                    telegram_id,
                    phone,
                    username || null,
                    full_name || null,
                    latitude || null,
                    longitude || null,
                    location_address || null
                ]
            );

            return {
                success: true,
                citizen_id: result.rows[0].citizen_id,
                message: 'Citizen registered successfully'
            };
        } catch (error) {
            console.error('Error registering citizen:', error);
            throw error;
        }
    }

    /**
     * Get citizen by telegram_id
     */
    async getCitizenByTelegramId(telegram_id) {
        try {
            const result = await query(
                `SELECT * FROM ${CITIZENS_TABLE} WHERE telegram_id = $1`,
                [telegram_id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error fetching citizen:', error);
            throw error;
        }
    }

    /**
     * Update citizen location
     */
    async updateLocation(telegram_id, latitude, longitude, location_address) {
        try {
            const result = await query(
                `UPDATE ${CITIZENS_TABLE} 
                 SET latitude = $2, longitude = $3, location_address = $4, updated_at = now()
                 WHERE telegram_id = $1
                 RETURNING *`,
                [telegram_id, latitude, longitude, location_address]
            );

            return {
                success: true,
                data: result.rows[0],
                message: 'Location updated successfully'
            };
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    }

    /**
     * Get all grievances for a citizen
     */
    async getCitizenGrievances(telegram_id) {
        try {
            const result = await query(
                `SELECT * FROM get_citizen_grievances($1)`,
                [telegram_id]
            );

            return {
                success: true,
                data: result.rows,
                count: result.rows.length
            };
        } catch (error) {
            console.error('Error fetching citizen grievances:', error);
            throw error;
        }
    }

    /**
     * Deactivate citizen account (logout)
     */
    async deactivateCitizen(telegram_id) {
        try {
            const result = await query(
                `UPDATE ${CITIZENS_TABLE} 
                 SET is_active = false, is_registered = false, updated_at = now()
                 WHERE telegram_id = $1
                 RETURNING *`,
                [telegram_id]
            );

            return {
                success: true,
                data: result.rows[0],
                message: 'Citizen deactivated successfully'
            };
        } catch (error) {
            console.error('Error deactivating citizen:', error);
            throw error;
        }
    }
}

// Export singleton instance
const citizenService = new CitizenService();
export default citizenService;
