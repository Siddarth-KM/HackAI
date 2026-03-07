import traceback
import json

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import AnalysisResponse
from app.pipeline import run_pipeline

app = FastAPI(
    title="Text-to-Investment Signal Pipeline",
    description="Converts raw text data into actionable investment signals using NLP and market data.",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...)):
    """Accept a text file and return a full investment signal analysis."""
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are accepted.")

    content = await file.read()
    raw_text = content.decode("utf-8").strip()

    if not raw_text:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = await run_pipeline(raw_text)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        error_msg = str(e)
        # Provide a more helpful message for common API key issues
        if "API key" in error_msg or "api_key" in error_msg or "401" in error_msg or "403" in error_msg:
            raise HTTPException(
                status_code=401,
                detail=f"API key error — please check your .env file has valid keys. Details: {error_msg}"
            )
        print(f"Pipeline error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline failed: {error_msg}"
        )
