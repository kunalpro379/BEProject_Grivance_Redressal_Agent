/**
 * Grievance Details Controller
 * Enhanced endpoint for detailed grievance view with full AI analysis
 */

import pool from '../config/database.js';
import commentsService from '../services/comments.service.js';

/**
 * Get comprehensive grievance details including:
 * - Basic grievance info
 * - AI analysis (full_result)
 * - Comments
 * - Timeline/workflow
 * - Department info
 * - Attachments/files
 */
export const getGrievanceDetails = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Main grievance query with all related data
    const grievanceQuery = `
      SELECT 
        g.*,
        c.full_name as citizen_name,
        c.email as citizen_email,
        c.phone as citizen_phone,
        c.address as citizen_address,
        o.full_name as assigned_officer_name,
        o.email as officer_email,
        d.name as department_name,
        d.description as department_description,
        d.contact_email as department_email,
        d.contact_phone as department_phone,
        d.address as department_address
      FROM usergrievance g
      LEFT JOIN citizens c ON g.citizen_id = c.id
      LEFT JOIN users o ON g.assigned_officer_id = o.id
      LEFT JOIN departments d ON g.department_id = d.id
      WHERE g.id = $1
    `;

    const grievanceResult = await pool.query(grievanceQuery, [grievanceId]);

    if (grievanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const grievance = grievanceResult.rows[0];

    // Check permissions
    const canView = 
      userRole === 'admin' ||
      userRole === 'state_official' ||
      userRole === 'district_official' ||
      userRole === 'city_official' ||
      (userRole === 'citizen' && grievance.citizen_id === userId) ||
      (userRole === 'department_officer' && grievance.assigned_officer_id === userId) ||
      (userRole === 'department_officer' && grievance.department_id === req.user.department_id);

    if (!canView) {
      return res.status(403).json({ error: 'You do not have permission to view this grievance' });
    }

    // Get comments
    const includeInternal = commentsService.canViewInternalComments(userRole);
    const comments = await commentsService.getCommentsByGrievanceId(grievanceId, includeInternal);

    // Get workflow/timeline
    let workflowSteps = [];
    try {
      const workflowResult = await pool.query(
        `SELECT 
          id, step_number, status::text, officer_name, action_taken, 
          notes, progress_percentage, is_completed, completed_at, created_at
         FROM grievanceworkflow
         WHERE grievance_id = $1
         ORDER BY step_number ASC, created_at ASC`,
        [grievanceId]
      );
      workflowSteps = workflowResult.rows;
    } catch (error) {
      console.log('No workflow table or error:', error.message);
    }

    // Build timeline from workflow JSONB and workflow table
    const workflow = (grievance.workflow && typeof grievance.workflow === 'object') ? grievance.workflow : {};
    const timelineHistory = (workflow.history && Array.isArray(workflow.history)) ? workflow.history : [];
    
    const timeline = [
      {
        stage: 'submitted',
        timestamp: grievance.created_at,
        label: 'Grievance Submitted',
        description: 'Citizen submitted the grievance',
        actor: grievance.citizen_name
      },
      ...(workflow.assigned_at ? [{
        stage: 'assigned',
        timestamp: workflow.assigned_at,
        label: 'Assigned to Department',
        description: `Assigned to ${grievance.department_name || 'department'}`,
        actor: 'System'
      }] : []),
      ...timelineHistory.map(item => ({
        stage: item.stage || 'update',
        timestamp: item.at || item.timestamp,
        label: item.label || item.stage,
        description: item.description,
        actor: item.actor || item.officer_name
      })),
      ...workflowSteps.map(step => ({
        stage: step.status,
        timestamp: step.completed_at || step.created_at,
        label: step.action_taken || step.status,
        description: step.notes,
        actor: step.officer_name,
        progress: step.progress_percentage,
        completed: step.is_completed
      })),
      ...(grievance.resolved_at ? [{
        stage: 'resolved',
        timestamp: grievance.resolved_at,
        label: 'Grievance Resolved',
        description: 'Grievance has been resolved',
        actor: grievance.resolved_by ? 'Officer' : 'System'
      }] : [])
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Parse AI analysis from full_result
    const aiAnalysis = grievance.full_result || {};
    
    // Extract key information
    const analysis = {
      category: {
        main: grievance.category || aiAnalysis.grievance?.category,
        sub: grievance.sub_category || aiAnalysis.grievance?.sub_category
      },
      location: {
        address: grievance.location_address || grievance.address || aiAnalysis.grievance?.location?.address,
        latitude: grievance.latitude || aiAnalysis.grievance?.location?.latitude,
        longitude: grievance.longitude || aiAnalysis.grievance?.location?.longitude,
        landmarks: aiAnalysis.grievance?.location?.landmarks || [],
        area_type: aiAnalysis.grievance?.location?.area_type
      },
      image: {
        path: grievance.image_path,
        description: grievance.image_description || aiAnalysis.grievance?.image?.description,
        key_objects: aiAnalysis.grievance?.image?.key_objects || [],
        scene_type: aiAnalysis.grievance?.image?.scene_type,
        extracted_text: aiAnalysis.grievance?.image?.extracted_text
      },
      sentiment: {
        emotion: aiAnalysis.analysis?.emotion?.primary_emotion,
        secondary_emotions: aiAnalysis.analysis?.emotion?.secondary_emotions || [],
        intensity: aiAnalysis.analysis?.emotion?.emotion_intensity
      },
      severity: {
        level: aiAnalysis.analysis?.severity?.severity_level,
        score: aiAnalysis.analysis?.severity?.criticality_score,
        impact_scope: aiAnalysis.analysis?.severity?.impact_scope,
        consequences: aiAnalysis.analysis?.severity?.potential_consequences || []
      },
      priority: {
        level: grievance.priority || aiAnalysis.analysis?.priority?.priority_level,
        urgency: aiAnalysis.analysis?.priority?.urgency_level,
        justification: aiAnalysis.analysis?.priority?.justification
      },
      fraud_risk: {
        risk: aiAnalysis.analysis?.fraud_risk?.fraud_risk,
        confidence: aiAnalysis.analysis?.fraud_risk?.authenticity_confidence,
        indicators: aiAnalysis.analysis?.fraud_risk?.spam_indicators || []
      },
      validation: {
        status: grievance.validation_status,
        score: grievance.validation_score,
        is_valid: grievance.validation_result?.is_valid,
        reasoning: grievance.validation_reasoning || grievance.validation_result?.reasoning
      },
      department: {
        recommended: aiAnalysis.department?.recommended_department,
        allocated: aiAnalysis.department?.allocated_department,
        contact: aiAnalysis.department?.contact_information,
        jurisdiction: aiAnalysis.department?.jurisdiction
      },
      real_time_data: {
        search_results: aiAnalysis.real_time_data?.search_results || {},
        policy_queries: aiAnalysis.real_time_data?.policy_queries || []
      }
    };

    // Build response
    const response = {
      // Basic Info
      id: grievance.id,
      grievance_id: grievance.grievance_id,
      status: grievance.status,
      priority: grievance.priority,
      created_at: grievance.created_at,
      updated_at: grievance.updated_at,
      resolved_at: grievance.resolved_at,

      // Grievance Content
      grievance_text: grievance.grievance_text,
      enhanced_query: grievance.enhanced_query,
      
      // Citizen Info
      citizen: {
        id: grievance.citizen_id,
        name: grievance.citizen_name,
        email: grievance.citizen_email,
        phone: grievance.citizen_phone,
        address: grievance.citizen_address
      },

      // Department Info
      department: {
        id: grievance.department_id,
        name: grievance.department_name,
        description: grievance.department_description,
        email: grievance.department_email,
        phone: grievance.department_phone,
        address: grievance.department_address
      },

      // Assigned Officer
      assigned_officer: grievance.assigned_officer_id ? {
        id: grievance.assigned_officer_id,
        name: grievance.assigned_officer_name,
        email: grievance.officer_email
      } : null,

      // AI Analysis
      analysis,

      // Comments
      comments: {
        total: comments.length,
        items: comments
      },

      // Timeline
      timeline,

      // Raw data for advanced users
      raw: {
        full_result: grievance.full_result,
        agent_outputs: grievance.agent_outputs,
        processing_metadata: grievance.processing_metadata
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching grievance details:', error);
    res.status(500).json({
      error: 'Failed to fetch grievance details',
      message: error.message
    });
  }
};
