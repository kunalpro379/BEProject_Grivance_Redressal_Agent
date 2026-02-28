"""Prompts for knowledge extraction from documents"""

SYSTEM_PROMPT = """You convert unstructured text into structured JSON knowledge for a government grievance redressal system.
You extract CLEAN, MEANINGFUL, DASHBOARD-READY information."""

EXTRACTION_PROMPT = """Convert the given text into CLEAN, MEANINGFUL, DASHBOARD-READY JSON.

CRITICAL RULES:
1. Use only meaningful keys like:
   - department: Department name and info
   - projects: All missions, schemes, initiatives
   - officials: Officers, engineers, staff
   - services: Public services offered
   - schemes: Government schemes
   - locations: Offices, zones, areas
   - contacts: Phone, email, address
   - programs: Programs and activities
   - policies: Rules, guidelines, regulations
   - resources: Resources available
   - grievance_types: Types of grievances handled

2. REMOVE useless data like:
   - Random numbers without context
   - Serial numbers
   - IDs without meaning
   - Duplicate entries
   - Empty fields

3. DO NOT create keys like:
   - numbers, codes, ids, indexes, sr_no

4. Always group into logical categories:
   - projects → all missions, schemes
   - officials → officers, engineers
   - services → public services
   - department → department info

5. Make dashboard-friendly structure
6. Return ONLY valid JSON

TEXT:
{text}
"""
