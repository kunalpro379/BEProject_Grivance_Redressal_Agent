"""
Location Extraction Tool
Extracts address, landmarks, and geographic coordinates from images.
Includes GPS/EXIF data extraction.
"""
from typing import Dict, Any, Optional
import io
import re
import json
import requests
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from LLMs.gemini_llm import GeminiClient


class LocationExtractor:
    def __init__(self) -> None:
        self.client = GeminiClient()

    def extract_gps_from_exif(self, image_path_or_url: str) -> Optional[Dict[str, float]]:
        """
        Extract GPS coordinates from image EXIF data.
        
        Returns:
            {"latitude": float, "longitude": float} or None
        """
        try:
            # Load image
            if image_path_or_url.startswith("http"):
                resp = requests.get(image_path_or_url, timeout=30)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content))
            else:
                image = Image.open(image_path_or_url)
            
            # Get EXIF data
            exif_data = image._getexif()
            if not exif_data:
                return None
            
            # Find GPS info
            gps_info = {}
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    for gps_tag_id in value:
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_info[gps_tag] = value[gps_tag_id]
            
            if not gps_info:
                return None
            
            # Convert GPS data to decimal degrees
            def convert_to_degrees(value):
                """Convert GPS coordinates to degrees in float format"""
                d, m, s = value
                return float(d) + (float(m) / 60.0) + (float(s) / 3600.0)
            
            lat = None
            lon = None
            
            if "GPSLatitude" in gps_info and "GPSLatitudeRef" in gps_info:
                lat = convert_to_degrees(gps_info["GPSLatitude"])
                if gps_info["GPSLatitudeRef"] == "S":
                    lat = -lat
            
            if "GPSLongitude" in gps_info and "GPSLongitudeRef" in gps_info:
                lon = convert_to_degrees(gps_info["GPSLongitude"])
                if gps_info["GPSLongitudeRef"] == "W":
                    lon = -lon
            
            if lat is not None and lon is not None:
                return {"latitude": lat, "longitude": lon}
            
            return None
            
        except Exception as e:
            print(f"    GPS extraction error: {e}")
            return None

    def extract_location_from_image(
        self, image_path_or_url: str, query_context: str = ""
    ) -> Dict[str, Any]:
        """
        Extract location information from image including:
        - GPS/EXIF data (if available)
        - Address (from visible text, signboards, landmarks)
        - Latitude/Longitude
        - Landmarks and area details
        
        Returns:
            {
                "address": str,
                "latitude": float or None,
                "longitude": float or None,
                "landmarks": list,
                "area_type": str,
                "location_details": dict,
                "confidence": str ("high", "medium", "low", "none"),
                "extraction_method": str
            }
        """
        # First try GPS/EXIF extraction
        gps_data = self.extract_gps_from_exif(image_path_or_url)
        
        if gps_data:
            print(f"   📍 GPS data found: {gps_data['latitude']:.6f}, {gps_data['longitude']:.6f}")
            # If GPS found, still do vision analysis for address/landmarks
            vision_result = self._extract_via_vision(image_path_or_url, query_context)
            vision_result["latitude"] = gps_data["latitude"]
            vision_result["longitude"] = gps_data["longitude"]
            vision_result["extraction_method"] = "gps_exif"
            vision_result["confidence"] = "high"
            return vision_result
        
        # Fallback to vision-based extraction
        return self._extract_via_vision(image_path_or_url, query_context)

    def _extract_via_vision(
        self, image_path_or_url: str, query_context: str = ""
    ) -> Dict[str, Any]:
        """Vision-based location extraction using Gemini."""
        try:
            # Load image
            if image_path_or_url.startswith("http"):
                resp = requests.get(image_path_or_url, timeout=30)
                resp.raise_for_status()
                image = Image.open(io.BytesIO(resp.content))
            else:
                image = Image.open(image_path_or_url)

            fmt = (image.format or "").upper()
            mime_type = {
                "JPEG": "image/jpeg",
                "JPG": "image/jpeg",
                "PNG": "image/png",
                "WEBP": "image/webp",
            }.get(fmt, "image/jpeg")

            with io.BytesIO() as buf:
                image.save(buf, format=image.format or "PNG")
                image_bytes = buf.getvalue()

            # Location extraction prompt
            prompt = f"""
You are a location extraction system for government grievance processing.

CONTEXT: {query_context if query_context else "Citizen complaint with image"}

TASK: Extract ALL location information visible in this image:

1. VISIBLE TEXT: Read any text on signboards, nameplates, street signs, building names
2. LANDMARKS: Identify recognizable landmarks, monuments, or well-known places
3. ADDRESS COMPONENTS: Extract house numbers, street names, area names, city
4. GEOGRAPHIC CLUES: Note any geographic features that help identify location
5. AREA TYPE: Residential, commercial, industrial, rural, urban slum, etc.

Return ONLY a valid JSON object:
{{
    "address": "Full address extracted from visible text (or 'Not visible' if none)",
    "latitude": null,
    "longitude": null,
    "landmarks": ["List of visible landmarks or recognizable features"],
    "area_type": "residential/commercial/industrial/rural/urban_slum/mixed",
    "location_details": {{
        "visible_text": ["All text visible on signs, boards, etc."],
        "street_name": "Street name if visible",
        "building_name": "Building or complex name if visible",
        "area_name": "Locality or area name if identifiable",
        "city": "City name if visible or identifiable",
        "state": "State if identifiable",
        "pincode": "PIN code if visible",
        "nearby_places": ["Nearby shops, institutions, or places mentioned"]
    }},
    "confidence": "high/medium/low/none",
    "extraction_method": "ocr/landmark_recognition/geographic_features/none",
    "notes": "Any additional location context"
}}

IMPORTANT:
- If you can identify the exact location, provide latitude/longitude
- Be thorough in extracting ALL visible text
- If no location info is visible, set confidence to "none"
- Don't make up information - only extract what's visible
"""

            response = self.client.vision_model.generate_content(
                [prompt, {"mime_type": mime_type, "data": image_bytes}]
            )
            raw = (response.text or "").strip()

            # Parse JSON response
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                match = re.search(r"\{.*\}", raw, re.DOTALL)
                if match:
                    result = json.loads(match.group())
                else:
                    return self._empty_location_result("JSON parsing failed")

            # Ensure required fields and clean data
            result.setdefault("address", "Not visible in image")
            result.setdefault("latitude", None)
            result.setdefault("longitude", None)
            result.setdefault("landmarks", [])
            result.setdefault("area_type", "unknown")
            result.setdefault("location_details", {})
            result.setdefault("confidence", "none")
            result.setdefault("extraction_method", "none")
            result.setdefault("notes", "")

            # Clean up lat/long - ensure they're valid numbers or None
            result["latitude"] = self._clean_coordinate(result.get("latitude"))
            result["longitude"] = self._clean_coordinate(result.get("longitude"))

            return result

        except Exception as e:
            return self._empty_location_result(f"Extraction error: {str(e)}")

    def _clean_coordinate(self, coord: Any) -> Optional[float]:
        """Convert coordinate to float or None."""
        if coord is None or coord == "null" or coord == "":
            return None
        try:
            val = float(coord)
            # Basic validation for lat/long ranges
            if -90 <= val <= 90 or -180 <= val <= 180:
                return val
            return None
        except (ValueError, TypeError):
            return None

    def _empty_location_result(self, reason: str) -> Dict[str, Any]:
        """Return empty location result structure."""
        return {
            "address": "Not extractable",
            "latitude": None,
            "longitude": None,
            "landmarks": [],
            "area_type": "unknown",
            "location_details": {},
            "confidence": "none",
            "extraction_method": "none",
            "notes": reason,
        }
