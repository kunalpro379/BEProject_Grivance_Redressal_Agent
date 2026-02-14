from Workflow.states import GrievanceState
from tools.FileDownloader import FileDownloaderTool


class FileDownloadAgent:
    """Agent responsible for downloading files from sources"""
    
    def __init__(self):
        self.file_tool = FileDownloaderTool()
    
    def download_files(self, state: GrievanceState) -> GrievanceState:
        """Download files from sources"""
        print("\n" + "="*80)
        print("NODE: Downloading Files")
        print("="*80)
        
        sources = state["sources"]
        downloaded_files = self.file_tool.download_files_from_sources(sources)
        
        state["downloaded_files"] = downloaded_files
        state["status"] = "files_downloaded"
        
        return state
