import traceback
import json

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from app.models import AnalysisResponse
from app.pipeline import run_pipeline
from app.services.elevenlabs import text_to_speech, speech_to_text
from app.services.gemini import chat_with_context

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
    persona: str = "Default"

class TTSRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    message: str
    context: str = ""
    history: list[dict[str, str]] = []


@app.get("/health")
async def health_check():
    return {"status": "ok"}


async def _run_pipeline_safe(raw_text: str, persona: str = "Default") -> AnalysisResponse:
    """Shared pipeline runner with error handling."""
    try:
        return await run_pipeline(raw_text, persona=persona)
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
    """Accept a text, PDF, or CSV file and return a full investment signal analysis."""
    filename = (file.filename or "").lower()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Parse based on file type
    if filename.endswith(".pdf"):
        import io
        from PyPDF2 import PdfReader
        try:
            reader = PdfReader(io.BytesIO(content))
            raw_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")
    elif filename.endswith(".csv"):
        import io, csv
        try:
            text_content = content.decode("utf-8")
            reader = csv.reader(io.StringIO(text_content))
            rows = list(reader)
            raw_text = "\n".join(", ".join(row) for row in rows).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")
    elif filename.endswith(".txt"):
        raw_text = content.decode("utf-8").strip()
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload .txt, .pdf, or .csv files.")

    if not raw_text:
        raise HTTPException(status_code=400, detail="No text could be extracted from the file.")

    return await _run_pipeline_safe(raw_text)


@app.post("/analyze-text", response_model=AnalysisResponse)
async def analyze_text(request: AnalyzeTextRequest):
    """Accept raw text and return a full investment signal analysis."""
    raw_text = request.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text input is empty.")

    return await _run_pipeline_safe(raw_text, persona=request.persona)


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
        print(f"TTS error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


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
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with Gemini using analysis context."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty.")

    try:
        response = await chat_with_context(
            context=request.context,
            user_message=request.message,
            history=request.history,
        )
        return {"response": response}
    except Exception as e:
        error_msg = str(e)
        print(f"Chat error: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {error_msg}")
