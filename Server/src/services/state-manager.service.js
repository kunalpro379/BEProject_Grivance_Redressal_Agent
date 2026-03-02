import pool from '../config/database.js';

/**
 * State Manager Service
 * Manages conversation state and workflow progress for autonomous AI agent
 */
class StateManagerService {
  constructor() {
    this.memoryCache = new Map(); // userId -> state (for performance)
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get user state from database or cache
   */
  async getState(userId, channel = 'telegram') {
    try {
      // Check cache first
      const cached = this.memoryCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.state;
      }

      // Load from database
      const result = await pool.query(
        `SELECT state_data, updated_at 
         FROM user_states 
         WHERE user_id = $1 AND channel = $2
         ORDER BY updated_at DESC 
         LIMIT 1`,
        [userId, channel]
      );

      if (result.rows.length > 0) {
        const state = result.rows[0].state_data;
        
        // Update cache
        this.memoryCache.set(userId, {
          state,
          timestamp: Date.now()
        });

        return state;
      }

      // No state found, return default
      return this.getDefaultState(userId, channel);
    } catch (error) {
      console.error('❌ Error loading state:', error.message);
      return this.getDefaultState(userId, channel);
    }
  }

  /**
   * Save user state to database and cache
   */
  async saveState(userId, state, channel = 'telegram') {
    try {
      // Save to database
      await pool.query(
        `INSERT INTO user_states (user_id, channel, state_data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, channel) 
         DO UPDATE SET 
           state_data = $3,
           updated_at = NOW()`,
        [userId, channel, JSON.stringify(state)]
      );

      // Update cache
      this.memoryCache.set(userId, {
        state,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('❌ Error saving state:', error.message);
      return false;
    }
  }

  /**
   * Clear user state (logout)
   */
  async clearState(userId, channel = 'telegram') {
    try {
      // Clear from database
      await pool.query(
        `DELETE FROM user_states WHERE user_id = $1 AND channel = $2`,
        [userId, channel]
      );

      // Clear from cache
      this.memoryCache.delete(userId);

      console.log(`✅ Cleared state for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing state:', error.message);
      return false;
    }
  }

  /**
   * Update specific fields in state
   */
  async updateState(userId, updates, channel = 'telegram') {
    try {
      const currentState = await this.getState(userId, channel);
      const newState = { ...currentState, ...updates };
      return await this.saveState(userId, newState, channel);
    } catch (error) {
      console.error('❌ Error updating state:', error.message);
      return false;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId, limit = 20) {
    try {
      const state = await this.getState(userId);
      return state.conversationHistory || [];
    } catch (error) {
      console.error('❌ Error loading conversation history:', error.message);
      return [];
    }
  }

  /**
   * Add message to conversation history
   */
  async addToHistory(userId, role, message, channel = 'telegram') {
    try {
      const state = await this.getState(userId, channel);
      
      if (!state.conversationHistory) {
        state.conversationHistory = [];
      }

      state.conversationHistory.push({
        role,
        message,
        timestamp: new Date().toISOString()
      });

      // Keep only last 50 messages
      if (state.conversationHistory.length > 50) {
        state.conversationHistory = state.conversationHistory.slice(-50);
      }

      await this.saveState(userId, state, channel);
      return true;
    } catch (error) {
      console.error('❌ Error adding to history:', error.message);
      return false;
    }
  }

  /**
   * Get workflow state (registration, reporting, etc.)
   */
  async getWorkflowState(userId) {
    try {
      const state = await this.getState(userId);
      return state.workflow || this.getDefaultWorkflowState();
    } catch (error) {
      console.error('❌ Error loading workflow state:', error.message);
      return this.getDefaultWorkflowState();
    }
  }

  /**
   * Update workflow state
   */
  async updateWorkflowState(userId, workflowUpdates, channel = 'telegram') {
    try {
      const state = await this.getState(userId, channel);
      
      if (!state.workflow) {
        state.workflow = this.getDefaultWorkflowState();
      }

      state.workflow = { ...state.workflow, ...workflowUpdates };
      
      await this.saveState(userId, state, channel);
      return true;
    } catch (error) {
      console.error('❌ Error updating workflow state:', error.message);
      return false;
    }
  }

  /**
   * Get collected data
   */
  async getCollectedData(userId) {
    try {
      const state = await this.getState(userId);
      return state.collectedData || {};
    } catch (error) {
      console.error('❌ Error loading collected data:', error.message);
      return {};
    }
  }

  /**
   * Update collected data
   */
  async updateCollectedData(userId, data, channel = 'telegram') {
    try {
      const state = await this.getState(userId, channel);
      
      if (!state.collectedData) {
        state.collectedData = {};
      }

      state.collectedData = { ...state.collectedData, ...data };
      
      await this.saveState(userId, state, channel);
      return true;
    } catch (error) {
      console.error('❌ Error updating collected data:', error.message);
      return false;
    }
  }

  /**
   * Get default state for new users
   */
  getDefaultState(userId, channel) {
    return {
      userId,
      channel,
      workflow: this.getDefaultWorkflowState(),
      collectedData: {},
      conversationHistory: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }
    };
  }

  /**
   * Get default workflow state
   */
  getDefaultWorkflowState() {
    return {
      currentStep: 'initial',
      intent: null,
      userType: null,
      status: 'active',
      dataNeeded: [],
      dataCollected: [],
      nextAction: null
    };
  }

  /**
   * Check if user has active workflow
   */
  async hasActiveWorkflow(userId) {
    try {
      const workflow = await this.getWorkflowState(userId);
      return workflow.status === 'active' && workflow.currentStep !== 'initial';
    } catch (error) {
      return false;
    }
  }

  /**
   * Complete workflow
   */
  async completeWorkflow(userId, channel = 'telegram') {
    try {
      await this.updateWorkflowState(userId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      }, channel);
      return true;
    } catch (error) {
      console.error('❌ Error completing workflow:', error.message);
      return false;
    }
  }

  /**
   * Reset workflow (for /reset command)
   */
  async resetWorkflow(userId, channel = 'telegram') {
    try {
      const state = await this.getState(userId, channel);
      state.workflow = this.getDefaultWorkflowState();
      state.collectedData = {};
      await this.saveState(userId, state, channel);
      return true;
    } catch (error) {
      console.error('❌ Error resetting workflow:', error.message);
      return false;
    }
  }

  /**
   * Clean up old states (run periodically)
   */
  async cleanupOldStates(daysOld = 30) {
    try {
      const result = await pool.query(
        `DELETE FROM user_states 
         WHERE updated_at < NOW() - INTERVAL '${daysOld} days'
         RETURNING user_id`,
        []
      );
      
      console.log(`🧹 Cleaned up ${result.rowCount} old states`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error cleaning up old states:', error.message);
      return 0;
    }
  }

  /**
   * Get state statistics
   */
  async getStats() {
    try {
      const result = await pool.query(
        `SELECT 
           COUNT(*) as total_users,
           COUNT(CASE WHEN (state_data->>'workflow'->>'status') = 'active' THEN 1 END) as active_workflows,
           COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_activity
         FROM user_states`
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return null;
    }
  }
}

export default new StateManagerService();
