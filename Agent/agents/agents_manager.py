"""
Agents Manager for managing all specialized agents
"""

from crewai import Agent
from typing import List


class AgentsManager:
    """Manages all specialized agents"""

    def __init__(self, llm):
        self.llm = llm
        self.agents = {}
        self._setup_agents()

    def _setup_agents(self):
        """Setup all specialized agents"""

        # Database Router Agent
        self.agents['db_router'] = Agent(
            role='Database Routing Specialist',
            goal='Analyze grievance content and determine which databases are most relevant',
            backstory="""You are an expert in understanding grievance patterns and database content.
            You can analyze the nature of complaints and match them to the most appropriate databases.""",
            llm=self.llm,
            verbose=True
        )

        # Query Type Classification Agent
        self.agents['query_type'] = Agent(
            role='Query Type Classification Specialist',
            goal='Classify the grievance type as Complaint, Suggestion, Query, Feedback, Follow-up, or Appeal',
            backstory="""You are an expert in classifying public grievances and queries.
            You can accurately determine the type based on language, tone, and content.""",
            llm=self.llm,
            verbose=True
        )

        # Location Detection Agent
        self.agents['location'] = Agent(
            role='Location Detection Specialist',
            goal='Extract and normalize location information including pincode, district, state',
            backstory="""You specialize in Indian geography and can extract location information
            from text, normalizing it to standard formats with pincodes and district names.""",
            llm=self.llm,
            verbose=True
        )

        # Emotion Detection Agent
        self.agents['emotion'] = Agent(
            role='Emotion Analysis Specialist',
            goal='Detect emotional tone including Angry, Frustrated, Sad, Confused, Urgent',
            backstory="""You specialize in understanding emotional content and can
            accurately detect emotional states from text.""",
            llm=self.llm,
            verbose=True
        )

        # Severity Classification Agent
        self.agents['severity'] = Agent(
            role='Severity Classification Specialist',
            goal='Classify severity and criticality of the grievance',
            backstory="""You assess the severity and criticality of grievances
            based on impact, urgency, and potential consequences.""",
            llm=self.llm,
            verbose=True
        )

        # Pattern Detection Agent
        self.agents['pattern'] = Agent(
            role='Pattern Detection Specialist',
            goal='Detect repeated patterns, recurring issues, and potential spam',
            backstory="""You specialize in identifying patterns across grievances and
            can detect repeated issues or potential spam campaigns.""",
            llm=self.llm,
            verbose=True
        )

        # Fraud Detection Agent
        self.agents['fraud'] = Agent(
            role='Fraud Detection Specialist',
            goal='Identify potential fraud, spam patterns, and malicious content',
            backstory="""You are an expert in detecting fraudulent patterns, spam,
            and malicious content in public grievances.""",
            llm=self.llm,
            verbose=True
        )

        # Category Analysis Agent
        self.agents['category'] = Agent(
            role='Grievance Category Specialist',
            goal='Analyze grievance content and determine appropriate category and sub-category',
            backstory="""You are an expert in classifying grievances into appropriate categories
            like sanitation, infrastructure, financial fraud, environmental issues, etc.""",
            llm=self.llm,
            verbose=True
        )

        # Similar Cases Agent
        self.agents['similar_cases'] = Agent(
            role='Similar Cases Analyst',
            goal='Find and analyze similar historical grievances and their resolutions',
            backstory="""You specialize in finding patterns across similar grievances and
            understanding how similar issues were resolved in the past.""",
            llm=self.llm,
            verbose=True
        )

        # Department Routing Agent
        self.agents['department'] = Agent(
            role='Department Routing Specialist',
            goal='Identify which government department or authority should handle this grievance',
            backstory="""You have extensive knowledge of government departments and their responsibilities.
            You can route grievances to the appropriate authorities based on the issue type.""",
            llm=self.llm,
            verbose=True
        )

        # Policy Recommendation Agent
        self.agents['policy'] = Agent(
            role='Government Policy Expert',
            goal='Recommend relevant government schemes or policies',
            backstory="""You are knowledgeable about various government schemes and policies
            that can help resolve public grievances.""",
            llm=self.llm,
            verbose=True
        )

        # Sentiment Analysis Agent
        self.agents['sentiment'] = Agent(
            role='Sentiment Analysis Specialist',
            goal='Analyze the emotional tone and urgency of the grievance',
            backstory="""You specialize in understanding the emotional context of grievances
            and can assess urgency levels based on language and content.""",
            llm=self.llm,
            verbose=True
        )

        # Priority Assessment Agent
        self.agents['priority'] = Agent(
            role='Priority Assessment Specialist',
            goal='Determine the priority level of the grievance for resolution',
            backstory="""You assess grievances based on multiple factors including impact,
            urgency, number of people affected, and potential consequences.""",
            llm=self.llm,
            verbose=True
        )

        # Manager Agent
        self.agents['manager'] = Agent(
            role='Grievance Analysis Manager',
            goal='Coordinate all analyses and produce comprehensive final report',
            backstory="""You are an experienced manager who coordinates multiple specialists
            to produce comprehensive grievance analysis reports with actionable insights.""",
            llm=self.llm,
            verbose=True
        )

    def get_agent(self, agent_name: str) -> Agent:
        """Get specific agent by name"""
        return self.agents.get(agent_name)

    def get_all_agents(self) -> List[Agent]:
        """Get all agents"""
        return list(self.agents.values())
