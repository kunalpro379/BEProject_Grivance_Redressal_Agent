import os
import uuid
import tempfile
import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict, List
import requests


class PDFProcessor:
    """Process PDF files and extract text content"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "kb_pdfs"
        self.temp_dir.mkdir(exist_ok=True)
    
    def download_pdf(self, url: str) -> str:
        """Download PDF from URL to temp file"""
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            
            # Create temp file
            temp_path = self.temp_dir / f"{uuid.uuid4()}.pdf"
            
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            
            print(f"    ✓ Downloaded PDF to: {temp_path}")
            return str(temp_path)
            
        except Exception as e:
            print(f"   ❌ Failed to download PDF: {e}")
            raise
    
    def extract_pdf_text(self, pdf_path: str) -> Dict:
        """Extract text from PDF using PyMuPDF"""
        try:
            doc = fitz.open(pdf_path)
            pages = []
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    pages.append({
                        "page": page_num,
                        "text": text.strip()
                    })
            
            doc.close()
            
            # Combine all text
            full_text = "\n\n".join([p["text"] for p in pages])
            
            return {
                'success': True,
                'text': full_text,
                'pages': pages,
                'num_pages': len(pages)
            }
            
        except Exception as e:
            print(f"   ❌ Failed to extract text from PDF: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_pdf_url(self, url: str) -> Dict:
        """Download and process PDF from URL"""
        print(f"   🔄 Processing PDF from URL...")
        
        pdf_path = None
        try:
            # Download PDF
            pdf_path = self.download_pdf(url)
            
            # Extract text
            result = self.extract_pdf_text(pdf_path)
            return result
            
        finally:
            # Cleanup temp file
            if pdf_path and os.path.exists(pdf_path):
                try:
                    os.unlink(pdf_path)
                except Exception as e:
                    print(f"    ⚠️  Failed to cleanup temp file: {e}")
    
    def cleanup(self):
        """Cleanup temp directory"""
        try:
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            print(f"    ⚠️  Failed to cleanup temp directory: {e}")
