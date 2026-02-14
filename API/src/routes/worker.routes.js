const express = require('express');
const workerController = require('../controllers/worker.controller');

const router = express.Router();

// Callback from QueryAnalyst worker when analysis is complete
router.post('/queryanalyst-callback', workerController.queryanalystCallback);

// Callback from WebCrawler worker when crawling is complete
router.post('/webcrawler-callback', workerController.webcrawlerCallback);

module.exports = router;
