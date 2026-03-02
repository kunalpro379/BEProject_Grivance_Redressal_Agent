import express from 'express';
import * as workerController from '../controllers/worker.controller.js';

const router = express.Router();

// Callback from QueryAnalyst worker when analysis is complete
router.post('/queryanalyst-callback', workerController.queryanalystCallback);

// Callback from WebCrawler worker when crawling is complete
router.post('/webcrawler-callback', workerController.webcrawlerCallback);

export default router;
