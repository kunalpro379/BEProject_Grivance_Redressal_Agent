# Autonomous Grievance Research Agent 🤖

**Intelligent LangGraph + ReAct agent that continuously monitors grievances and conducts autonomous research.**

## 🎯 Features

- **Continuous Monitoring** - Watches PostgreSQL `usergrievance` table for pending grievances
- **ReAct Agent** - Intelligent reasoning and action planning using Groq LLM
- **LangGraph Workflow** - Cyclic graph with memory and stopping conditions
- **Web Search** - Tavily API for finding relevant information
- **Web Scraping** - crawl4ai for extracting content from URLs
- **File Storage** - Saves scraped data as text/markdown files
- **File Downloads** - Downloads PDFs, docs, and other documents
- **Safety Limits** - Max loops, documents, and rate limiting
- **Scheduled Execution** - Runs at configurable intervals

## Architecture

```
┌──────────────────┐
│   PostgreSQL     │
│ (usergrievance)  │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│  Worker (Monitor)  │
└────────┬───────────┘
         │
         ▼
    ┌─────────────┐
    │ INITIALIZE  │
    │  RESEARCH   │
    └──────┬──────┘
           │
           ▼
    ┌──────────────┐
    │ PLAN (ReAct) │◄────┐
    └──────┬───────┘     │
           │             │
           ▼             │
    ┌──────────────┐     │
    │ SEARCH WEB   │     │
    │  (Tavily)    │     │
    └──────┬───────┘     │
           │             │
           ▼             │
    ┌──────────────┐     │
    │ SCRAPE URLs  │     │
    │ (crawl4ai)   │     │
    └──────┬───────┘     │
           │             │
           ▼             │
    ┌──────────────┐     │
    │  SAVE FILES  │     │
    │  (txt/md)    │     │
    └──────┬───────┘     │
           │             │
           ▼             │
    ┌──────────────┐     │
    │ CONTINUE?    │─────┘
    └──────┬───────┘   yes
           │ no
           ▼
    ┌──────────────┐
    │  FINALIZE    │
    └──────────────┘
```

## 📦 Installation

### 1. Install Dependencies

```bash
cd AgenticWorkers/ScrapeWorkflow
pip install -r requirements.txt
```

### 2. Install Playwright (Required for crawl4ai)

```bash
playwright install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
TAVILY_API_KEY=tvly_your_tavily_api_key_here
DATABASE_URL=postgresql://your_database_url_here
```

**Get API Keys:**
- **Groq**: https://console.groq.com/keys (Free tier available)
- **Tavily**: https://tavily.com (Free tier: 1000 searches/month)

### 4. Verify Database Connection

The worker will connect to PostgreSQL to fetch pending grievances.

## 🚀 Usage

### Run Worker

```bash
python worker.py
```

The worker will:
1. Connect to PostgreSQL database
2. Fetch pending grievances
3. Research each grievance using the LangGraph workflow
4. Save scraped content as text/markdown files
5. Download PDFs and documents
6. Run continuously at scheduled intervals

### Configuration

Edit `config.py` or `.env` to customize:

```python
WORKER_INTERVAL_MINUTES = 30    # Run every 30 minutes
MAX_LOOPS = 30                  # Max research loops per grievance
MAX_URLS_PER_SEARCH = 3         # URLs to scrape per search
MAX_TOTAL_DOCUMENTS = 500       # Global document limit
BATCH_SIZE = 5                  # Grievances per cycle
```

##  Database Schema

### Input Table: `usergrievance`

```sql
CREATE TABLE usergrievance (
    id uuid PRIMARY KEY,
    grievance_id varchar UNIQUE,
    grievance_text text,
    enhanced_query text,
    category jsonb,
    status varchar,
    priority varchar,
    ...
);
```

## 📁 File Storage

All scraped data is saved to the `data/files/` directory:

```
data/
└── files/
    ├── grievance_{id}/
    │   ├── scraped_page_1.txt
    │   ├── scraped_page_2.txt
    │   ├── document.pdf
    │   └── report.docx
    └── grievance_{id2}/
        └── ...
```

Each file contains:
- Source URL
- Page title
- Timestamp
- Full scraped content

## Research Topics

The agent automatically researches:

1. 🏛️ **Government Policies & Subsidies** - Central and state schemes
2. 🏢 **Department Jurisdiction** - Responsible departments and actions
3. 💰 **Cost Allocation** - Budget and resource planning
4. 📋 **Similar Cases** - Past complaints and their resolutions
5. 📰 **Latest News** - Regulatory updates and announcements
6. ⚖️ **Legal Compliance** - Regulations and requirements
7. 📈 **Planning & Strategy** - Resource allocation suggestions

## 🛡️ Safety Features

- Max loops per grievance (default: 30)
- Max total documents (default: 500)
- Max URLs per search (default: 3)
- Max tokens per document (default: 8000)
- Rate limiting between requests
- Skip already well-researched grievances (5+ docs)
- Error handling and recovery
- File size limits (50 MB max)
- Download timeout (30 seconds)

## 📁 Project Structure

```
ScrapeWorkflow/
├── config.py           # Configuration
├── database.py         # PostgreSQL integration
├── tools.py            # Tavily search + crawl4ai
├── state.py            # LangGraph state definition
├── nodes.py            # Workflow nodes (ReAct agent)
├── graph.py            # LangGraph workflow
├── worker.py           # Main worker (entry point)
├── requirements.txt    # Dependencies
├── .env.example        # Environment template
└── data/
    └── files/          # Scraped content storage
```

## 🔧 Troubleshooting

### Playwright Installation Error

```bash
playwright install chromium
playwright install-deps
```

### Database Connection Error

Verify your `DATABASE_URL` is correct and the database is accessible.

### API Rate Limits

- Tavily free tier: 1000 searches/month
- Groq free tier: Check current limits

Adjust `WORKER_INTERVAL_MINUTES` to reduce frequency if needed.

## 📈 Monitoring

The worker logs detailed progress:

```
🎯 PROCESSING GRIEVANCE
ID: GRV-2026-001
Text: Water supply issue in Ward 12...
Priority: high

Planning Research (Loop 1/30)
📌 Next query: Mumbai water supply scheme 2026

 Searching: Mumbai water supply scheme 2026
Found 5 URLs to scrape

🕷️ Scraping 5 new URLs
Scraped 5 documents successfully

💾 Saving 5 files to disk
Saved 5 files

🔄 Continuing research (1/5 topics covered)
```

## 🎯 Example Output

After processing a grievance about water supply:

```
RESEARCH COMPLETED
Grievance ID: GRV-2026-001
Files Saved: 15
Topics Covered: 5
Loops Executed: 5
URLs Processed: 25

📝 Summary:
Research gathered information on Mumbai Municipal Corporation's
water supply schemes, budget allocations for Ward 12, and similar
past complaints. Found relevant government policies and department
jurisdiction for water infrastructure.
```

## 🚀 Production Deployment

### Using systemd (Linux)

Create `/etc/systemd/system/grievance-worker.service`:

```ini
[Unit]
Description=Grievance Research Worker
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/ScrapeWorkflow
ExecStart=/usr/bin/python3 worker.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Start service:

```bash
sudo systemctl start grievance-worker
sudo systemctl enable grievance-worker
```

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt && playwright install chromium

COPY . .
CMD ["python", "worker.py"]
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ using LangGraph, ReAct, Groq, Tavily, and crawl4ai**
