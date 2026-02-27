import re
import logging
from typing import Dict, Optional
from urllib.parse import urlparse
from crawler.pdf_processor import PDFProcessor

logger = logging.getLogger(__name__)

class ContentProcessor:
    @staticmethod
    def clean_markdown_content(markdown: str) -> str:
        """Remove URLs, navigation, footers and clean up markdown content - AGGRESSIVE CLEANING"""
        if not markdown:
            return ""
        
        lines = markdown.split('\n')
        cleaned_lines = []
        in_noise_section = False
        
        # AGGRESSIVE patterns to identify and SKIP entire sections
        noise_section_markers = [
            # Navigation and UI elements
            r'visitor counter',
            r'last update',
            r'main navigation',
            r'footer',
            r'header',
            r'menu',
            r'navigation',
            r'breadcrumb',
            
            # Legal/Policy sections
            r'copyright',
            r'privacy policy',
            r'terms & conditions',
            r'website policy',
            r'hyperlink policy',
            r'web information manager',
            r'disclaimer',
            r'cookie policy',
            
            # Common UI elements
            r'frequently visited',
            r'quick links',
            r'related links',
            r'useful links',
            r'external links',
            r'sign in',
            r'sign out',
            r'sign up',
            r'login',
            r'logout',
            r'register',
            r'search',
            r'subscribe',
            
            # Contact/Social sections
            r'contact us',
            r'follow us',
            r'connect with us',
            r'social media',
            r'share this',
            
            # Tables with contact info
            r'who\'s who',
            r'team directory',
            r'contact directory',
            r'email\s*id',
            r'phone\s*number',
            r'designation\s*\|',
            r'name\s*\|\s*designation',
            r'name\s*\|\s*email',
        ]
        
        # Patterns for individual lines to ALWAYS skip
        skip_line_patterns = [
            # Pure formatting/separators
            r'^\s*[\*\-\|=_#]+\s*$',  # Lines with only special chars
            r'^\s*\#+\s*$',  # Empty headers
            r'^\s*---+\s*$',  # Horizontal rules
            
            # Numbers (visitor counters, dates, etc.)
            r'^\s*\d{5,}\s*$',  # Long numbers (visitor counts)
            r'^\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*$',  # Dates
            
            # Links and URLs
            r'^\[.*\]\(.*\)$',  # Pure markdown links
            r'^https?://',  # URLs at start
            r'^www\.',  # URLs with www
            r'^\s*\[.*\]\s*$',  # Link text only
            
            # Navigation patterns
            r'^\s*\*\s*home\s*$',
            r'^\s*\*\s*about\s*$',
            r'^\s*\*\s*contact\s*$',
            r'home\s*\|\s*about',  # Pipe-separated nav
            r'^\s*\|\s*\w+\s*\|\s*\w+\s*\|',  # Table rows
            
            # Common UI text
            r'^\s*welcome\s+\w+\s*\(sign out\)',
            r'^\s*anonymous\s*\(sign',
            r'^\s*click here',
            r'^\s*read more',
            r'^\s*view all',
            r'^\s*show more',
            
            # Email/contact patterns
            r'\w+\[at\]\w+\[dot\]',  # Obfuscated emails
            r'\w+@\w+\.\w+',  # Regular emails
        ]
        
        # Content quality indicators - lines with these are GOOD
        content_indicators = [
            r'\b(policy|program|project|initiative|scheme|report|study|research|analysis|development|implementation)\b',
            r'\b(objective|goal|vision|mission|strategy|approach|framework|guideline)\b',
            r'\b(government|ministry|department|committee|council|commission)\b',
            r'\b(economic|social|environmental|sustainable|climate|energy|agriculture)\b',
        ]
        
        for line in lines:
            original_line = line
            line_lower = line.lower().strip()
            line_stripped = line.strip()
            
            # Skip empty lines
            if not line_stripped:
                continue
            
            # Check if this line marks start of noise section
            if any(re.search(pattern, line_lower) for pattern in noise_section_markers):
                in_noise_section = True
                continue
            
            # Skip if we're in a noise section (until we find real content)
            if in_noise_section:
                # Check if this looks like real content (long, meaningful text)
                has_content_indicator = any(re.search(pattern, line_lower) for pattern in content_indicators)
                if len(line_stripped) > 80 and has_content_indicator:
                    in_noise_section = False  # Exit noise section
                else:
                    continue  # Still in noise section, skip
            
            # Skip lines matching skip patterns
            if any(re.search(pattern, line_stripped) for pattern in skip_line_patterns):
                continue
            
            # Skip very short lines (likely navigation/UI)
            if len(line_stripped) < 15:
                continue
            
            # Skip lines that are mostly special characters
            alpha_chars = sum(1 for c in line_stripped if c.isalpha())
            special_chars = sum(1 for c in line_stripped if c in '|*-_#[](){}=+~`')
            if len(line_stripped) > 0:
                special_ratio = special_chars / len(line_stripped)
                alpha_ratio = alpha_chars / len(line_stripped)
                if special_ratio > 0.4 or alpha_ratio < 0.3:
                    continue
            
            # Clean the line
            cleaned = line_stripped
            
            # Remove markdown links but keep text: [text](url) -> text
            cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)
            
            # Remove standalone URLs
            cleaned = re.sub(r'https?://[^\s<>"{}|\\^`\[\]]+', '', cleaned)
            cleaned = re.sub(r'www\.[^\s<>"{}|\\^`\[\]]+', '', cleaned)
            
            # Remove email addresses
            cleaned = re.sub(r'\S+@\S+', '', cleaned)
            cleaned = re.sub(r'\w+\[at\]\w+\[dot\]\w+', '', cleaned)
            
            # Remove markdown formatting
            cleaned = re.sub(r'[\*_]{1,3}([^\*_]+)[\*_]{1,3}', r'\1', cleaned)  # Bold/italic
            cleaned = re.sub(r'^\s*[\*\-\+]\s+', '', cleaned)  # List markers
            cleaned = re.sub(r'^\s*\d+\.\s+', '', cleaned)  # Numbered lists
            cleaned = re.sub(r'^\s*\#+\s*', '', cleaned)  # Headers
            
            # Remove multiple spaces
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            
            # Only keep lines with substantial content
            if len(cleaned) >= 20:  # Minimum 20 chars for real content
                # Additional quality check - must have some alphabetic content
                if sum(1 for c in cleaned if c.isalpha()) >= 15:
                    cleaned_lines.append(cleaned)
        
        # Remove duplicate consecutive lines
        final_lines = []
        prev_line = None
        for line in cleaned_lines:
            if line != prev_line:
                final_lines.append(line)
                prev_line = line
        
        return '\n'.join(final_lines)
    
    @staticmethod
    def extract_content(result) -> Dict[str, str]:
        """Extract title and content from crawl result"""
        title = result.metadata.get('title', 'Untitled') if result.metadata else 'Untitled'
        
        content = ""
        if hasattr(result, 'markdown') and result.markdown:
            content = ContentProcessor.clean_markdown_content(result.markdown)
        else:
            content = "*No content extracted*"
        
        return {
            'title': title,
            'content': content
        }
    
    @staticmethod
    def generate_blob_path(url: str, domain: str) -> str:
        """Generate blob storage path from URL"""
        parsed_url = urlparse(url)
        path = parsed_url.path.strip('/')
        
        if not path:
            filename = 'index.txt'
        else:
            # Clean path for filename
            filename = path.replace('/', '_') + '.txt'
            if len(filename) > 100:
                filename = filename[:100] + '.txt'
        
        return f"crawled-content/{domain}/{filename}"
    
    @staticmethod
    def get_domain_name(url: str) -> str:
        """Extract clean domain name from URL"""
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.replace('www.', '')
        return domain
    
    @staticmethod
    def format_markdown_file(title: str, content: str) -> str:
        """Format content as text file"""
        return f"{title}\n{'=' * len(title)}\n\n{content}"
    
    @staticmethod
    def is_pdf_url(url: str) -> bool:
        """Check if URL is a PDF"""
        return PDFProcessor.is_pdf_url(url)
    
    @staticmethod
    def extract_pdf_content(url: str) -> Optional[Dict[str, str]]:
        """Extract text from PDF URL"""
        text = PDFProcessor.extract_text_from_pdf(url)
        if text:
            # Extract title from URL
            parsed = urlparse(url)
            filename = parsed.path.split('/')[-1]
            title = filename.replace('.pdf', '').replace('_', ' ').replace('-', ' ').title()
            
            return {
                'title': title,
                'content': text,
                'is_pdf': True
            }
        return None
