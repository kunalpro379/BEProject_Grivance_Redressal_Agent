"""
Web Crawler Worker - Azure Queue Integration

This worker:
1. Polls Azure Queue (webcrawlerqueue) for jobs
2. Crawls websites and extracts content
3. Uploads markdown files to Azure Blob Storage
4. Sends completion message to embeddings queue

Usage:
    python main.py
"""

import asyncio
from worker import main

if __name__ == "__main__":
    asyncio.run(main())
