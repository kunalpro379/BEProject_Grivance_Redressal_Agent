import os
import json
import base64
from typing import Dict, Any, Optional, Union
from pathlib import Path
import google.generativeai as genai
import groq
from PIL import Image
import fitz  # PyMuPDF for PDF processing
import docx  # python-docx for Word documents
import pytesseract
from io import BytesIO
import re

class ValidationAgent:
    """
    Validation Agent for processing user queries with proof (documents/photos)
    and merging all information for downstream processing.
    Uses Gemini for image analysis and Groq for text processing.
    """
    
    def __init__(self, gemini_api_key: str, groq_api_key: str):
        """Initialize the Validation Agent with API keys."""
        self.gemini_api_key = gemini_api_key
        self.groq_api_key = groq_api_key
        self.setup_apis()
        self.setup_bad_words()
        
    def setup_bad_words(self):
        """Setup list of bad words that should trigger escalation."""
        self.bad_words = [
            'abuse', 'abusive', 'attack', 'beat', 'blood', 'bomb', 'corrupt', 'corruption',
            'damn', 'death', 'die', 'drug', 'drunk', 'fuck', 'hate', 'kill', 'murder',
            'rape', 'sex', 'sexual', 'shit', 'slut', 'terror', 'terrorist', 'threat',
            'violence', 'violent', 'weapon', 'gun', 'knife', 'bomb', 'explosive',
            'suicide', 'self-harm', 'harm', 'dangerous', 'illegal', 'criminal'
        ]
        
    def setup_apis(self):
        """Setup both Gemini and Groq API configurations."""
        try:
            # Setup Gemini for image processing - using Flash model
            genai.configure(api_key=self.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Setup Groq for text processing
            self.groq_client = groq.Groq(api_key=self.groq_api_key)
            self.groq_model = "llama3-8b-8192"  # Using Llama3 model via Groq
            
        except Exception as e:
            print(f"Error setting up APIs: {e}")
            self.gemini_model = None
            self.groq_client = None
    
    def check_bad_words(self, text: str) -> Dict[str, Any]:
        """
        Check if text contains bad words that require escalation.
        
        Args:
            text (str): Text to check for bad words
            
        Returns:
            Dict containing bad word detection results
        """
        found_bad_words = []
        text_lower = text.lower()
        
        for word in self.bad_words:
            if word in text_lower:
                found_bad_words.append(word)
        
        return {
            "has_bad_words": len(found_bad_words) > 0,
            "bad_words_found": found_bad_words,
            "requires_escalation": len(found_bad_words) > 0
        }
    
    def check_image_query_relevance(self, user_query: str, image_analysis: str) -> Dict[str, Any]:
        """
        Check if the image is relevant to the user query using Groq.
        
        Args:
            user_query (str): User's grievance query
            image_analysis (str): Analysis of the image
            
        Returns:
            Dict containing relevance check results
        """
        try:
            if not self.groq_client:
                return {
                    "is_relevant": True,
                    "relevance_score": 0.8,
                    "reasoning": "Groq API not available, assuming relevance",
                    "confidence": "low"
                }
            
            relevance_prompt = f"""
            Analyze if the following image description is relevant to the user's grievance query.
            
            User Query: "{user_query}"
            Image Description: "{image_analysis}"
            
            Determine if the image provides supporting evidence for the grievance. 
            Return only a JSON response with these fields:
            - is_relevant: boolean
            - relevance_score: float (0.0 to 1.0)
            - reasoning: string explaining why relevant or not
            - confidence: "high", "medium", or "low"
            """
            
            response = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that analyzes image-query relevance for grievance systems. Always respond with valid JSON."},
                    {"role": "user", "content": relevance_prompt}
                ],
                max_tokens=200,
                temperature=0.1
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Try to parse JSON response
            try:
                relevance_result = json.loads(response_text)
                return relevance_result
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "is_relevant": True,
                    "relevance_score": 0.7,
                    "reasoning": "Could not parse relevance analysis, assuming moderate relevance",
                    "confidence": "medium"
                }
                
        except Exception as e:
            return {
                "is_relevant": True,
                "relevance_score": 0.6,
                "reasoning": f"Error in relevance check: {str(e)}",
                "confidence": "low"
            }
    
    def validate_query(self, user_query: str, proof_files: list = None) -> Dict[str, Any]:
        """
        Main validation method that processes user query and proof files.
        
        Args:
            user_query (str): User's grievance query
            proof_files (list): List of proof file paths (images, documents)
            
        Returns:
            Dict containing validation result and merged information
        """
        try:
            # Initialize result structure
            result = {
                "is_valid": False,
                "summary_paragraph": "",
                "validation_message": "",
                "proof_analysis": [],
                "bad_word_check": {},
                "image_relevance": {},
                "requires_escalation": False,
                "errors": []
            }
            
            # Check for bad words first
            bad_word_result = self.check_bad_words(user_query)
            result["bad_word_check"] = bad_word_result
            result["requires_escalation"] = bad_word_result["requires_escalation"]
            
            if bad_word_result["requires_escalation"]:
                result["validation_message"] = f"Query contains inappropriate language and requires escalation. Bad words found: {', '.join(bad_word_result['bad_words_found'])}"
                result["errors"].append("Bad words detected - escalation required")
                return result
            
            # Validate user query
            if not user_query or len(user_query.strip()) < 10:
                result["validation_message"] = "Query too short. Please provide detailed description."
                result["errors"].append("Insufficient query length")
                return result
            
            # Process proof files if provided
            proof_analysis = []
            image_analysis = None
            pdf_summary = None
            
            if proof_files:
                for file_path in proof_files:
                    file_analysis = self.process_proof_file(file_path)
                    if file_analysis:
                        proof_analysis.append(file_analysis)
                        
                        # Extract image analysis for relevance check
                        if file_analysis["file_type"] in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                            image_analysis = file_analysis["analysis"]
                        
                        # Extract PDF summary
                        if file_analysis["file_type"] == '.pdf':
                            pdf_summary = file_analysis["analysis"]
            
            # Check image relevance if image is present
            if image_analysis:
                relevance_result = self.check_image_query_relevance(user_query, image_analysis)
                result["image_relevance"] = relevance_result
                
                if not relevance_result["is_relevant"]:
                    result["validation_message"] = f"Image appears unrelated to the grievance query. Relevance score: {relevance_result['relevance_score']}"
                    result["errors"].append("Image-query mismatch")
                    return result
            
            # Generate comprehensive summary paragraph
            summary_paragraph = self.generate_summary_paragraph(user_query, proof_analysis, pdf_summary, image_analysis)
            
            # Final validation
            if len(summary_paragraph.strip()) > 20:
                result["is_valid"] = True
                result["summary_paragraph"] = summary_paragraph
                result["proof_analysis"] = proof_analysis
                result["validation_message"] = "Query validated successfully with proof analysis."
            else:
                result["validation_message"] = "Insufficient information after processing."
                result["errors"].append("Insufficient merged data")
            
            return result
            
        except Exception as e:
            result["errors"].append(f"Validation error: {str(e)}")
            result["validation_message"] = f"Error during validation: {str(e)}"
            return result
    
    def process_proof_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Process individual proof file (image or document).
        
        Args:
            file_path (str): Path to the proof file
            
        Returns:
            Dict containing file analysis or None if processing fails
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                return None
            
            file_info = {
                "file_name": file_path.name,
                "file_type": file_path.suffix.lower(),
                "file_size": file_path.stat().st_size,
                "content": "",
                "analysis": ""
            }
            
            # Process based on file type
            if file_info["file_type"] in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                file_info.update(self.process_image(file_path))
            elif file_info["file_type"] == '.pdf':
                file_info.update(self.process_pdf(file_path))
            elif file_info["file_type"] in ['.docx', '.doc']:
                file_info.update(self.process_word_document(file_path))
            elif file_info["file_type"] in ['.txt', '.csv']:
                file_info.update(self.process_text_file(file_path))
            else:
                file_info["analysis"] = f"Unsupported file type: {file_info['file_type']}"
            
            return file_info
            
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
            return None
    
    def process_image(self, image_path: Path) -> Dict[str, str]:
        """Process image files using Gemini Flash API."""
        try:
            if not self.gemini_model:
                return {"content": "Gemini API not available", "analysis": "Image analysis failed"}
            
            # Open and process image
            image = Image.open(image_path)
            
            # Convert image to base64 for Flash model
            buffered = BytesIO()
            image.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            # Generate description using Gemini Flash
            prompt = "Describe this image in detail. Focus on any text, objects, damage, or relevant details that might be related to a grievance or complaint."
            
            response = self.gemini_model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": img_str}
            ])
            
            analysis = response.text if response.text else "No description generated"
            
            return {
                "content": f"Image file: {image_path.name}",
                "analysis": analysis
            }
            
        except Exception as e:
            return {"content": f"Image file: {image_path.name}", "analysis": f"Error analyzing image: {str(e)}"}
    
    def process_pdf(self, pdf_path: Path) -> Dict[str, str]:
        """Process PDF documents and extract text using Groq."""
        try:
            doc = fitz.open(pdf_path)
            text_content = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_content += page.get_text()
            
            doc.close()
            
            # Generate summary using Groq if available
            if self.groq_client and len(text_content) > 100:
                summary_prompt = f"Summarize the following document content in 2-3 sentences, focusing on key points relevant to a grievance or complaint:\n\n{text_content[:1000]}"
                summary = self.process_text_with_groq(summary_prompt)
            else:
                summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
            
            return {
                "content": f"PDF document: {pdf_path.name}",
                "analysis": summary
            }
            
        except Exception as e:
            return {"content": f"PDF document: {pdf_path.name}", "analysis": f"Error processing PDF: {str(e)}"}
    
    def process_word_document(self, doc_path: Path) -> Dict[str, str]:
        """Process Word documents and extract text using Groq."""
        try:
            doc = docx.Document(doc_path)
            text_content = ""
            
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"
            
            # Generate summary using Groq if available
            if self.groq_client and len(text_content) > 100:
                summary_prompt = f"Summarize the following document content in 2-3 sentences, focusing on key points relevant to a grievance or complaint:\n\n{text_content[:1000]}"
                summary = self.process_text_with_groq(summary_prompt)
            else:
                summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
            
            return {
                "content": f"Word document: {doc_path.name}",
                "analysis": summary
            }
            
        except Exception as e:
            return {"content": f"Word document: {doc_path.name}", "analysis": f"Error processing Word document: {str(e)}"}
    
    def process_text_file(self, text_path: Path) -> Dict[str, str]:
        """Process text files and extract content using Groq."""
        try:
            with open(text_path, 'r', encoding='utf-8') as file:
                text_content = file.read()
            
            # Generate summary using Groq if available
            if self.groq_client and len(text_content) > 100:
                summary_prompt = f"Summarize the following text content in 2-3 sentences, focusing on key points relevant to a grievance or complaint:\n\n{text_content[:1000]}"
                summary = self.process_text_with_groq(summary_prompt)
            else:
                summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
            
            return {
                "content": f"Text file: {text_path.name}",
                "analysis": summary
            }
            
        except Exception as e:
            return {"content": f"Text file: {text_path.name}", "analysis": f"Error processing text file: {str(e)}"}
    
    def process_text_with_groq(self, prompt: str) -> str:
        """Process text using Groq API."""
        try:
            if not self.groq_client:
                return "Groq API not available"
            
            response = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes documents for grievance redressal systems."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"Error processing with Groq: {str(e)}"
    
    def generate_summary_paragraph(self, user_query: str, proof_analysis: list, pdf_summary: str = None, image_analysis: str = None) -> str:
        """
        Generate a comprehensive summary paragraph combining all information.
        
        Args:
            user_query (str): Original user query
            proof_analysis (list): List of proof file analysis results
            pdf_summary (str): Summary of PDF content if present
            image_analysis (str): Analysis of image if present
            
        Returns:
            str: Comprehensive summary paragraph
        """
        summary_parts = []
        
        # Start with user query
        summary_parts.append(f"The user has submitted a grievance stating: '{user_query}'")
        
        # Add PDF summary if present
        if pdf_summary:
            summary_parts.append(f"Supporting documentation includes a PDF with the following content: {pdf_summary}")
        
        # Add image description if present
        if image_analysis:
            summary_parts.append(f"Additionally, photographic evidence has been provided showing: {image_analysis}")
        
        # Add other proof files if any
        other_files = [p for p in proof_analysis if p["file_type"] not in ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff']]
        if other_files:
            other_files_desc = ", ".join([f"{f['file_name']} ({f['file_type']})" for f in other_files])
            summary_parts.append(f"Other supporting documents include: {other_files_desc}")
        
        # Combine all parts into a coherent paragraph
        summary = " ".join(summary_parts) + "."
        
        return summary
    
    def get_validation_status(self, result: Dict[str, Any]) -> str:
        """Get human-readable validation status."""
        if result["is_valid"]:
            return "✅ VALIDATED"
        else:
            return "❌ REJECTED"
    
    def log_validation_result(self, result: Dict[str, Any], output_file: str = None):
        """Log validation results to file or console."""
        log_entry = {
            "timestamp": str(Path().cwd()),
            "validation_status": self.get_validation_status(result),
            "validation_message": result["validation_message"],
            "proof_files_count": len(result.get("proof_analysis", [])),
            "summary_length": len(result.get("summary_paragraph", "")),
            "requires_escalation": result.get("requires_escalation", False),
            "bad_words_found": result.get("bad_word_check", {}).get("bad_words_found", []),
            "image_relevance_score": result.get("image_relevance", {}).get("relevance_score", "N/A"),
            "errors": result.get("errors", [])
        }
        
        if output_file:
            try:
                with open(output_file, 'a') as f:
                    f.write(json.dumps(log_entry) + '\n')
            except Exception as e:
                print(f"Error writing to log file: {e}")
        
        print(f"Validation Result: {log_entry['validation_status']}")
        print(f"Message: {log_entry['validation_message']}")
        print(f"Proof Files: {log_entry['proof_files_count']}")
        print(f"Summary Length: {log_entry['summary_length']}")
        print(f"Requires Escalation: {log_entry['requires_escalation']}")
        if log_entry['bad_words_found']:
            print(f"Bad Words Found: {log_entry['bad_words_found']}")
        if log_entry['image_relevance_score'] != "N/A":
            print(f"Image Relevance Score: {log_entry['image_relevance_score']}")
        if log_entry['errors']:
            print(f"Errors: {log_entry['errors']}")
        
        # Print the summary paragraph if available
        if result.get("summary_paragraph"):
            print(f"\nSummary Paragraph:\n{result['summary_paragraph']}")


# Example usage and testing
if __name__ == "__main__":
    gemini_key = ""
    groq_key = ""
    
    agent = ValidationAgent(gemini_key, groq_key)
    
    print("=== Testing Normal Query ===")
    test_query = "Open Garbage on the river bank is a big problem, kindly clear it."
    
    test_files = ["Garbage.jpeg"]
    
    result = agent.validate_query(test_query, test_files)
    agent.log_validation_result(result)
    
    print("\n" + "="*50 + "\n")
    
    print("=== Testing Bad Words Detection ===")
    bad_query = "This is a serious problem with corruption and abuse of power."
    result2 = agent.validate_query(bad_query, test_files)
    agent.log_validation_result(result2)
