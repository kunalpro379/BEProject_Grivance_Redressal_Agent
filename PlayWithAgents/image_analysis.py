#!/usr/bin/env python3
"""
Image Analysis Agent using Google Gemini Pro Vision
Analyzes images and provides detailed descriptions using AI
"""

import os
import sys
import json
from pathlib import Path
import google.generativeai as genai
from PIL import Image
import base64
from io import BytesIO
api_key = ""
class ImageAnalysisAgent:
    def __init__(self, api_key=None):
        """
        Initialize the Image Analysis Agent
        
        Args:
            api_key (str): Google Gemini API key. If None, will try to get from environment
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("Gemini API key not provided. Set GEMINI_API_KEY environment variable or pass api_key parameter")
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def analyze_image(self, image_path, analysis_type="detailed"):
        """
        Analyze an image and return description
        
        Args:
            image_path (str): Path to the image file
            analysis_type (str): Type of analysis - "detailed", "brief", "environmental", "technical"
            
        Returns:
            dict: Analysis results with description and metadata
        """
        try:
            # Check if image exists
            if not os.path.exists(image_path):
                return {
                    "success": False,
                    "error": f"Image file not found: {image_path}",
                    "description": None
                }
            
            # Load and validate image
            try:
                image = Image.open(image_path)
                image.verify()  # Verify it's a valid image
                image = Image.open(image_path)  # Reopen after verification
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Invalid image file: {str(e)}",
                    "description": None
                }
            
            # Create analysis prompt based on type
            prompts = {
                "detailed": "Provide a comprehensive, detailed description of this image. Include all visible elements, colors, composition, lighting, and any notable features. Be specific about objects, people, settings, and overall scene.",
                
                "brief": "Give a concise, brief description of this image in 2-3 sentences. Focus on the main subject and key elements.",
                
                "environmental": "Analyze this image from an environmental perspective. Describe any environmental issues, pollution, waste, natural elements, or sustainability concerns visible in the image. Focus on ecological impact and environmental conditions.",
                
                "technical": "Provide a technical analysis of this image. Include details about composition, lighting conditions, color palette, image quality, and any technical aspects you can observe."
            }
            
            prompt = prompts.get(analysis_type, prompts["detailed"])
            
            # Generate content using Gemini
            response = self.model.generate_content([prompt, image])
            
            # Extract text from response
            description = response.text if hasattr(response, 'text') else str(response)
            
            # Get image metadata
            image_metadata = {
                "filename": os.path.basename(image_path),
                "size": image.size,
                "format": image.format,
                "mode": image.mode,
                "file_size": os.path.getsize(image_path)
            }
            
            return {
                "success": True,
                "description": description,
                "analysis_type": analysis_type,
                "image_metadata": image_metadata,
                "model_used": "gemini-1.5-flash"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}",
                "description": None
            }
    
    def analyze_multiple_types(self, image_path):
        """
        Perform multiple types of analysis on the same image
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            dict: Results from all analysis types
        """
        results = {}
        analysis_types = ["detailed", "brief", "environmental", "technical"]
        
        for analysis_type in analysis_types:
            print(f"Performing {analysis_type} analysis...")
            results[analysis_type] = self.analyze_image(image_path, analysis_type)
        
        return results
    
    def save_analysis(self, results, output_file="image_analysis_results.json"):
        """
        Save analysis results to a JSON file
        
        Args:
            results (dict): Analysis results
            output_file (str): Output file path
        """
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"Analysis results saved to: {output_file}")
        except Exception as e:
            print(f"Error saving results: {str(e)}")

def main():
    """
    Main function to run the image analysis agent
    """
    # Get the directory of this script
    script_dir = Path(__file__).parent
    image_file = script_dir / "garbage.jpeg"
    
    print("🖼️  Image Analysis Agent")
    print("=" * 50)
    
    # Use hardcoded API key
    api_key = "AIzaSyCz4aeYhhBKwic-M9LGwrxQa6kU48f5Q18"
    
    try:
        # Initialize the agent
        agent = ImageAnalysisAgent(api_key)
        
        # Check if image exists
        if not image_file.exists():
            print(f"❌ Image file not found: {image_file}")
            return
        
        print(f"📸 Analyzing image: {image_file.name}")
        print(f"📁 Full path: {image_file}")
        print()
        
        # Perform environmental analysis (most relevant for garbage.jpeg)
        print("🌍 Performing Environmental Analysis...")
        env_result = agent.analyze_image(str(image_file), "environmental")
        
        if env_result["success"]:
            print("✅ Analysis completed successfully!")
            print("\n" + "="*50)
            print("ENVIRONMENTAL ANALYSIS RESULTS")
            print("="*50)
            print(env_result["description"])
            print("\n" + "="*50)
            
            # Also perform detailed analysis
            print("\n🔍 Performing Detailed Analysis...")
            detailed_result = agent.analyze_image(str(image_file), "detailed")
            
            if detailed_result["success"]:
                print("✅ Detailed analysis completed!")
                print("\n" + "="*50)
                print("DETAILED ANALYSIS RESULTS")
                print("="*50)
                print(detailed_result["description"])
                print("\n" + "="*50)
            
            # Save results
            all_results = {
                "image_file": str(image_file),
                "environmental_analysis": env_result,
                "detailed_analysis": detailed_result,
                "timestamp": str(Path().cwd())
            }
            
            agent.save_analysis(all_results, "garbage_analysis_results.json")
            
        else:
            print(f"❌ Analysis failed: {env_result['error']}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Make sure you have set GEMINI_API_KEY environment variable")
        print("2. Install required packages: pip install google-generativeai Pillow")
        print("3. Check your internet connection")
        print("4. Verify your API key is valid")

if __name__ == "__main__":
    main()
