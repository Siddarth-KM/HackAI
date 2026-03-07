import traceback
import json

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from app.models import AnalysisResponse
from app.pipeline import run_pipeline
from app.services.elevenlabs import text_to_speech, speech_to_text

app = FastAPI(
    title="Text-to-Investment Signal Pipeline",
    description="Converts raw text data into actionable investment signals using NLP and market data.",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request models ---
class AnalyzeTextRequest(BaseModel):
    text: str

class TTSRequest(BaseModel):
    text: str


@app.get("/health")
async def health_check():
    return {"status": "ok"}


async def _run_pipeline_safe(raw_text: str) -> AnalysisResponse:
    """Shared pipeline runner with error handling."""
    try:
        return await run_pipeline(raw_text)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        error_msg = str(e)
        if "API key" in error_msg or "api_key" in error_msg or "401" in error_msg or "403" in error_msg:
            raise HTTPException(
                status_code=401,
                detail=f"API key error — please check your .env file has valid keys. Details: {error_msg}"
            )
        print(f"Pipeline error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {error_msg}")


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...)):
    """Accept a text file and return a full investment signal analysis."""
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are accepted.")

    content = await file.read()
    raw_text = content.decode("utf-8").strip()

    if not raw_text:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return await _run_pipeline_safe(raw_text)


@app.post("/analyze-text", response_model=AnalysisResponse)
async def analyze_text(request: AnalyzeTextRequest):
    """Accept raw text and return a full investment signal analysis."""
    raw_text = request.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text input is empty.")

    return await _run_pipeline_safe(raw_text)


@app.post("/tts")
async def tts(request: TTSRequest):
    """Convert text to speech using ElevenLabs. Returns MP3 audio."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty.")

    try:
        audio_bytes = await text_to_speech(request.text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "invalid" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="ElevenLabs API key error — check ELEVENLABS_API_KEY in .env"
            )
        print(f"TTS error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {error_msg}")


@app.post("/stt")
async def stt(file: UploadFile = File(...)):
    """Convert speech audio to text using ElevenLabs Scribe v2."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    try:
        transcript = await speech_to_text(audio_bytes, filename=file.filename or "recording.webm")
        return {"text": transcript}
    except Exception as e:
        error_msg = str(e)
        print(f"STT error: {error_msg}")
        # Check for actual 401 (unauthorized) from ElevenLabs
        if "returned 401" in error_msg:
            raise HTTPException(
                status_code=401,
                detail="ElevenLabs API key error — check ELEVENLABS_API_KEY in .env"
            )
        raise HTTPException(status_code=500, detail=f"STT failed: {error_msg}")

