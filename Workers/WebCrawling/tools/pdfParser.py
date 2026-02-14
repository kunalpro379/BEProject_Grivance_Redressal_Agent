import os
import json
import PyPDF2
from utils.config import FILES_DIR, EXTRACTED_PDF_TEXT_FILE, CHUNK_SIZE, CHUNK_OVERLAP

class PDFProcessorTool:
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF file"""
        try:
            text = ""
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"✗ Error extracting text from {pdf_path}: {e}")
            return ""
    
    def chunk_text(self, text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)
            
            if i + chunk_size >= len(words):
                break
        
        return chunks
    
    def process_pdf_folder(self, pdf_folder=FILES_DIR):
        """Process all PDFs in a folder and extract text"""
        pdf_data = []
        
        if not os.path.exists(pdf_folder):
            print(f"✗ PDF folder does not exist: {pdf_folder}")
            return pdf_data
        
        for filename in os.listdir(pdf_folder):
            if filename.lower().endswith('.pdf'):
                pdf_path = os.path.join(pdf_folder, filename)
                print(f"Processing PDF: {filename}")
                
                text = self.extract_text_from_pdf(pdf_path)
                if text:
                    chunks = self.chunk_text(text)
                    
                    for i, chunk in enumerate(chunks):
                        pdf_data.append({
                            "filename": filename,
                            "chunk_id": i,
                            "text": chunk,
                            "total_chunks": len(chunks)
                        })
        
        with open(EXTRACTED_PDF_TEXT_FILE, "w", encoding="utf-8") as f:
            json.dump(pdf_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Processed {len(pdf_data)} chunks from PDFs")
        return pdf_data