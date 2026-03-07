from fastapi import FastAPI, UploadFile, File, HTTPException
from app.models import AnalysisResponse
from app.pipeline import run_pipeline

app = FastAPI(
    title="Text-to-Investment Signal Pipeline",
    description="Converts raw text data into actionable investment signals using NLP and market data.",
    version="1.0.0",
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

    result = await run_pipeline(raw_text)
    return result
