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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for hackathon: allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # Try latest Gemini Flash model. If it causes deploy error, switch to "gemini-1.5-flash".
    model = GenerativeModel("gemini-2.5-flash")
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