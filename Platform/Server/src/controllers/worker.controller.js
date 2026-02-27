import telegramBot from '../services/telegram.bot.service.js';

class WorkerController {
    async queryanalystCallback(req, res) {
        try {
            const { 
                grievance_id, 
                grievanceId,
                citizen_id,
                telegram_id,
                userId, 
                userName, 
                query, 
                policy_search_queries, 
                file_urls, 
                current_status,
                validation_result,
                location_data,
                analysis_completed_at
            } = req.body;

            const gId = grievance_id || grievanceId;
            const tId = telegram_id || userId;

            if (!gId || !tId) {
                return res.status(400).json({ success: false, message: 'grievance_id and telegram_id are required' });
            }

            // Prepare analysis result for notification
            const analysisResult = {
                validation_status: validation_result?.is_valid ? 'validated' : 'needs_review',
                department: { name: 'Being assigned' },
                severity: { level: 'Medium' }
            };

            // Notify user via Telegram with detailed analysis
            await telegramBot.notifyQueryAnalyzed(tId, gId, analysisResult);

            console.log(`QueryAnalyst callback: notified user ${tId} for grievance ${gId}`);

            res.json({
                success: true,
                message: 'User notified via Telegram'
            });
        } catch (error) {
            console.error('QueryAnalyst callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    async webcrawlerCallback(req, res) {
        try {
            const { grievanceId, userId, userName, links, blob_urls, urls_count, current_status } = req.body;

            if (!grievanceId || !userId) {
                return res.status(400).json({ success: false, message: 'grievanceId and userId are required' });
            }

            const linksPreview = (links || []).slice(0, 5).join('\n');
            const more = (links || []).length > 5 ? `\n... and ${(links || []).length - 5} more` : '';
            const message = `Web crawling complete!\n\nSubmission ID: ${grievanceId}\n\nFound ${urls_count || 0} links. Data saved to cloud.\n\nTop links:\n${linksPreview || 'No links'}${more}`;
            await telegramBot.notifyUser(userId, message);

            console.log(`WebCrawler callback: notified user ${userId} for grievance ${grievanceId}`);

            res.json({
                success: true,
                message: 'User notified via Telegram',
                links_count: (links || []).length
            });
        } catch (error) {
            console.error('WebCrawler callback error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }
}

const workerController = new WorkerController();
export const queryanalystCallback = workerController.queryanalystCallback.bind(workerController);
export const webcrawlerCallback = workerController.webcrawlerCallback.bind(workerController);
