import os
import requests
import urllib.parse
import json
from utils.config import FILES_DIR, DOWNLOADED_FILES_FILE, SEARCH_TIMEOUT

class FileDownloaderTool:
    def download_file(self, url, folder=FILES_DIR):
        """Download files from URLs"""
        try:
            parsed_url = urllib.parse.urlparse(url)
            filename = os.path.basename(parsed_url.path)
            
            if not filename or not os.path.splitext(filename)[1]:
                filename = f"downloaded_file_{abs(hash(url))}.pdf"
            
            filepath = os.path.join(folder, filename)
            
            response = requests.get(url, timeout=SEARCH_TIMEOUT, stream=True)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"✓ Downloaded: {filename}")
            return filepath
            
        except Exception as e:
            print(f"✗ Failed to download {url}: {e}")
            return None
    
    def download_files_from_sources(self, sources):
        """Download files from sources list"""
        downloaded_files = []
        
        for source in sources:
            url = source['url']
            
            if any(url.lower().endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']):
                filepath = self.download_file(url)
                if filepath:
                    downloaded_files.append({
                        'source_title': source['title'],
                        'url': url,
                        'filepath': filepath,
                        'file_type': os.path.splitext(filepath)[1].lower()
                    })
        
        with open(DOWNLOADED_FILES_FILE, "w", encoding="utf-8") as f:
            json.dump(downloaded_files, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ Downloaded {len(downloaded_files)} files")
        return downloaded_files