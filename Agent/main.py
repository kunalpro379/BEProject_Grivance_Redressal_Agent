"""
Main orchestrator for the Intelligent Grievance Analyzer
"""

import os
import json
import re
import builtins as _builtins
from datetime import datetime
from urllib.parse import urlparse
from typing import Dict, List, Any

from crewai import Task, Crew

# Import all our modular components
from utils.config import Config
from neondb.database_engine import DatabaseQueryEngine
from tools.image_analyzer import ImageAnalysisEngine
from tools.content_validator import ContentValidator
from agents.agents_manager import AgentsManager
from agents.task_creator import TaskCreator
from llms.groq_llm import GroqLLM

# Disable CrewAI interactive tracing prompts globally
os.environ["CREWAI_TRACING_ENABLED"] = "false"
os.environ["CREWAI_TRACE_ENABLED"] = "false"
os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "1"

# Force auto-consent to any tracing prompts without blocking (default: yes)
_original_input = _builtins.input

def _auto_accept_tracing(prompt: str = "") -> str:
    try:
        if isinstance(prompt, str) and "Would you like to view your execution traces?" in prompt:
            return "y"  # auto-accept without user interaction
    except Exception:
        pass
    return _original_input(prompt)

_builtins.input = _auto_accept_tracing


class IntelligentGrievanceAnalyzer:
    """Main orchestrator for the Intelligent Grievance Analyzer"""
    
    def __init__(self):
        self.llm = GroqLLM.initialize_llm()
        self.db_engine = DatabaseQueryEngine()
        self.image_engine = ImageAnalysisEngine()
        self.validator = ContentValidator()
        self.agents_manager = AgentsManager(self.llm)
        self.task_creator = TaskCreator(self.agents_manager)

        # Store all intermediate results
        self.all_agent_outputs = {}

    def decide_databases_to_query(self, grievance_text: str) -> List[Dict]:
        """Use LLM to decide which databases to query based on grievance content"""
        db_descriptions = "\n".join([f"{i+1}. {db['description']}" for i, db in enumerate(Config.DB_SCHEMAS)])

        router_task = Task(
            description=f"""Analyze the following grievance and decide which databases are most relevant:

            GRIEVANCE: {grievance_text}

            AVAILABLE DATABASES:
            {db_descriptions}

            Return ONLY a JSON array of database indices (0-based) that are most relevant.
            Example: [0, 2, 4]""",
            agent=self.agents_manager.get_agent('db_router'),
            expected_output="JSON array of database indices"
        )

        crew = Crew(
            agents=[self.agents_manager.get_agent('db_router')],
            tasks=[router_task],
            verbose=True,
            tracing=False
        )

        result = crew.kickoff()

        # Store agent output
        self.all_agent_outputs['database_selection'] = {
            'raw_output': result.raw,
            'task_description': router_task.description
        }

        try:
            json_match = re.search(r'\[.*\]', result.raw)
            if json_match:
                db_indices = json.loads(json_match.group())
                return [Config.DB_SCHEMAS[i] for i in db_indices if i < len(Config.DB_SCHEMAS)]
        except Exception as parse_error:
            raise RuntimeError(f"Failed to parse database selection output: {parse_error}. Raw: {result.raw}")

        # Strict behavior: do not continue silently when parsing fails
        raise RuntimeError(f"Database selection agent returned unparseable output. Raw: {result.raw}")

    def retrieve_relevant_data(self, grievance_text: str, selected_dbs: List[Dict]) -> Dict:
        """Retrieve data from selected databases"""
        all_results = {}
        for i, db in enumerate(selected_dbs):
            db_url = db["db_url"]
            parsed = urlparse(db_url)
            db_name = f"db_{i+1}_{parsed.hostname.split('.')[0]}"
            print(f"🔍 Querying Database {i+1}: {db_name}")
            all_results[db_name] = {}

            for table_config in db["tables"]:
                table_name = table_config["table"]
                embedding_col = table_config["embedding_col"]
                print(f"  📊 Querying table: {table_name}...")
                results = self.db_engine.query_table(grievance_text, db_url, table_name, embedding_col)
                all_results[db_name][table_name] = results

        return all_results

    def analyze_grievance(self, grievance_text: str, image_path: str = None) -> Dict[str, Any]:
        """Main method to analyze grievance comprehensively"""

        print("=" * 80)
        print(f"ANALYZING GRIEVANCE: {grievance_text}")
        if image_path:
            print(f"WITH IMAGE: {image_path}")
        print("=" * 80)

        # Step 1: Image Analysis and Content Validation
        enhanced_query = grievance_text
        image_analysis = None
        content_validation = None

        if image_path:
            print("🖼️  Analyzing image...")
            image_analysis = self.image_engine.analyze_image(image_path, grievance_text)
            print("✅ Image analysis completed")

            print("🔍 Validating content...")
            content_validation = self.validator.validate_content(grievance_text, image_analysis)
            print("✅ Content validation completed")

            enhanced_query = content_validation.get('enhanced_query', grievance_text)

        # Step 2: Database Selection
        print("🗄️  Deciding which databases to query...")
        selected_dbs = self.decide_databases_to_query(enhanced_query)
        print(f"✅ Selected {len(selected_dbs)} databases")

        # Step 3: Data Retrieval
        print("📊 Retrieving relevant data...")
        retrieved_data = self.retrieve_relevant_data(enhanced_query, selected_dbs)
        print("✅ Data retrieval completed")

        # Step 4: Create Analysis Tasks
        print("🤖 Creating analysis tasks...")

        # Pre-analysis tasks
        pre_tasks = [
            self.task_creator.create_query_type_task(enhanced_query),
            self.task_creator.create_location_task(enhanced_query),
            self.task_creator.create_emotion_task(enhanced_query),
            self.task_creator.create_severity_task(enhanced_query),
            self.task_creator.create_pattern_task(enhanced_query),
            self.task_creator.create_fraud_task(enhanced_query),
        ]

        # Main analysis tasks
        main_tasks = [
            self.task_creator.create_category_task(enhanced_query, retrieved_data),
            self.task_creator.create_similar_cases_task(enhanced_query, retrieved_data),
            self.task_creator.create_department_task(enhanced_query, retrieved_data),
            self.task_creator.create_policy_task(enhanced_query, retrieved_data),
            self.task_creator.create_sentiment_task(enhanced_query),
            self.task_creator.create_priority_task(enhanced_query),
        ]

        # Final task
        final_task = self.task_creator.create_final_task(enhanced_query, retrieved_data, main_tasks)

        # Step 5: Execute Pre-analysis Tasks
        print("🔍 Running pre-analysis tasks...")
        pre_results = {}
        for task in pre_tasks:
            crew = Crew(
                agents=[task.agent],
                tasks=[task],
                verbose=False,
                tracing=False
            )
            result = crew.kickoff()
            pre_results[task.agent.role] = result.raw

            # Store agent output
            self.all_agent_outputs[task.agent.role] = {
                'raw_output': result.raw,
                'task_description': task.description
            }

        # Step 6: Execute Main Analysis Tasks
        print("🔍 Running main analysis tasks...")
        main_results = {}
        for task in main_tasks:
            crew = Crew(
                agents=[task.agent],
                tasks=[task],
                verbose=False,
                tracing=False
            )
            result = crew.kickoff()
            main_results[task.agent.role] = result.raw

            # Store agent output
            self.all_agent_outputs[task.agent.role] = {
                'raw_output': result.raw,
                'task_description': task.description
            }

        # Step 7: Execute Final Task
        print("📋 Generating final report...")
        final_crew = Crew(
            agents=[self.agents_manager.get_agent('manager')],
            tasks=[final_task],
            verbose=True,
            tracing=False
        )
        final_result = final_crew.kickoff()

        # Store final agent output
        self.all_agent_outputs['final_report'] = {
            'raw_output': final_result.raw,
            'task_description': final_task.description
        }

        # Step 8: Compile Complete Results
        complete_result = {
            "final_report": final_result.raw,
            "pre_analysis": pre_results,
            "main_analysis": main_results,
            "retrieved_data": retrieved_data,
            "selected_databases": [db['description'] for db in selected_dbs],
            "image_analysis": image_analysis,
            "content_validation": content_validation,
            "enhanced_query": enhanced_query,
            "timestamp": datetime.now().isoformat()
        }

        return complete_result

    def save_results(self, analysis_result: Dict[str, Any]):
        """Save both final output and all agent outputs to JSON files"""

        # Save final analysis result
        with open('grievance_analysis_final.json', 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, indent=2, ensure_ascii=False)
        print("✅ Final analysis saved to: grievance_analysis_final.json")

        # Save all agent outputs
        with open('all_agent_outputs.json', 'w', encoding='utf-8') as f:
            json.dump(self.all_agent_outputs, f, indent=2, ensure_ascii=False)
        print("✅ All agent outputs saved to: all_agent_outputs.json")


def main():
    """Example usage of the Intelligent Grievance Analyzer"""

    # Initialize analyzer
    analyzer = IntelligentGrievanceAnalyzer()

    # Example grievance with image
    grievance_text = """
    There is a huge garbage pile near my apartment in Bangalore.
    It has been there for 2 weeks and is causing health issues.
    The BBMP workers are not cleaning it despite multiple complaints.
    Children are getting sick and the smell is unbearable.
    """

    # Optional image path (can be URL or local path)
    image_path = "garbage.jpeg"  # Replace with actual image path if available

    try:
        # Analyze grievance
        result = analyzer.analyze_grievance(grievance_text, image_path)

        # Save results to JSON files
        analyzer.save_results(result)

        print("\n" + "="*80)
        print("🎉 ANALYSIS COMPLETED SUCCESSFULLY!")
        print("="*80)
        print(f"📊 Final Report Length: {len(result['final_report'])} characters")
        print(f"🗄️  Databases Queried: {len(result['selected_databases'])}")
        print(f"🤖 Agents Used: {len(analyzer.all_agent_outputs)}")
        print("📁 Output Files:")
        print("   - grievance_analysis_final.json (Final structured output)")
        print("   - all_agent_outputs.json (All raw agent outputs)")

    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()