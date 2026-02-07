import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Local Knowledge Base for Gujarat Cities
CITY_KNOWLEDGE = {
    "Vadodara": """
        Zones in Vadodara:
        - East: Karelibaug Ward Office (0265-2433116)
        - West: Akota Ward Office (0265-2358051)
        - North: Nizampura Ward Office (0265-2780443)
        - South: Manjalpur Ward Office (0265-2646610)
        Departments: Roads (0265-2433118), Waste (1800-233-0265)
        NGOs: SOCLEEN (+91 98250 12345), United Way of Baroda (0265-2358091)
    """,
    "Ahmedabad": """
        Zones in Ahmedabad:
        - Central: Danapith Office (079-25391811)
        - West: Usmanpura Office (079-27556182)
        - New West: Bodakdev Office (079-26871329)
        - East: I-Complex (079-22130353)
        Departments: AMC Helpline (155303)
        NGOs: Manav Sadhna (079-27236104), ESI (079-27233768)
    """
}

def analyze_civic_issue(image_bytes, user_text, selected_city):
    model = genai.GenerativeModel('gemini-3-flash-preview')
    
    # Prompt now explicitly asks for user details integration
    prompt = f"""
    You are the CivicHero AI Agent for {selected_city}.
    Submission Details: {user_text}
    
    RESPONSE FORMAT:
    1. Start with a "CIVIC CASE SUMMARY" including the user's name and location.
    2. Provide a "GUIDEBOOK" formatted response using:
       ### 🚩 ISSUE VERIFICATION
       ### 📍 LOCATION & WARD INTELLIGENCE
       ### 🛠️ MUNICIPAL ACTION PLAN (Contacts & Escalation)
       ### 🤝 COMMUNITY SUPPORT (NGOs)
       ### ⚠️ SEVERITY RATING
    """
    response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_bytes}])
    return response.text