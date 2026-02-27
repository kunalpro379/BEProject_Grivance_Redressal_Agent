"""
WebCrawling Worker - Polls webcrawler queue, processes policy_search_queries,
crawls data, downloads files, saves to blob at griviences/<grievanceId>/internet/
"""
import os
import json
import time
import base64
import tempfile
import requests
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from tavily import TavilyClient
    HAS_TAVILY = True
except ImportError:
    HAS_TAVILY = False

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from azure.storage.queue import QueueServiceClient, QueueClient
from azure.storage.blob import BlobServiceClient

SEARCH_TIMEOUT = 15
CRAWL_TIMEOUT = 20
MAX_RESULTS_PER_QUERY = 3
ALLOWED_DOWNLOAD_EXT = (".pdf", ".jpg", ".jpeg", ".png", ".gif", ".doc", ".docx")


class WebCrawlingWorker:
    def __init__(self):
        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        queue_name = os.getenv("AZURE_QUEUE_NAME", "webcrawler")
        if not conn_str:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING is required")

        self.queue_client: QueueClient = QueueServiceClient.from_connection_string(
            conn_str
        ).get_queue_client(queue_name)
        self.blob_client = BlobServiceClient.from_connection_string(conn_str)
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "test")
        self.api_callback_url = os.getenv("API_CALLBACK_URL", "http://localhost:3000")

        try:
            self.queue_client.create_queue()
        except Exception:
            pass

        print(f"WebCrawling Worker initialized. Polling queue: {queue_name}")

    def _decode_message(self, text: str) -> Dict[str, Any]:
        try:
            decoded = base64.b64decode(text).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            return json.loads(text)

    def _encode_message(self, msg: Dict[str, Any]) -> str:
        return base64.b64encode(json.dumps(msg).encode("utf-8")).decode("utf-8")

    def _search(self, query: str, max_results: int = MAX_RESULTS_PER_QUERY) -> List[Dict]:
        """Search web using Tavily API. Returns list of {url, title, snippet}."""
        if HAS_TAVILY:
            api_key = os.getenv("TAVILY_API_KEY")
            if not api_key:
                print("    TAVILY_API_KEY not set in .env")
                return []
            try:
                client = TavilyClient(api_key=api_key)
                response = client.search(
                    query=query,
                    max_results=max_results,
                    search_depth="advanced",
                    include_domains=["gov.in", "nic.in", "india.gov.in", "mcgm.gov.in", "maharashtra.gov.in"],
                )
                results = []
                for r in response.get("results", []):
                    results.append({
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                        "snippet": r.get("content", ""),
                    })
                return results
            except Exception as e:
                print(f"    Tavily search error: {e}")
                return []
        return []

    def _scrape_url(self, url: str) -> Optional[str]:
        """Scrape text from URL. Returns markdown-like text or None."""
        if not HAS_BS4:
            return None
        try:
            resp = requests.get(url, timeout=CRAWL_TIMEOUT, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
            return text[:15000] if text else None
        except Exception as e:
            print(f"    Scrape failed {url}: {e}")
            return None

    def _download_file(self, url: str, folder: str) -> Optional[str]:
        """Download file (PDF/image) and return local path."""
        try:
            parsed = urllib.parse.urlparse(url)
            name = os.path.basename(parsed.path)
            if not name or not os.path.splitext(name)[1]:
                name = f"file_{abs(hash(url))}.pdf"
            path = os.path.join(folder, name)
            resp = requests.get(url, timeout=SEARCH_TIMEOUT, stream=True)
            resp.raise_for_status()
            with open(path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return path
        except Exception as e:
            print(f"    Download failed {url}: {e}")
            return None

    def _is_downloadable(self, url: str) -> bool:
        return any(url.lower().endswith(ext) for ext in ALLOWED_DOWNLOAD_EXT)

    def process_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        grievance_id = msg.get("grievanceId") or msg.get("submissionId", "unknown")
        queries = msg.get("policy_search_queries") or []
        user_id = msg.get("userId")
        user_name = msg.get("userName")

        print(f"\n📋 Processing grievance: {grievance_id}")
        print(f"   Queries: {len(queries)}")

        all_urls: List[Dict] = []
        all_text: List[str] = []
        downloaded_paths: List[str] = []

        work_dir = tempfile.mkdtemp()
        files_dir = os.path.join(work_dir, "files")
        os.makedirs(files_dir, exist_ok=True)

        try:
            for i, q in enumerate(queries):
                print(f"    Searching ({i+1}/{len(queries)}): {q[:60]}...")
                results = self._search(q, max_results=MAX_RESULTS_PER_QUERY)
                print(f"      Found {len(results)} results")
                for r in results:
                    url = r.get("url", "").strip()
                    if not url or url.startswith("javascript:"):
                        continue
                    entry = {"query": q, "url": url, "title": r.get("title", ""), "snippet": r.get("snippet", "")}
                    all_urls.append(entry)

                    # Scrape text
                    text = self._scrape_url(url)
                    if text:
                        all_text.append(f"--- {url} ---\n{text[:5000]}\n")

                    # Download PDFs/images
                    if self._is_downloadable(url):
                        path = self._download_file(url, files_dir)
                        if path:
                            downloaded_paths.append(path)

            # Save urls.json and data.txt
            urls_file = os.path.join(work_dir, "urls.json")
            data_file = os.path.join(work_dir, "data.txt")

            with open(urls_file, "w", encoding="utf-8") as f:
                json.dump(all_urls, f, indent=2, ensure_ascii=False)

            with open(data_file, "w", encoding="utf-8") as f:
                f.write("\n".join(all_text) if all_text else "No scraped data.")

            # Upload to blob: griviences/<grievanceId>/internet/
            prefix = f"griviences/{grievance_id}/internet"
            blob_container = self.blob_client.get_container_client(self.container_name)
            try:
                self.blob_client.create_container(self.container_name)
            except Exception:
                pass

            blob_urls = {}

            def upload_local(local_path: str, blob_name: str) -> Optional[str]:
                if not os.path.isfile(local_path):
                    return None
                blob_path = f"{prefix}/{blob_name}"
                blob = blob_container.get_blob_client(blob_path)
                with open(local_path, "rb") as f:
                    blob.upload_blob(f, overwrite=True)
                return blob.url

            blob_urls["urls_json"] = upload_local(urls_file, "urls.json")
            blob_urls["data_txt"] = upload_local(data_file, "data.txt")

            for fp in downloaded_paths:
                name = os.path.basename(fp)
                url = upload_local(fp, f"files/{name}")
                if url:
                    blob_urls[f"file_{name}"] = url

            links = [u.get("url") for u in all_urls if u.get("url")]

            result = {
                **msg,
                "current_status": "WebCrawlingComplete",
                "links": links,
                "blob_urls": blob_urls,
                "urls_count": len(all_urls),
                "downloaded_count": len(downloaded_paths),
                "webcrawling_completed_at": datetime.utcnow().isoformat() + "Z",
            }

            print(f"   URLs: {len(all_urls)}, Downloaded: {len(downloaded_paths)}")
            return result

        finally:
            import shutil
            try:
                shutil.rmtree(work_dir, ignore_errors=True)
            except Exception:
                pass

    def _call_api_callback(self, payload: Dict[str, Any]) -> bool:
        try:
            url = f"{self.api_callback_url.rstrip('/')}/api/worker/webcrawler-callback"
            resp = requests.post(url, json=payload, timeout=15)
            return resp.ok
        except Exception as e:
            print(f"    API callback failed: {e}")
            return False

    def run(self):
        poll_interval = 5
        print("\n🚀 WebCrawling Worker started. Waiting for messages...\n")

        while True:
            try:
                messages = self.queue_client.receive_messages(
                    messages_per_page=1, visibility_timeout=600
                )
                processed = False

                for msg in messages:
                    try:
                        data = self._decode_message(msg.content)
                        if data.get("current_status") != "WebCrawling":
                            continue

                        processed = True
                        result = self.process_message(data)

                        self.queue_client.delete_message(msg.id, msg.pop_receipt)

                        if self._call_api_callback(result):
                            print("   📤 API callback OK – links sent")
                        else:
                            print("    API callback failed")

                        print(f"   WebCrawling complete. Status: {result.get('current_status')}\n")

                    except Exception as e:
                        print(f"   ❌ Error: {e}")
                        try:
                            self.queue_client.delete_message(msg.id, msg.pop_receipt)
                        except Exception:
                            pass

                if not processed:
                    time.sleep(poll_interval)

            except KeyboardInterrupt:
                print("\n Worker stopped by user")
                break
            except Exception as e:
                print(f"❌ Loop error: {e}")
                time.sleep(poll_interval)


if __name__ == "__main__":
    worker = WebCrawlingWorker()
    worker.run()
