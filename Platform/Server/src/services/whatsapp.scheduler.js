import whatsappService from './whatsapp.service.js';
import pool from '../config/database.js';

class WhatsAppScheduler {
  constructor() {
    this.scheduledJobs = new Map();
  }

  /**
   * Start daily report reminders
   * Sends reminder to all workers at specified time
   */
  startDailyReportReminders(hour = 18, minute = 0) {
    console.log(`📅 Scheduling daily report reminders for ${hour}:${minute}`);

    // Calculate milliseconds until next scheduled time
    const scheduleTime = () => {
      const now = new Date();
      const scheduled = new Date();
      scheduled.setHours(hour, minute, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1);
      }

      return scheduled.getTime() - now.getTime();
    };

    const runJob = async () => {
      try {
        console.log('⏰ Running daily report reminder job...');
        await this.sendDailyReportReminders();
        
        // Schedule next run
        const timeout = setTimeout(runJob, scheduleTime());
        this.scheduledJobs.set('daily_reports', timeout);
      } catch (error) {
        console.error('Error in daily report job:', error);
        // Retry in 1 hour on error
        const timeout = setTimeout(runJob, 60 * 60 * 1000);
        this.scheduledJobs.set('daily_reports', timeout);
      }
    };

    // Start first run
    const timeout = setTimeout(runJob, scheduleTime());
    this.scheduledJobs.set('daily_reports', timeout);
  }

  /**
   * Send daily report reminders to all active field workers
   */
  async sendDailyReportReminders() {
    try {
      // Get all field workers with phone numbers
      const result = await pool.query(`
        SELECT id, name, phone
        FROM users
        WHERE role = 'field_worker'
          AND phone IS NOT NULL
          AND is_active = true
      `);

      console.log(`📤 Sending daily report reminders to ${result.rows.length} field workers`);

      for (const worker of result.rows) {
        try {
          await whatsappService.sendDailyReportReminder(worker.phone, worker.name);
          console.log(`✅ Reminder sent to ${worker.name}`);
          
          // Small delay to avoid rate limiting
          await this.sleep(1000);
        } catch (error) {
          console.error(`❌ Failed to send reminder to ${worker.name}:`, error.message);
        }
      }

      console.log('✅ Daily report reminders completed');
    } catch (error) {
      console.error('Error sending daily report reminders:', error);
      throw error;
    }
  }

  /**
   * Send grievance update notification
   */
  async sendGrievanceUpdateNotification(grievanceId) {
    try {
      // Get grievance details and citizen phone
      const result = await pool.query(`
        SELECT g.id, g.title, g.status, u.phone, u.name
        FROM grievances g
        JOIN users u ON g.user_id = u.id
        WHERE g.id = $1 AND u.phone IS NOT NULL
      `, [grievanceId]);

      if (result.rows.length === 0) {
        console.log('No phone number found for grievance notification');
        return;
      }

      const grievance = result.rows[0];
      const message = `Your grievance "${grievance.title}" has been updated.`;

      await whatsappService.sendGrievanceUpdate(
        grievance.phone,
        grievance.id,
        grievance.status,
        message
      );

      console.log(`✅ Grievance update sent to ${grievance.name}`);
    } catch (error) {
      console.error('Error sending grievance update:', error);
    }
  }

  /**
   * Send weekly summary to department heads
   */
  startWeeklySummary(dayOfWeek = 5, hour = 17, minute = 0) {
    console.log(`📅 Scheduling weekly summary for day ${dayOfWeek} at ${hour}:${minute}`);

    const scheduleTime = () => {
      const now = new Date();
      const scheduled = new Date();
      
      // Set to target day of week
      const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
      scheduled.setDate(now.getDate() + daysUntilTarget);
      scheduled.setHours(hour, minute, 0, 0);

      // If time has passed this week, schedule for next week
      if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 7);
      }

      return scheduled.getTime() - now.getTime();
    };

    const runJob = async () => {
      try {
        console.log('⏰ Running weekly summary job...');
        await this.sendWeeklySummaries();
        
        // Schedule next run (7 days)
        const timeout = setTimeout(runJob, scheduleTime());
        this.scheduledJobs.set('weekly_summary', timeout);
      } catch (error) {
        console.error('Error in weekly summary job:', error);
        // Retry in 1 hour on error
        const timeout = setTimeout(runJob, 60 * 60 * 1000);
        this.scheduledJobs.set('weekly_summary', timeout);
      }
    };

    const timeout = setTimeout(runJob, scheduleTime());
    this.scheduledJobs.set('weekly_summary', timeout);
  }

  /**
   * Send weekly summaries to department heads
   */
  async sendWeeklySummaries() {
    try {
      // Get department heads with phone numbers
      const result = await pool.query(`
        SELECT u.id, u.name, u.phone, u.department_id, d.name as department_name
        FROM users u
        JOIN departments d ON u.department_id = d.id
        WHERE u.role = 'department'
          AND u.phone IS NOT NULL
          AND u.is_active = true
      `);

      console.log(`📤 Sending weekly summaries to ${result.rows.length} department heads`);

      for (const head of result.rows) {
        try {
          // Get department statistics
          const stats = await this.getDepartmentWeeklyStats(head.department_id);
          const message = this.formatWeeklySummary(head.department_name, stats);

          await whatsappService.sendMessage(head.phone, message);
          console.log(`✅ Weekly summary sent to ${head.name}`);
          
          await this.sleep(1000);
        } catch (error) {
          console.error(`❌ Failed to send summary to ${head.name}:`, error.message);
        }
      }

      console.log('✅ Weekly summaries completed');
    } catch (error) {
      console.error('Error sending weekly summaries:', error);
      throw error;
    }
  }

  /**
   * Get department statistics for the past week
   */
  async getDepartmentWeeklyStats(departmentId) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_grievances,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_resolution_days
      FROM grievances
      WHERE department_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
    `, [departmentId]);

    return result.rows[0];
  }

  /**
   * Format weekly summary message
   */
  formatWeeklySummary(departmentName, stats) {
    const resolutionRate = stats.total_grievances > 0 
      ? ((stats.resolved / stats.total_grievances) * 100).toFixed(1)
      : 0;

    return `📊 Weekly Summary - ${departmentName}\n\n` +
           `Total Grievances: ${stats.total_grievances}\n` +
           `✅ Resolved: ${stats.resolved}\n` +
           `🔄 In Progress: ${stats.in_progress}\n` +
           `⏳ Pending: ${stats.pending}\n\n` +
           `Resolution Rate: ${resolutionRate}%\n` +
           `Avg Resolution Time: ${stats.avg_resolution_days?.toFixed(1) || 'N/A'} days\n\n` +
           `Keep up the great work! 💪`;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    console.log('🛑 Stopping all WhatsApp scheduled jobs');
    for (const [name, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
      console.log(`Stopped job: ${name}`);
    }
    this.scheduledJobs.clear();
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new WhatsAppScheduler();
