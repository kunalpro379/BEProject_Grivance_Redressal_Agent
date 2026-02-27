"""
Result Validator - Validates Tavily search results before pushing to queue
"""
from typing import List, Dict, Any
from datetime import datetime
import re

class ResultValidator:
    """Validates search results based on quality criteria"""
    
    def __init__(self, min_score: float = 0.5, min_content_length: int = 100):
        self.min_score = min_score
        self.min_content_length = min_content_length
    
    def validate_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a single search result
        
        Returns:
            Dict with 'valid' (bool) and 'reason' (str) keys
        """
        # Check if URL exists
        url = result.get('url', '')
        if not url:
            return {'valid': False, 'reason': 'Missing URL'}
        
        # Check if URL is valid format
        if not self._is_valid_url(url):
            return {'valid': False, 'reason': 'Invalid URL format'}
        
        # Check relevance score
        score = result.get('score', 0)
        if score < self.min_score:
            return {'valid': False, 'reason': f'Low relevance score: {score}'}
        
        # Check content length
        content = result.get('content', '')
        if len(content) < self.min_content_length:
            return {'valid': False, 'reason': f'Content too short: {len(content)} chars'}
        
        # Check if title exists
        title = result.get('title', '')
        if not title or len(title) < 10:
            return {'valid': False, 'reason': 'Missing or invalid title'}
        
        # Check for government domain (for tracking only, not scoring)
        is_gov_domain = self._is_government_domain(url)
        
        return {
            'valid': True,
            'reason': 'Passed validation',
            'is_gov_domain': is_gov_domain,
            'quality_score': self._calculate_quality_score(result)
        }
    
    def validate_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate multiple search results
        
        Returns:
            Dict with 'valid_results', 'invalid_results', and 'stats'
        """
        valid_results = []
        invalid_results = []
        
        for result in results:
            validation = self.validate_result(result)
            
            if validation['valid']:
                # Add validation metadata to result
                result['validation'] = {
                    'validated_at': datetime.now().isoformat(),
                    'is_gov_domain': validation.get('is_gov_domain', False),
                    'quality_score': validation.get('quality_score', 0)
                }
                valid_results.append(result)
            else:
                invalid_results.append({
                    'result': result,
                    'reason': validation['reason']
                })
        
        stats = {
            'total': len(results),
            'valid': len(valid_results),
            'invalid': len(invalid_results),
            'validation_rate': len(valid_results) / len(results) if results else 0
        }
        
        return {
            'valid_results': valid_results,
            'invalid_results': invalid_results,
            'stats': stats
        }
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid format"""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or IP
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        return bool(url_pattern.match(url))
    
    def _is_government_domain(self, url: str) -> bool:
        """Check if URL is from government domain"""
        gov_domains = [
            'gov.in', 'india.gov.in', 'pib.gov.in', 'niti.gov.in',
            'nic.in', 'mygov.in', 'digitalindia.gov.in'
        ]
        
        url_lower = url.lower()
        return any(domain in url_lower for domain in gov_domains)
    
    def _calculate_quality_score(self, result: Dict[str, Any]) -> float:
        """
        Calculate quality score for a result (0-1)
        
        Factors (focused on relevancy and data quality):
        - Relevance score (50%) - Most important
        - Content quality (30%) - Length and substance
        - Title quality (10%) - Descriptive title
        - Has published date (10%) - Freshness indicator
        """
        score = 0.0
        
        # Relevance score (50%) - PRIMARY FACTOR
        relevance = result.get('score', 0)
        score += relevance * 0.5
        
        # Content quality (30%) - Based on length and depth
        content = result.get('content', '')
        content_length = len(content)
        
        if content_length > 500:
            score += 0.3  # Comprehensive content
        elif content_length > 300:
            score += 0.25  # Good content
        elif content_length > 200:
            score += 0.2  # Adequate content
        elif content_length > 100:
            score += 0.1  # Minimal content
        
        # Title quality (10%) - Descriptive and informative
        title = result.get('title', '')
        if len(title) > 50:
            score += 0.1  # Very descriptive
        elif len(title) > 30:
            score += 0.08  # Good title
        elif len(title) > 15:
            score += 0.05  # Basic title
        
        # Has published date (10%) - Indicates freshness
        if result.get('published_date'):
            score += 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def filter_by_quality(self, results: List[Dict[str, Any]], 
                         min_quality: float = 0.6) -> List[Dict[str, Any]]:
        """
        Filter results by minimum quality score
        
        Args:
            results: List of validated results
            min_quality: Minimum quality score (0-1)
        
        Returns:
            Filtered list of high-quality results
        """
        filtered = []
        
        for result in results:
            validation = result.get('validation', {})
            quality_score = validation.get('quality_score', 0)
            
            if quality_score >= min_quality:
                filtered.append(result)
        
        return filtered
    
    def prioritize_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sort results by quality score (highest first)
        """
        return sorted(
            results,
            key=lambda x: x.get('validation', {}).get('quality_score', 0),
            reverse=True
        )
