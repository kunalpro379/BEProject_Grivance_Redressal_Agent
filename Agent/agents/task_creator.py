"""
Task Creator for creating and managing all analysis tasks
"""

import json
from crewai import Task
from typing import List, Dict


class TaskCreator:
    """Creates and manages all analysis tasks"""

    def __init__(self, agents_manager):
        self.agents_manager = agents_manager

    def create_database_selection_task(self, grievance_text: str, db_schemas: List) -> Task:
        """Create task for database selection"""
        db_descriptions = "\n".join([f"{i+1}. {db['description']}" for i, db in enumerate(db_schemas)])

        return Task(
            description=f"""Analyze the following grievance and decide which databases are most relevant:

            GRIEVANCE: {grievance_text}

            AVAILABLE DATABASES:
            {db_descriptions}

            Return ONLY a JSON array of database indices (0-based) that are most relevant.
            Example: [0, 2, 4]""",
            agent=self.agents_manager.get_agent('db_router'),
            expected_output="JSON array of database indices"
        )

    def create_query_type_task(self, enhanced_query: str) -> Task:
        """Create query type classification task"""
        return Task(
            description=f"""Classify the query type:

            QUERY: {enhanced_query}

            Provide JSON response with:
            - query_type: Complaint/Suggestion/Query/Feedback/Follow-up/Appeal
            - confidence: High/Medium/Low
            - reasoning: brief explanation""",
            agent=self.agents_manager.get_agent('query_type'),
            expected_output="JSON with query type classification"
        )

    def create_location_task(self, enhanced_query: str) -> Task:
        """Create location detection task"""
        return Task(
            description=f"""Extract location information:

            QUERY: {enhanced_query}

            Provide JSON response with:
            - pincode: string (if found)
            - district: string
            - state: string
            - location_confidence: High/Medium/Low
            - raw_location_mentions: array""",
            agent=self.agents_manager.get_agent('location'),
            expected_output="JSON with location information"
        )

    def create_emotion_task(self, enhanced_query: str) -> Task:
        """Create emotion analysis task"""
        return Task(
            description=f"""Analyze emotional content:

            QUERY: {enhanced_query}

            Provide JSON response with:
            - primary_emotion: Angry/Frustrated/Sad/Confused/Urgent/Neutral
            - secondary_emotions: array
            - emotion_intensity: number (1-10)
            - emotional_indicators: array of phrases""",
            agent=self.agents_manager.get_agent('emotion'),
            expected_output="JSON with emotion analysis"
        )

    def create_severity_task(self, enhanced_query: str) -> Task:
        """Create severity assessment task"""
        return Task(
            description=f"""Assess severity:

            QUERY: {enhanced_query}

            Provide JSON response with:
            - severity_level: Critical/High/Medium/Low
            - criticality_score: number (1-10)
            - impact_scope: Individual/Community/Regional
            - potential_consequences: array""",
            agent=self.agents_manager.get_agent('severity'),
            expected_output="JSON with severity assessment"
        )

    def create_pattern_task(self, enhanced_query: str) -> Task:
        """Create pattern detection task"""
        return Task(
            description=f"""Detect patterns:

            QUERY: {enhanced_query}

            Provide JSON response with:
            - is_recurring_issue: boolean
            - similar_patterns_found: array
            - spam_likelihood: Low/Medium/High
            - pattern_notes: string""",
            agent=self.agents_manager.get_agent('pattern'),
            expected_output="JSON with pattern detection"
        )

    def create_fraud_task(self, enhanced_query: str) -> Task:
        """Create fraud detection task"""
        return Task(
            description=f"""Detect fraud/spam:

            QUERY: {enhanced_query}

            Provide JSON response with:
            - fraud_risk: Low/Medium/High
            - spam_indicators: array
            - authenticity_confidence: High/Medium/Low
            - verification_recommendations: array""",
            agent=self.agents_manager.get_agent('fraud'),
            expected_output="JSON with fraud detection"
        )

    def create_category_task(self, grievance_text: str, retrieved_data: Dict) -> Task:
        """Create category analysis task"""
        return Task(
            description=f"""Analyze this grievance and determine its category:

            GRIEVANCE: {grievance_text}

            RETRIEVED DATA: {json.dumps(retrieved_data, indent=2)}

            Provide a JSON response with:
            - main_category: string
            - sub_category: string
            - confidence: string (High/Medium/Low)
            - reasoning: brief explanation""",
            agent=self.agents_manager.get_agent('category'),
            expected_output="JSON with category analysis"
        )

    def create_similar_cases_task(self, grievance_text: str, retrieved_data: Dict) -> Task:
        """Create similar cases analysis task"""
        return Task(
            description=f"""Find and analyze similar cases:

            GRIEVANCE: {grievance_text}

            RETRIEVED DATA: {json.dumps(retrieved_data, indent=2)}

            Provide a JSON response with:
            - top_3_similar_cases: array of case summaries
            - common_resolutions: array of how similar cases were resolved
            - patterns_identified: array of key patterns""",
            agent=self.agents_manager.get_agent('similar_cases'),
            expected_output="JSON with similar cases analysis"
        )

    def create_department_task(self, grievance_text: str, retrieved_data: Dict) -> Task:
        """Create department routing task"""
        return Task(
            description=f"""Determine appropriate department:

            GRIEVANCE: {grievance_text}

            RETRIEVED DATA: {json.dumps(retrieved_data, indent=2)}

            Provide a JSON response with:
            - recommended_department: string
            - contact_information: string
            - jurisdiction: string
            - escalation_path: string""",
            agent=self.agents_manager.get_agent('department'),
            expected_output="JSON with department routing"
        )

    def create_policy_task(self, grievance_text: str, retrieved_data: Dict) -> Task:
        """Create policy recommendation task"""
        return Task(
            description=f"""Recommend relevant policies/schemes:

            GRIEVANCE: {grievance_text}

            RETRIEVED DATA: {json.dumps(retrieved_data, indent=2)}

            Provide a JSON response with:
            - relevant_schemes: array of scheme names
            - eligibility_criteria: array of criteria
            - application_process: string
            - benefits: array of benefits""",
            agent=self.agents_manager.get_agent('policy'),
            expected_output="JSON with policy recommendations"
        )

    def create_sentiment_task(self, grievance_text: str) -> Task:
        """Create sentiment analysis task"""
        return Task(
            description=f"""Analyze sentiment and urgency:

            GRIEVANCE: {grievance_text}

            Provide a JSON response with:
            - sentiment_score: number (1-10)
            - urgency_level: string (High/Medium/Low)
            - emotional_tone: string
            - key_emotional_indicators: array""",
            agent=self.agents_manager.get_agent('sentiment'),
            expected_output="JSON with sentiment analysis"
        )

    def create_priority_task(self, grievance_text: str) -> Task:
        """Create priority assessment task"""
        return Task(
            description=f"""Assess priority level:

            GRIEVANCE: {grievance_text}

            Provide a JSON response with:
            - priority_level: string (High/Medium/Low)
            - justification: string
            - expected_resolution_time: string
            - risk_assessment: string""",
            agent=self.agents_manager.get_agent('priority'),
            expected_output="JSON with priority assessment"
        )

    def create_final_task(self, grievance_text: str, retrieved_data: Dict, context_tasks: List[Task]) -> Task:
        """Create final consolidation task"""
        return Task(
            description=f"""Consolidate all analyses into a comprehensive report:

            GRIEVANCE: {grievance_text}

            RETRIEVED DATA: {json.dumps(retrieved_data, indent=2)}

            Create a comprehensive report with structured sections:
            - Executive Summary
            - Category Classification
            - Similar Cases Analysis
            - Department Recommendation
            - Policy Suggestions
            - Sentiment and Priority Assessment
            - Actionable Recommendations
            - Expected Timeline

            Format the response as a well-structured report with clear headings.""",
            agent=self.agents_manager.get_agent('manager'),
            expected_output="Comprehensive grievance analysis report",
            context=context_tasks
        )
