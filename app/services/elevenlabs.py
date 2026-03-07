import httpx
from app.config import settings


async def text_to_speech(text: str) -> bytes:
    """Convert text to speech using ElevenLabs API. Returns MP3 audio bytes."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": settings.elevenlabs_api_key,
    }

    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.content


async def speech_to_text(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    """Convert speech audio to text using ElevenLabs Scribe v2. Returns transcript."""
    url = "https://api.elevenlabs.io/v1/speech-to-text"

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
    }

    # Determine MIME type from filename
    mime = "audio/webm"
    if filename.endswith(".wav"):
        mime = "audio/wav"
    elif filename.endswith(".mp3"):
        mime = "audio/mpeg"
    elif filename.endswith(".ogg"):
        mime = "audio/ogg"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            data={"model_id": "scribe_v2"},
            files={"file": (filename, audio_bytes, mime)},
            timeout=60,
        )
        response.raise_for_status()
        result = response.json()
        return result.get("text", "")

