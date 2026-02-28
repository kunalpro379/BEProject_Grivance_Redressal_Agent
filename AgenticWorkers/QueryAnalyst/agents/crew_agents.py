from __future__ import annotations

from typing import Dict, Any, List

from crewai import Agent, Task, LLM


class AgentsManager:
    """Manages all specialized CrewAI agents."""

    def __init__(self, llm: LLM):
        self.llm = llm
        self.agents: Dict[str, Agent] = {}
        self._setup_agents()

    def _setup_agents(self) -> None:
        """Setup all specialized agents."""

        # Database Router
        self.agents["db_router"] = Agent(
            role="Database Routing Specialist",
            goal="Analyze grievance content and determine which databases are most relevant",
            backstory=(
                "You are an expert in understanding grievance patterns and database content. "
                "You can analyze the nature of complaints and match them to the most appropriate databases."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Query Type Classification
        self.agents["query_type"] = Agent(
            role="Query Type Classification Specialist",
            goal=(
                "Classify the grievance type as Complaint, Suggestion, Query, Feedback, "
                "Follow-up, or Appeal"
            ),
            backstory=(
                "You are an expert in classifying public grievances and queries. "
                "You can accurately determine the type based on language, tone, and content."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Location Detection
        self.agents["location"] = Agent(
            role="Location Detection Specialist",
            goal="Extract and normalize location information including pincode, district, state",
            backstory=(
                "You specialize in Indian geography and can extract location information "
                "from text, normalizing it to standard formats with pincodes and district names."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Emotion Detection
        self.agents["emotion"] = Agent(
            role="Emotion Analysis Specialist",
            goal="Detect emotional tone including Angry, Frustrated, Sad, Confused, Urgent",
            backstory=(
                "You specialize in understanding emotional content and can "
                "accurately detect emotional states from text."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Severity Classification
        self.agents["severity"] = Agent(
            role="Severity Classification Specialist",
            goal="Classify severity and criticality of the grievance",
            backstory=(
                "You assess the severity and criticality of grievances "
                "based on impact, urgency, and potential consequences."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Pattern Detection
        self.agents["pattern"] = Agent(
            role="Pattern Detection Specialist",
            goal="Detect repeated patterns, recurring issues, and potential spam",
            backstory=(
                "You specialize in identifying patterns across grievances and "
                "can detect repeated issues or potential spam campaigns."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Fraud Detection
        self.agents["fraud"] = Agent(
            role="Fraud Detection Specialist",
            goal="Identify potential spam, fake complaints, and suspicious behavioral patterns",
            backstory=(
                "You are an expert in detecting fraudulent patterns through behavioral analysis. "
                "You analyze image-query consistency, complaint authenticity, and spam patterns. "
                "You DO NOT flag complaints based on keywords like 'fraud' or 'scam' in the text. "
                "Instead, you look for: mismatched images, vague details, generic complaints, "
                "promotional content, duplicate submissions, and suspicious patterns."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Category Analysis
        self.agents["category"] = Agent(
            role="Grievance Category Specialist",
            goal="Analyze grievance content and determine appropriate category and sub-category",
            backstory=(
                "You are an expert in classifying grievances into appropriate categories "
                "like sanitation, infrastructure, financial fraud, environmental issues, etc."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Similar Cases
        self.agents["similar_cases"] = Agent(
            role="Similar Cases Analyst",
            goal="Find and analyze similar historical grievances and their resolutions",
            backstory=(
                "You specialize in finding patterns across similar grievances and "
                "understanding how similar issues were resolved in the past."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Department Routing
        self.agents["department"] = Agent(
            role="Department Routing Specialist",
            goal="Identify which government department or authority should handle this grievance",
            backstory=(
                "You have extensive knowledge of government departments and their responsibilities. "
                "You can route grievances to the appropriate authorities based on the issue type."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Policy Recommendation / Search Queries
        self.agents["policy"] = Agent(
            role="Government Policy & Search Expert",
            goal=(
                "Suggest internet search queries and high-level policy directions, "
                "without directly querying any internal databases."
            ),
            backstory=(
                "You are knowledgeable about various government schemes and policies and "
                "can formulate effective web search queries to find relevant information."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Sentiment Analysis
        self.agents["sentiment"] = Agent(
            role="Sentiment Analysis Specialist",
            goal="Analyze the emotional tone and urgency of the grievance",
            backstory=(
                "You specialize in understanding the emotional context of grievances "
                "and can assess urgency levels based on language and content."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Priority Assessment
        self.agents["priority"] = Agent(
            role="Priority Assessment Specialist",
            goal="Determine the priority level of the grievance for resolution",
            backstory=(
                "You assess grievances based on multiple factors including impact, "
                "urgency, number of people affected, and potential consequences."
            ),
            llm=self.llm,
            verbose=True,
        )

        # Manager
        self.agents["manager"] = Agent(
            role="Grievance Analysis Manager",
            goal="Coordinate all analyses and produce comprehensive final report",
            backstory=(
                "You are an experienced manager who coordinates multiple specialists "
                "to produce comprehensive grievance analysis reports with actionable insights."
            ),
            llm=self.llm,
            verbose=True,
        )

    def get_agent(self, agent_name: str) -> Agent:
        """Get specific agent by name."""
        return self.agents[agent_name]

    def get_all_agents(self) -> List[Agent]:
        """Get all agents."""
        return list(self.agents.values())


class TaskCreator:
    """Creates and manages all analysis tasks for CrewAI."""

    def __init__(self, agents_manager: AgentsManager):
        self.agents_manager = agents_manager

    def create_query_type_task(self, enhanced_query: str) -> Task:
        return Task(
            description=f"""Classify the query type.

QUERY:
{enhanced_query}

Provide JSON response with:
- query_type: Complaint | Suggestion | Query | Feedback | Follow-up | Appeal
- confidence: High | Medium | Low
- reasoning: brief explanation""",
            agent=self.agents_manager.get_agent("query_type"),
            expected_output="JSON with query type classification",
        )

    def create_location_task(self, enhanced_query: str) -> Task:
        return Task(
            description=f"""Extract location information.

QUERY:
{enhanced_query}

Provide JSON response with:
- pincode: string (if found, else "")
- district: string
- state: string
- location_confidence: High | Medium | Low
- raw_location_mentions: array of strings""",
            agent=self.agents_manager.get_agent("location"),
            expected_output="JSON with location information",
        )

    def create_emotion_task(self, enhanced_query: str) -> Task:
        return Task(
            description=f"""Analyze emotional content.

QUERY:
{enhanced_query}

Provide JSON response with:
- primary_emotion: Angry | Frustrated | Sad | Confused | Urgent | Neutral
- secondary_emotions: array
- emotion_intensity: number (1-10)
- emotional_indicators: array of phrases""",
            agent=self.agents_manager.get_agent("emotion"),
            expected_output="JSON with emotion analysis",
        )

    def create_severity_task(self, enhanced_query: str) -> Task:
        return Task(
            description=f"""Assess severity.

QUERY:
{enhanced_query}

Provide JSON response with:
- severity_level: Critical | High | Medium | Low
- criticality_score: number (1-10)
- impact_scope: Individual | Community | Regional
- potential_consequences: array of strings""",
            agent=self.agents_manager.get_agent("severity"),
            expected_output="JSON with severity assessment",
        )

    def create_pattern_task(self, enhanced_query: str) -> Task:
        return Task(
            description=f"""Detect patterns and possible spam.

QUERY:
{enhanced_query}

Provide JSON response with:
- is_recurring_issue: boolean
- similar_patterns_found: array of strings
- spam_likelihood: Low | Medium | High
- pattern_notes: string""",
            agent=self.agents_manager.get_agent("pattern"),
            expected_output="JSON with pattern detection",
        )

    def create_fraud_task(self, enhanced_query: str, validation_result: Dict[str, Any] = None) -> Task:
        validation_info = ""
        if validation_result:
            validation_info = f"""
IMAGE VALIDATION RESULT:
- Is Valid: {validation_result.get('is_valid', True)}
- Validation Score: {validation_result.get('validation_score', 'N/A')}
- Reasoning: {validation_result.get('reasoning', 'N/A')}
"""
        
        return Task(
            description=f"""Detect fraud/spam risk by analyzing BEHAVIORAL PATTERNS, not keywords.

QUERY:
{enhanced_query}
{validation_info}

FOCUS ON:
1. Image-query mismatch (if validation failed)
2. Suspicious patterns (generic complaints, no specific details)
3. Spam indicators (repeated phrases, promotional content)
4. Authenticity issues (vague location, no concrete evidence)

DO NOT:
- Search for "fraud" keywords in the text
- Flag legitimate complaints about fraud/scams as fraudulent
- Use retrieved data about fraud cases

Provide JSON response with:
- fraud_risk: Low | Medium | High
- spam_indicators: array of behavioral patterns found (not keywords)
- authenticity_confidence: High | Medium | Low
- verification_recommendations: array of strings""",
            agent=self.agents_manager.get_agent("fraud"),
            expected_output="JSON with fraud detection based on behavioral analysis",
        )

    def create_category_task(self, grievance_text: str, retrieved_data: Dict[str, Any]) -> Task:
        return Task(
            description=f"""Analyze this grievance and determine its category.

GRIEVANCE:
{grievance_text}

RETRIEVED DATA (summary JSON, may be truncated):
{retrieved_data}

Provide JSON response with:
- main_category: string
- sub_category: string
- confidence: High | Medium | Low
- reasoning: brief explanation""",
            agent=self.agents_manager.get_agent("category"),
            expected_output="JSON with category analysis",
        )

    def create_similar_cases_task(
        self, grievance_text: str, retrieved_data: Dict[str, Any]
    ) -> Task:
        return Task(
            description=f"""Find and analyze similar cases.

GRIEVANCE:
{grievance_text}

RETRIEVED DATA (summary JSON, may be truncated):
{retrieved_data}

Provide JSON response with:
- top_3_similar_cases: array of case summaries (each with id and short summary if possible)
- common_resolutions: array describing how similar cases were resolved
- patterns_identified: array of key patterns""",
            agent=self.agents_manager.get_agent("similar_cases"),
            expected_output="JSON with similar cases analysis",
        )

    def create_department_task(
        self, grievance_text: str, retrieved_data: Dict[str, Any]
    ) -> Task:
        return Task(
            description=f"""Determine appropriate department / authority.

GRIEVANCE:
{grievance_text}

RETRIEVED DATA (summary JSON, may be truncated):
{retrieved_data}

Provide JSON response with:
- recommended_department: string
- contact_information: string (generic, non-personal)
- jurisdiction: string""",
            agent=self.agents_manager.get_agent("department"),
            expected_output="JSON with department routing",
        )

    def create_policy_task(
        self, grievance_text: str, category_info: Dict[str, Any]
    ) -> Task:
        return Task(
            description=f"""Generate ONLY web search queries for policies/schemes.

GRIEVANCE:
{grievance_text}

CATEGORY_INFO:
{category_info}

DO NOT query any internal databases. Provide JSON response with:
- queries: array of 3-6 search query strings that a citizen/officer can use on the internet
- reasoning: short explanation""",
            agent=self.agents_manager.get_agent("policy"),
            expected_output="JSON with policy search queries",
        )

    def create_sentiment_task(self, grievance_text: str) -> Task:
        return Task(
            description=f"""Analyze sentiment and emotional tone.

GRIEVANCE:
{grievance_text}

Provide JSON response with:
- sentiment_score: number (1-10)
- urgency_level: High | Medium | Low
- emotional_tone: string
- key_emotional_indicators: array of phrases""",
            agent=self.agents_manager.get_agent("sentiment"),
            expected_output="JSON with sentiment analysis",
        )

    def create_priority_task(self, grievance_text: str) -> Task:
        return Task(
            description=f"""Assess priority level for resolution.

GRIEVANCE:
{grievance_text}

Provide JSON response with:
- priority_level: High | Medium | Low
- justification: string
- expected_resolution_time: string
- risk_assessment: string""",
            agent=self.agents_manager.get_agent("priority"),
            expected_output="JSON with priority assessment",
        )

