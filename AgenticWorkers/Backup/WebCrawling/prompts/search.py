def generate_search_variations(topic, category="GENERAL"):
    """Generate search query variations for a topic based on category"""
    
    base_prompts = [
        f"{topic}",
        f"{topic} India",
        f"{topic} government policy",
        f"{topic} official data",
    ]
    
    if category == "MUNICIPAL":
        specific_prompts = [
            f"{topic} municipal corporation",
            f"{topic} civic body report",
            f"{topic} urban development",
            f"{topic} smart city mission",
        ]
    elif category == "LEGAL":
        specific_prompts = [
            f"{topic} legal framework India",
            f"{topic} court judgment",
            f"{topic} legislation",
            f"{topic} act rules",
        ]
    elif category == "INFRASTRUCTURE":
        specific_prompts = [
            f"{topic} infrastructure development",
            f"{topic} construction guidelines",
            f"{topic} project report",
        ]
    else:
        specific_prompts = [
            f"{topic} government scheme",
            f"{topic} ministry report",
            f"{topic} policy document",
        ]
    
    document_prompts = [
        f"{topic} PDF",
        f"{topic} filetype:pdf",
        f"{topic} annual report",
        f"{topic} whitepaper",
        f"{topic} official document",
        f"{topic} statistics",
        f"{topic} data",
    ]
    
    return base_prompts + specific_prompts + document_prompts