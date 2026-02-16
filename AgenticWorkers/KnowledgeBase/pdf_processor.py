import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
import PyPDF2
import requests


class PDFProcessor:
    """Process PDF files and extract text content"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "knowledgebase_pdfs"
        self.temp_dir.mkdir(exist_ok=True)
    
    def download_pdf(self, url: str) -> Optional[str]:
        """Download PDF from URL to temp file"""
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            
            # Create temp file
            suffix = ".pdf"
            fd, temp_path = tempfile.mkstemp(suffix=suffix, dir=self.temp_dir)
            os.close(fd)
            
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            
            print(f"   📥 Downloaded PDF to: {temp_path}")
            return temp_path
            
        except Exception as e:
            print(f"   ❌ Failed to download PDF: {e}")
            return None
    
    def extract_text_from_pdf(self, pdf_path: str) -> Dict[str, any]:
        """Extract text content from PDF file"""
        try:
            text_content = []
            metadata = {}
            
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Extract metadata
                if pdf_reader.metadata:
                    metadata = {
                        'title': pdf_reader.metadata.get('/Title', ''),
                        'author': pdf_reader.metadata.get('/Author', ''),
                        'subject': pdf_reader.metadata.get('/Subject', ''),
                        'creator': pdf_reader.metadata.get('/Creator', ''),
                    }
                
                # Extract text from each page
                num_pages = len(pdf_reader.pages)
                print(f"   📄 Processing {num_pages} pages...")
                
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    try:
                        text = page.extract_text()
                        if text.strip():
                            text_content.append({
                                'page': page_num,
                                'text': text.strip()
                            })
                    except Exception as e:
                        print(f"   ⚠️ Error extracting page {page_num}: {e}")
                        continue
            
            # Combine all text
            full_text = "\n\n".join([page['text'] for page in text_content])
            
            return {
                'success': True,
                'text': full_text,
                'pages': text_content,
                'num_pages': len(text_content),
                'metadata': metadata
            }
            
        except Exception as e:
            print(f"   ❌ Failed to extract text from PDF: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_pdf_url(self, url: str) -> Dict[str, any]:
        """Download and process PDF from URL"""
        print(f"   🔄 Processing PDF from URL...")
        
        # Download PDF
        pdf_path = self.download_pdf(url)
        if not pdf_path:
            return {'success': False, 'error': 'Failed to download PDF'}
        
        try:
            # Extract text
            result = self.extract_text_from_pdf(pdf_path)
            return result
        finally:
            # Cleanup temp file
            try:
                if pdf_path and os.path.exists(pdf_path):
                    os.unlink(pdf_path)
            except Exception as e:
                print(f"   ⚠️ Failed to cleanup temp file: {e}")
    
    def cleanup(self):
        """Cleanup temp directory"""
        try:
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            print(f"   ⚠️ Failed to cleanup temp directory: {e}")
