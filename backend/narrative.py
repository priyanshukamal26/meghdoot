import os
import asyncio
from groq import AsyncGroq

# Initialize client if API key is present
api_key = os.environ.get("GROQ_API_KEY")
client = AsyncGroq(api_key=api_key) if api_key else None

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
                model="llama3-8b-8192",
                temperature=0.5,
                max_tokens=60,
            ),
            timeout=3.0
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq narrative failed for {block_name}: {e}")
        return fallback
