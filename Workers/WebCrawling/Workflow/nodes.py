"""
Workflow nodes for Grievance Redressal System
This module provides node functions that wrap agent functionality
"""

from Workflow.states import GrievanceState
from Agents import (
    ClassifierAgent,
    AnalyzerAgent,
    SearchAgent,
    ValidationAgent,
    FileDownloadAgent,
    CrawlerAgent,
    PDFProcessorAgent,
    VectorDBAgent
)

# Initialize agents
classifier_agent = ClassifierAgent()
analyzer_agent = AnalyzerAgent()
search_agent = SearchAgent()
validation_agent = ValidationAgent()
file_download_agent = FileDownloadAgent()
crawler_agent = CrawlerAgent()
pdf_processor_agent = PDFProcessorAgent()
vector_db_agent = VectorDBAgent()


def classify_query_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for ClassifierAgent"""
    return classifier_agent.classify_query(state)


def analyze_query_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for AnalyzerAgent"""
    return analyzer_agent.analyze_query(state)


def search_sources_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for SearchAgent"""
    return search_agent.search_sources(state)


def validate_sources_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for ValidationAgent"""
    return validation_agent.validate_sources(state)


def download_files_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for FileDownloadAgent"""
    return file_download_agent.download_files(state)


async def crawl_pages_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for CrawlerAgent"""
    return await crawler_agent.crawl_pages(state)


def process_pdfs_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for PDFProcessorAgent"""
    return pdf_processor_agent.process_pdfs(state)


def create_vector_db_node(state: GrievanceState) -> GrievanceState:
    """Node wrapper for VectorDBAgent"""
    return vector_db_agent.create_vector_db(state)