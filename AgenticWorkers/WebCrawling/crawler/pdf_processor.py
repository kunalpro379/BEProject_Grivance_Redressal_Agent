"""
PDF Text Extraction Module

Handles downloading and extracting text from PDF files
"""

import logging
import io
import requests
from typing import Optional
import pdfplumber
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Extract text from PDF files"""
    
    @staticmethod
    def download_pdf(url: str, timeout: int = 30) -> Optional[bytes]:
        """Download PDF from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=timeout, stream=True)
            response.raise_for_status()
            
            # Check if it's actually a PDF
            content_type = response.headers.get('Content-Type', '')
            if 'pdf' not in content_type.lower() and not url.lower().endswith('.pdf'):
                logger.warning(f"URL may not be a PDF: {url} (Content-Type: {content_type})")
            
            return response.content
        except Exception as e:
            logger.error(f"Error downloading PDF from {url}: {e}")
            return None
    
    @staticmethod
    def extract_text_pdfplumber(pdf_bytes: bytes) -> Optional[str]:
        """Extract text using pdfplumber (better for complex PDFs)"""
        try:
            text_parts = []
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    try:
                        text = page.extract_text()
                        if text:
                            text_parts.append(f"--- Page {page_num} ---\n{text}\n")
                    except Exception as page_error:
                        logger.warning(f"Error extracting page {page_num}: {page_error}")
                        continue
            
            return '\n'.join(text_parts) if text_parts else None
        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
            return None
    
    @staticmethod
    def extract_text_pypdf2(pdf_bytes: bytes) -> Optional[str]:
        """Extract text using PyPDF2 (fallback method)"""
        try:
            text_parts = []
            pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
            
            for page_num, page in enumerate(pdf_reader.pages, 1):
                try:
                    text = page.extract_text()
                    if text:
                        text_parts.append(f"--- Page {page_num} ---\n{text}\n")
                except Exception as page_error:
                    logger.warning(f"Error extracting page {page_num}: {page_error}")
                    continue
            
            return '\n'.join(text_parts) if text_parts else None
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed: {e}")
            return None
    
    @staticmethod
    def extract_text_from_pdf(url: str) -> Optional[str]:
        """
        Download and extract complete text from PDF
        
        Args:
            url: URL of the PDF file
            
        Returns:
            Extracted text or None if extraction fails
        """
        logger.info(f"📄 Extracting PDF: {url}")
        
        # Download PDF
        pdf_bytes = PDFProcessor.download_pdf(url)
        if not pdf_bytes:
            logger.error(f"Failed to download PDF: {url}")
            return None
        
        logger.info(f"Downloaded PDF: {len(pdf_bytes)} bytes")
        
        # Try pdfplumber first (better quality)
        text = PDFProcessor.extract_text_pdfplumber(pdf_bytes)
        
        # Fallback to PyPDF2 if pdfplumber fails
        if not text or len(text.strip()) < 100:
            logger.info("Trying PyPDF2 as fallback...")
            text = PDFProcessor.extract_text_pypdf2(pdf_bytes)
        
        if text and len(text.strip()) > 0:
            logger.info(f"✅ Extracted {len(text)} characters from PDF")
            return text
        else:
            logger.error(f"❌ No text extracted from PDF: {url}")
            return None
    
    @staticmethod
    def is_pdf_url(url: str) -> bool:
        """Check if URL points to a PDF file"""
        url_lower = url.lower()
        return url_lower.endswith('.pdf') or '.pdf?' in url_lower or '/pdf/' in url_lower
