import { query } from '../config/database.js';

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
            embedding
        } = grievanceData;

        try {
            const result = await query(
                `SELECT submit_grievance($1, $2, $3, $4, $5, $6) as grievance_id`,
                [
                    citizen_id,
                    grievance_text,
                    image_path || null,
                    image_description || null,
                    enhanced_query || null,
                    embedding || null
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
                    priority || 'medium'
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
                FROM "Grievances" g
                JOIN "UserGrievance" ug ON g.grievance_id = ug.id
                JOIN "Citizens" c ON g.citizen_id = c.id
                LEFT JOIN "Departments" d ON g.department_id = d.id
                LEFT JOIN "Users" u ON g.assigned_officer_id = u.id
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
                FROM "Grievances" g
                JOIN "UserGrievance" ug ON g.grievance_id = ug.id
                JOIN "Citizens" c ON g.citizen_id = c.id
                LEFT JOIN "Departments" d ON g.department_id = d.id
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
