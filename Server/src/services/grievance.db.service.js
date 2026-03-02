import { query } from '../config/database.js';

// Detect which table names exist in the database
let CITIZENS_TABLE = 'citizens';
let GRIEVANCE_TABLE = 'usergrievance';

async function detectTableNames() {
    try {
        // Detect Citizens table
        try {
            await query(`SELECT 1 FROM citizens LIMIT 1`);
            CITIZENS_TABLE = 'citizens';
        } catch (error) {
            try {
                await query(`SELECT 1 FROM "Citizens" LIMIT 1`);
                CITIZENS_TABLE = '"Citizens"';
            } catch (err) {
                console.error('Neither citizens nor Citizens table found');
            }
        }

        // Detect UserGrievance table
        try {
            await query(`SELECT 1 FROM usergrievance LIMIT 1`);
            GRIEVANCE_TABLE = 'usergrievance';
        } catch (error) {
            try {
                await query(`SELECT 1 FROM "UserGrievance" LIMIT 1`);
                GRIEVANCE_TABLE = '"UserGrievance"';
            } catch (err) {
                console.error('Neither usergrievance nor UserGrievance table found');
            }
        }

        console.log(`Using grievance table: ${GRIEVANCE_TABLE}`);
        return { CITIZENS_TABLE, GRIEVANCE_TABLE };
    } catch (error) {
        console.error('Error detecting table names:', error);
        return { CITIZENS_TABLE, GRIEVANCE_TABLE };
    }
}

// Initialize table name detection
detectTableNames();

// Normalize priority for DB: store with proper casing so frontend color-coding works (Emergency, Urgent, High, Medium, Low)
function normalizePriority(p) {
    if (!p || typeof p !== 'string') return 'Medium';
    const lower = p.toLowerCase();
    const map = { emergency: 'Emergency', urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
    return map[lower] || (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
}

class GrievanceDBService {
    /**
     * Submit grievance to UserGrievance table (Common for Web + Telegram)
     */
    async submitGrievance(grievanceData) {
        const {
            citizen_id,
            grievance_text,
            image_path,
            image_description,
            enhanced_query,
            embedding,
            latitude,
            longitude,
            location_address
        } = grievanceData;

        try {
            const result = await query(
                `SELECT submit_grievance($1, $2, $3, $4, $5, $6, $7, $8, $9) as grievance_id`,
                [
                    citizen_id,
                    grievance_text,
                    image_path || null,
                    image_description || null,
                    enhanced_query || null,
                    embedding || null,
                    latitude || null,
                    longitude || null,
                    location_address || null
                ]
            );

            return {
                success: true,
                grievance_id: result.rows[0].grievance_id,
                message: 'Grievance submitted successfully'
            };
        } catch (error) {
            console.error('Error submitting grievance:', error);
            throw error;
        }
    }

    /**
     * Process grievance with AI analysis (creates Grievances record)
     */
    async processGrievance(grievance_id, analysisData) {
        const {
            query_type,
            category,
            sentiment_priority,
            emotion,
            severity,
            patterns,
            fraud,
            department,
            policy_search,
            similar_cases_summary,
            past_queries_summary,
            full_result,
            priority
        } = analysisData;

        try {
            const result = await query(
                `SELECT process_grievance(
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                ) as processed_id`,
                [
                    grievance_id,
                    query_type || null,
                    category || null,
                    sentiment_priority || null,
                    emotion || null,
                    severity || null,
                    patterns || null,
                    fraud || null,
                    department || null,
                    policy_search || null,
                    similar_cases_summary || null,
                    past_queries_summary || null,
                    full_result || null,
                    normalizePriority(priority || 'medium')
                ]
            );

            return {
                success: true,
                processed_id: result.rows[0].processed_id,
                message: 'Grievance processed successfully'
            };
        } catch (error) {
            console.error('Error processing grievance:', error);
            throw error;
        }
    }

    /**
     * Assign grievance to officer
     */
    async assignGrievance(grievance_id, officer_id) {
        try {
            const result = await query(
                `SELECT assign_grievance($1, $2) as success`,
                [grievance_id, officer_id]
            );

            return {
                success: result.rows[0].success,
                message: result.rows[0].success 
                    ? 'Grievance assigned successfully' 
                    : 'Failed to assign grievance'
            };
        } catch (error) {
            console.error('Error assigning grievance:', error);
            throw error;
        }
    }

    /**
     * Resolve grievance
     */
    async resolveGrievance(grievance_id, resolved_by, resolution_text) {
        try {
            const result = await query(
                `SELECT resolve_grievance($1, $2, $3) as success`,
                [grievance_id, resolved_by, resolution_text]
            );

            return {
                success: result.rows[0].success,
                message: result.rows[0].success 
                    ? 'Grievance resolved successfully' 
                    : 'Failed to resolve grievance'
            };
        } catch (error) {
            console.error('Error resolving grievance:', error);
            throw error;
        }
    }

    /**
     * Get grievance by ID with full details
     */
    async getGrievanceById(grievance_id) {
        try {
            const result = await query(
                `SELECT 
                    g.*,
                    ug.grievance_text,
                    ug.image_path,
                    ug.image_description,
                    ug.enhanced_query,
                    c.telegram_id,
                    c.phone as citizen_phone,
                    c.full_name as citizen_name,
                    d.name as department_name,
                    u.full_name as officer_name
                FROM ${GRIEVANCE_TABLE} g
                JOIN ${GRIEVANCE_TABLE} ug ON g.grievance_id = ug.id
                JOIN ${CITIZENS_TABLE} c ON g.citizen_id = c.id
                LEFT JOIN departments d ON g.department_id = d.id
                LEFT JOIN users u ON g.assigned_officer_id = u.id
                WHERE g.id = $1`,
                [grievance_id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error fetching grievance:', error);
            throw error;
        }
    }

    /**
     * Get all pending grievances
     */
    async getPendingGrievances(limit = 50, offset = 0) {
        try {
            const result = await query(
                `SELECT 
                    g.*,
                    ug.grievance_text,
                    ug.image_path,
                    c.full_name as citizen_name,
                    c.phone as citizen_phone,
                    d.name as department_name
                FROM ${GRIEVANCE_TABLE} g
                JOIN ${GRIEVANCE_TABLE} ug ON g.grievance_id = ug.id
                JOIN ${CITIZENS_TABLE} c ON g.citizen_id = c.id
                LEFT JOIN departments d ON g.department_id = d.id
                WHERE g.status = 'pending'
                ORDER BY g.created_at DESC
                LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            return {
                success: true,
                data: result.rows,
                count: result.rows.length
            };
        } catch (error) {
            console.error('Error fetching pending grievances:', error);
            throw error;
        }
    }
}

// Export singleton instance
const grievanceDBService = new GrievanceDBService();
export default grievanceDBService;
