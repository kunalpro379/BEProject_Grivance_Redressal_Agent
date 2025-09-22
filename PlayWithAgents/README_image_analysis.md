# Image Analysis Agent

An AI-powered image analysis agent that uses Google Gemini Pro Vision to analyze and describe images with focus on environmental impact assessment.

## Features

- **Multiple Analysis Types**: Detailed, brief, environmental, and technical analysis
- **Environmental Focus**: Specialized analysis for environmental issues and pollution
- **JSON Output**: Structured results with metadata
- **Batch Processing**: Analyze multiple image types in one run
- **Error Handling**: Robust error handling and validation

## Setup

### 1. Install Dependencies

```bash
# Install required packages
pip install -r requirements_image_analysis.txt

# Or run the setup script
python setup_image_analysis.py
```

### 2. Get Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create a new API key
3. Set the environment variable:

```bash
export GEMINI_API_KEY='your-api-key-here'
```

### 3. Run the Analysis

```bash
# Analyze the garbage.jpeg image
python image_analysis.py
```

## Usage

### Basic Usage

```python
from image_analysis import ImageAnalysisAgent

# Initialize agent
agent = ImageAnalysisAgent()

# Analyze image
result = agent.analyze_image("garbage.jpeg", "environmental")
print(result["description"])
```

### Multiple Analysis Types

```python
# Get all analysis types
results = agent.analyze_multiple_types("garbage.jpeg")

# Save results
agent.save_analysis(results, "analysis_results.json")
```

## Analysis Types

1. **Environmental**: Focus on environmental issues, pollution, waste, sustainability
2. **Detailed**: Comprehensive description of all visible elements
3. **Brief**: Concise 2-3 sentence summary
4. **Technical**: Technical aspects like composition, lighting, color palette

## Output Format

```json
{
  "success": true,
  "description": "Detailed analysis text...",
  "analysis_type": "environmental",
  "image_metadata": {
    "filename": "garbage.jpeg",
    "size": [1920, 1080],
    "format": "JPEG",
    "mode": "RGB",
    "file_size": 186000
  },
  "model_used": "gemini-pro-vision"
}
```

## Files

- `image_analysis.py` - Main agent implementation
- `requirements_image_analysis.txt` - Python dependencies
- `setup_image_analysis.py` - Setup and installation script
- `garbage.jpeg` - Sample image for analysis
- `garbage_analysis_results.json` - Output results (generated after run)

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   ```bash
   export GEMINI_API_KEY='your-key-here'
   ```

2. **Package Installation Failed**
   ```bash
   pip install --upgrade pip
   pip install -r requirements_image_analysis.txt
   ```

3. **Image Not Found**
   - Ensure `garbage.jpeg` is in the same directory
   - Check file permissions

4. **Network Issues**
   - Check internet connection
   - Verify API key is valid
   - Check Gemini API status

### Error Messages

- `GEMINI_API_KEY environment variable not set` - Set your API key
- `Image file not found` - Check file path and permissions
- `Invalid image file` - Ensure file is a valid image format
- `Analysis failed` - Check API key and network connection

## Example Output

For `garbage.jpeg`, the environmental analysis might return:

```
This image shows severe environmental degradation with extensive plastic pollution along a waterway. The scene depicts a heavily contaminated riverbank covered with numerous plastic bottles, containers, and other waste materials. The water appears murky and polluted, indicating significant environmental damage. The presence of organic debris mixed with plastic waste suggests this is an ongoing pollution problem that has accumulated over time. This type of pollution poses serious threats to aquatic ecosystems, wildlife, and water quality, representing a critical environmental issue that requires immediate attention and cleanup efforts.
```

## License

This project is part of the BEProject Grievance Redressal Agent system.
