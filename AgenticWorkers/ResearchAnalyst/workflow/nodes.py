from typing import Dict, Any
from workflow.state import ResearchState
from config.db import DatabaseManager
from agents.planner_agent import PlannerAgent
from agents.analyzer_agent import AnalyzerAgent
from tools.search_tool import InternetSearchTool
from tools.vector_db import VectorDBTool
from tools.queue_manager import AzureQueueManager
from tools.result_validator import ResultValidator

class WorkflowNodes:
    def __init__(self, groq_api_key: str, db_manager: DatabaseManager):
        self.db = db_manager
        self.planner = PlannerAgent(groq_api_key)
        self.analyzer = AnalyzerAgent(groq_api_key)
        self.search_tool = InternetSearchTool()
        self.vector_db = VectorDBTool(db_manager)
        self.queue_manager = AzureQueueManager()
        self.validator = ResultValidator(min_score=0.5, min_content_length=100)
    
    def fetch_grievance_data(self, state: ResearchState) -> ResearchState:
        """Node: Fetch grievance and related data from database"""
        print(f" Fetching data for grievance: {state['grievance_id']}")
        
        grievance_id = state['grievance_id']
        
        # Fetch similar grievances
        similar = self.db.get_similar_grievances(grievance_id, limit=5)
        state['similar_grievances'] = similar
        
        # Fetch patterns
        patterns = self.db.get_grievance_patterns(limit=10)
        state['patterns'] = patterns
        
        print(f"Found {len(similar)} similar grievances and {len(patterns)} patterns")
        return state
    
    def create_plan(self, state: ResearchState) -> ResearchState:
        """Node: Create research plan"""
        print("🎯 Creating research plan...")
        
        plan = self.planner.create_research_plan(
            state['grievance_data'],
            state['similar_grievances']
        )
        state['research_plan'] = plan
        
        print("Research plan created")
        return state
    
    def search_schemes(self, state: ResearchState) -> ResearchState:
        """Node: Search for government schemes"""
        print(" Searching government schemes...")
        
        category = state['grievance_data'].get('category', {})
        category_str = str(category) if category else "general"
        
        results = self.search_tool.search_government_schemes(category_str)
        
        # Validate results
        validation = self.validator.validate_results(results)
        state['schemes_results'] = validation['valid_results']
        
        print(f"Found {len(results)} results, {validation['stats']['valid']} validated")
        if validation['stats']['invalid'] > 0:
            print(f"  ⚠️  Filtered out {validation['stats']['invalid']} invalid results")
        
        return state
    
    def search_budget(self, state: ResearchState) -> ResearchState:
        """Node: Search for budget allocations"""
        print("💰 Searching budget allocations...")
        
        department = state['grievance_data'].get('department_info', {})
        category = state['grievance_data'].get('category', {})
        
        dept_name = department.get('name', 'general') if isinstance(department, dict) else str(department)
        category_str = str(category) if category else "infrastructure"
        
        results = self.search_tool.search_budget_allocation(dept_name, category_str)
        
        # Validate results
        validation = self.validator.validate_results(results)
        state['budget_results'] = validation['valid_results']
        
        print(f"Found {len(results)} results, {validation['stats']['valid']} validated")
        if validation['stats']['invalid'] > 0:
            print(f"  ⚠️  Filtered out {validation['stats']['invalid']} invalid results")
        
        return state
    
    def search_development_plans(self, state: ResearchState) -> ResearchState:
        """Node: Search for development plans"""
        print("Searching development plans...")
        
        location = state['grievance_data'].get('extracted_location', {})
        category = state['grievance_data'].get('category', {})
        
        location_str = location.get('city', 'India') if isinstance(location, dict) else "India"
        category_str = str(category) if category else "infrastructure"
        
        results = self.search_tool.search_development_plans(location_str, category_str)
        
        # Validate results
        validation = self.validator.validate_results(results)
        state['development_results'] = validation['valid_results']
        
        print(f"Found {len(results)} results, {validation['stats']['valid']} validated")
        if validation['stats']['invalid'] > 0:
            print(f"  ⚠️  Filtered out {validation['stats']['invalid']} invalid results")
        
        return state
    
    def search_resources(self, state: ResearchState) -> ResearchState:
        """Node: Search for resources and guidelines"""
        print("📚 Searching resources...")
        
        category = state['grievance_data'].get('category', {})
        category_str = str(category) if category else "general"
        
        results = self.search_tool.search_resources(category_str)
        
        # Validate results
        validation = self.validator.validate_results(results)
        state['resources_results'] = validation['valid_results']
        
        print(f"Found {len(results)} results, {validation['stats']['valid']} validated")
        if validation['stats']['invalid'] > 0:
            print(f"  ⚠️  Filtered out {validation['stats']['invalid']} invalid results")
        
        return state
    
    def analyze_results(self, state: ResearchState) -> ResearchState:
        """Node: Analyze all research results"""
        print("Analyzing research results...")
        
        search_results = {
            'schemes': state.get('schemes_results', []),
            'budget': state.get('budget_results', []),
            'development': state.get('development_results', []),
            'resources': state.get('resources_results', [])
        }
        
        analysis = self.analyzer.analyze_research_results(
            state['grievance_data'],
            search_results,
            state.get('patterns', [])
        )
        state['analysis'] = analysis
        
        print("Analysis complete")
        return state
    
    def generate_report(self, state: ResearchState) -> ResearchState:
        """Node: Generate final report and push validated URLs to queue"""
        print(" Generating final report...")
        
        # Collect all validated results
        search_results = {
            'schemes': state.get('schemes_results', []),
            'budget': state.get('budget_results', []),
            'development': state.get('development_results', []),
            'resources': state.get('resources_results', [])
        }
        
        # Calculate validation statistics
        total_results = sum(len(results) for results in search_results.values())
        
        report = {
            'grievance_id': state['grievance_id'],
            'research_plan': state.get('research_plan', {}),
            'analysis': state.get('analysis', {}),
            'search_results': search_results,
            'validation_stats': {
                'total_validated_results': total_results,
                'schemes_count': len(search_results['schemes']),
                'budget_count': len(search_results['budget']),
                'development_count': len(search_results['development']),
                'resources_count': len(search_results['resources'])
            },
            'similar_grievances_count': len(state.get('similar_grievances', [])),
            'patterns_identified': len(state.get('patterns', [])),
            'timestamp': state.get('analysis', {}).get('timestamp', ''),
            'sources': state.get('analysis', {}).get('sources', [])
        }
        
        state['final_report'] = report
        
        # Push only validated URLs to Azure Queue for WebCrawler
        print(f"\n📤 Pushing {total_results} validated URLs to WebCrawler queue...")
        queue_results = self.queue_manager.push_search_results(
            report['search_results'],
            grievance_id=state['grievance_id']
        )
        
        # Add queue results to report
        report['queue_push_results'] = queue_results
        
        # Save to database
        self.db.save_research_result(state['grievance_id'], report)
        
        print("Report generated and saved")
        print(f"✅ Pushed {queue_results['success']} validated URLs to WebCrawler queue")
        return state
    
    def handle_error(self, state: ResearchState) -> ResearchState:
        """Node: Handle errors"""
        print(f"❌ Error occurred: {state.get('error', 'Unknown error')}")
        
        state['final_report'] = {
            'grievance_id': state['grievance_id'],
            'error': state.get('error', 'Unknown error'),
            'status': 'failed'
        }
        
        return state
