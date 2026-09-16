import os
import asyncio
from groq import AsyncGroq
import json

from dotenv import load_dotenv

def get_client():
    load_dotenv()
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key or api_key == "your_groq_api_key_here" or api_key.startswith("your_"):
        return None
    return AsyncGroq(api_key=api_key)

async def generate_narrative(block_name, risk_data):
    top_hazard = risk_data.get("top_hazard", "risk")
    severity = risk_data.get("top_hazard_severity", "Safe")
    top_feature = risk_data.get("top_feature", "conditions")
    top_val = risk_data.get("top_feature_value", "high")
    sec_feature = risk_data.get("second_feature", "factors")
    sec_val = risk_data.get("second_feature_value", "elevated")
    
    if isinstance(top_val, float):
        top_val = round(top_val, 2)
    if isinstance(sec_val, float):
        sec_val = round(sec_val, 2)
        
    fallback = f"{severity} {top_hazard} risk, driven primarily by {top_feature} ({top_val}) and {sec_feature} ({sec_val})."
    
    if client is None:
        return fallback

    prompt = f"In one sentence, explain to a non-technical disaster response officer why {block_name} shows {severity} {top_hazard} risk, given {top_feature}={top_val} and {sec_feature}={sec_val}."

    try:
        chat_completion = await asyncio.wait_for(
            client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="qwen/qwen3.8-27b",
                temperature=0.5,
                max_tokens=60,
            ),
            timeout=3.0
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq narrative failed for {block_name}: {e}")
        return fallback

async def generate_ai_overview(location_name, features, risk_data):
    top_hazard = risk_data.get("top_hazard", "risk")
    severity = risk_data.get("top_hazard_severity", "Safe")
    
    fallback = {
        "trigger_narrative": f"{severity} {top_hazard} risk based on current conditions.",
        "ai_overview": f"Conditions over {location_name} indicate {severity} {top_hazard} risk. A detailed AI overview is currently unavailable."
    }
    
    if client is None:
        return fallback

    prompt = f"""You are a meteorological AI assistant for Meghdoot.
Location: {location_name}
Risk: {severity} {top_hazard}
Features: {json.dumps(features)}

Please provide a JSON response with exactly two keys:
1. "trigger_narrative": A single factual sentence explaining what triggered this risk based on the features.
2. "ai_overview": A short paragraph (3-4 sentences) synthesizing the trend over the last few hours in plain English that a non-technical disaster responder can understand.

Respond ONLY with valid JSON. Do not include markdown formatting or backticks.
"""

    try:
        chat_completion = await asyncio.wait_for(
            client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="qwen/qwen3.8-27b",
                temperature=0.3,
                max_tokens=250,
                response_format={"type": "json_object"}
            ),
            timeout=5.0
        )
        
        response_text = chat_completion.choices[0].message.content.strip()
        parsed = json.loads(response_text)
        return {
            "trigger_narrative": parsed.get("trigger_narrative", fallback["trigger_narrative"]),
            "ai_overview": parsed.get("ai_overview", fallback["ai_overview"])
        }
    except Exception as e:
        print(f"Groq ai overview failed for {location_name}: {e}")
        return fallback

