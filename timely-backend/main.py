from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import os
import vertexai
from vertexai.generative_models import GenerativeModel

# Cloud Run will set GOOGLE_CLOUD_PROJECT automatically
PROJECT_ID = os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GCP_REGION", "asia-south1")  # e.g. asia-south1

app = FastAPI()

# FIXED CORS - Option 1: Remove credentials (simpler, works for most cases)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # CHANGED: Must be False with wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# OR Option 2: Specify exact origins (more secure, use if you need credentials)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "https://timely-scholar.web.app",
#         "https://timely-scholar.firebaseapp.com",
#         "http://localhost:3000",  # for local dev
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

class Subject(BaseModel):
    name: str
    attended: int
    total: int
    target_attendance: Optional[int] = 75

class SuggestRequest(BaseModel):
    subjects: List[Subject]

class SuggestResponse(BaseModel):
    suggestion: str

def call_gemini(prompt: str) -> str:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel("gemini-1.5-flash")  # Use stable model
    resp = model.generate_content(prompt)
    return getattr(resp, "text", str(resp))

@app.post("/suggest", response_model=SuggestResponse)
def suggest_plan(body: SuggestRequest):
    lines = []
    for s in body.subjects:
        lines.append(
            f"{s.name}: attended={s.attended}, total={s.total}, target={s.target_attendance}%"
        )
    prompt = (
        "You are an assistant helping a student plan class attendance and study schedule.\n"
        "Given these subjects with attendance stats, suggest:\n"
        "1) Which subjects they need to focus more on.\n"
        "2) How they should adjust their timetable for the next week.\n"
        "3) Any warnings about low attendance.\n\n"
        "Subjects:\n" + "\n".join(lines)
    )
    try:
        suggestion = call_gemini(prompt)
    except Exception as e:
        suggestion = (
            f"(Gemini error: {e}) Based on the data, focus more on subjects with "
            "the lowest attendance percentage and plan extra study sessions for them."
        )
    return SuggestResponse(suggestion=suggestion)

@app.get("/")
def health():
    return {"status": "ok"}
