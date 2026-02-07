import os
import random
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from twilio.rest import Client
from supabase import create_client, Client as SupabaseClient

# Ensure ai_agent.py is in the same folder
from ai_agent import analyze_civic_issue 

app = FastAPI()

# CORS Fix for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATIONS (ENTER YOUR ACTUAL KEYS) ---
TWILIO_SID = "ACea822f610a63e38b4d625212122e2cd0" 
TWILIO_AUTH_TOKEN = "73a7114ec28db42a43139037a8cbc3a2" 
TWILIO_PHONE = "+13072246590"

SUPABASE_URL = "https://ukdmhidwxiqiwaeirwys.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZG1oaWR3eGlxaXdhZWlyd3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzI4NDIsImV4cCI6MjA4NjA0ODg0Mn0.01HmH5YWLYOMVtIyYui5DzQbb5OowRdEdENAgwe5D84"
supabase: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global OTP Store
otp_storage = {}

def send_sms(to_number, message):
    try:
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(body=message, from_=TWILIO_PHONE, to=to_number)
        print(f"✅ Twilio Success: {to_number}")
    except Exception as e:
        print(f"❌ Twilio Error: {e}")

# --- API ENDPOINTS ---

@app.post("/api/request-otp")
async def request_otp(phone: str = Form(...)):
    # Standardize phone format
    clean_phone = phone.strip()
    otp = str(random.randint(100000, 999999))
    otp_storage[clean_phone] = otp
    
    print(f"\n🚀 [OTP GENERATED] Phone: {clean_phone} | Code: {otp}\n")
    
    # Attempt Real SMS
    send_sms(clean_phone, f"Your CivicHero OTP is {otp}")
    
    return {"status": "success", "message": "OTP Sent"}

#hadle report
@app.post("/api/report")
async def handle_report(
    name: str = Form(...),
    phone: str = Form(...),
    city: str = Form(...),
    area: str = Form(...),
    domain: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        image_data = await file.read()
        analysis_result = analyze_civic_issue(image_data, f"{domain}: {description}", city)
        
        # Save to Supabase
        report_data = {
            "name": name, "phone": phone, "city": city, "area": area,
            "domain": domain, "description": description, "analysis": analysis_result
        }
        db_res = supabase.table("reports").insert(report_data).execute()
        saved_report = db_res.data[0]
        
        # --- CUSTOM SMS TEMPLATE ---
        now = datetime.now().strftime("%d %b, %I:%M %p")
        sms_body = (
            f"Hi {name}, your civic report for {domain} at {area}, {city} "
            f"has been successfully filed on {now}. We are working on it."
        )
        send_sms(phone, sms_body)

        return {"status": "success", "data": saved_report}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
        # Confirmation SMS
        send_sms(phone, f"Ref {db_res.data[0]['id']}: Your {domain} report has been filed. - CivicHero")
        
        return {"status": "success", "data": db_res.data[0]}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history():
    res = supabase.table("reports").select("*").order("id", desc=True).execute()
    return res.data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)