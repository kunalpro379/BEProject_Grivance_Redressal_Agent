import google.generativeai as genai
from PIL import Image

#  PUT YOUR NEW API KEY HERE (DO NOT SHARE IT)
genai.configure(api_key="AIzaSyBKdYslBh7PCyZXuRWKstuuhdUFoDH_5SE")

# Load Gemini Vision model
model = genai.GenerativeModel("gemini-3.1-pro-preview")

# Load image
image = Image.open("garbage.jpeg")

# Prompt for description (government-style analysis)
prompt = """
Describe the image in detail.
Focus on garbage accumulation, sanitation condition,
public health risk, and environmental impact.
Use formal language suitable for a government grievance report.
"""

# Generate response
response = model.generate_content([prompt, image])

print(response.text)