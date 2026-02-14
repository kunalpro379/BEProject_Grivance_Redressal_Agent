from Workflow.states import GrievanceState
from tools.pdfParser import PDFProcessorTool


class PDFProcessorAgent:
    """Agent responsible for processing PDF files"""
    
    def __init__(self):
        self.pdf_tool = PDFProcessorTool()
    
    def process_pdfs(self, state: GrievanceState) -> GrievanceState:
        """Process PDF files"""
        print("\n" + "="*80)
        print("NODE: Processing PDFs")
        print("="*80)
        
        pdf_data = self.pdf_tool.process_pdf_folder()
        
        state["pdf_data"] = pdf_data
        state["status"] = "pdfs_processed"
        
        return state
