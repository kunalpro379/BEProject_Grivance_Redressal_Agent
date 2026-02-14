def get_analysis_prompt(user_query):
    """Generate prompt for query analysis"""
    return f"""
    Analyze this Indian government grievance query and break it into 10 core search topics.
    User Query: {user_query}

    Return only the topics as a numbered list, one per line.
    Focus on:
    - Government departments and ministries
    - Related policies and schemes
    - Legal frameworks and regulations
    - Statistical data and reports
    - Past similar cases or initiatives
    
    Example format:
    1. Topic one
    2. Topic two
    ...
    """

def get_validation_prompt(source, original_query):
    """Generate prompt for source validation"""
    return f"""
    Analyze if this source is relevant to the query: "{original_query}"

    Source Title: {source['title']}
    Source Snippet: {source['snippet']}
    Source URL: {source['url']}

    Answer ONLY with "RELEVANT" or "IRRELEVANT" based on whether this source contains useful information about the query topic.
    Consider it RELEVANT if it contains:
    - Government data, reports, or official statistics
    - Policy documents or guidelines
    - Legal frameworks or regulations
    - Official announcements or initiatives
    
    Consider it IRRELEVANT if it's:
    - Completely unrelated to the query
    - Spam or advertising
    - Doesn't contain substantive government information
    """

def get_query_classification_prompt(user_query):
    """Classify the type of grievance"""
    return f"""
    Classify this Indian government grievance query into ONE category:
    
    Query: {user_query}
    
    Categories:
    - MUNICIPAL (water, drainage, sanitation, roads, waste)
    - LEGAL (court cases, rights, regulations)
    - ADMINISTRATIVE (bureaucracy, documentation, complaints)
    - INFRASTRUCTURE (construction, development, planning)
    - SOCIAL (welfare, schemes, benefits)
    - OTHER
    
    Answer with ONLY the category name in UPPERCASE.
    """