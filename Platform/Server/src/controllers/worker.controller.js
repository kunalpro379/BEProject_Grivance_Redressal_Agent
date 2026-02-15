import telegramBot from '../services/telegram.bot.service.js';

class WorkerController {
    async queryanalystCallback(req, res) {
        try {
            const { grievanceId, userId, userName, query, policy_search_queries, file_urls, current_status } = req.body;

            if (!grievanceId || !userId) {
                return res.status(400).json({ success: false, message: 'grievanceId and userId are required' });
            }

            // Notify user via Telegram
            const message = `✅ Grievance analyzed!\n\nSubmission ID: ${grievanceId}\n\nPlease wait for results. We are now searching for relevant policies and information.`;
            await telegramBot.notifyUser(userId, message);

            console.log(`QueryAnalyst callback: notified user ${userId} for grievance ${grievanceId}`);

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
            const message = `✅ Web crawling complete!\n\nSubmission ID: ${grievanceId}\n\nFound ${urls_count || 0} links. Data saved to cloud.\n\nTop links:\n${linksPreview || 'No links'}${more}`;
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
