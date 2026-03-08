import json
import asyncio
from google import genai
from app.config import settings

MODEL_NAME = "gemini-2.5-flash"

GICS_SECTORS = [
    "Information Technology",
    "Health Care",
    "Financials",
    "Consumer Discretionary",
    "Communication Services",
    "Industrials",
    "Consumer Staples",
    "Energy",
    "Utilities",
    "Real Estate",
    "Materials",
]


def _get_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _call_gemini(client: genai.Client, prompt: str, max_retries: int = 3) -> str:
    """Call Gemini with automatic retry on rate limit (429) errors."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            error_msg = str(e)
            # Check for authentication errors
            if "401" in error_msg or "invalid" in error_msg.lower() and "key" in error_msg.lower():
                raise Exception(f"Gemini API authentication failed. Check your GEMINI_API_KEY in .env file. Error: {error_msg}")
            # Check for quota/rate limit errors
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 15  # 15s, 30s, 45s
                    print(f"Rate limited, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                    import time
                    time.sleep(wait_time)
                else:
                    raise Exception(f"Gemini API rate limit exceeded after {max_retries} retries: {error_msg}")
            else:
                # For other errors, don't retry
                raise Exception(f"Gemini API error: {error_msg}")


async def extract_signal(raw_text: str) -> dict:
    """Extract investment signal, sector, timeframe, and direction from raw text."""
    client = _get_client()

    prompt = f"""You are a senior quantitative researcher. Analyze the following raw text data and extract
investment signals. The text could be from customer support calls, security/incident reports,
patient feedback, compliance reviews, or market reports.

Return a JSON object with exactly these fields:
- "signal_summary": A concise 2-3 sentence summary of the investment-relevant signal found in the text.
- "sector": The single most relevant GICS sector from this list: {json.dumps(GICS_SECTORS)}
- "timeframe": The recommended investment timeframe. Must be one of: "1 month", "3 months", "6 months", "1 year"
- "direction": Either "long" or "short" based on whether the signal is positive or negative for the sector.
- "reliability_score": An integer from 1 to 100 rating how actionable and believable this signal is. Consider whether the claim is realistic and fact-checkable. For example, overhearing a conversation about a company's earnings beating expectations is highly plausible and actionable — that should score 85-95. But hearing "Google is going bankrupt" is obviously false and not actionable — that should score 5-15. Use your judgment on the plausibility, specificity, and source quality of the signal.

Return ONLY valid JSON, no markdown formatting, no code blocks, no explanation.

Raw text:
{raw_text}"""

    text = _call_gemini(client, prompt)
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


async def select_stocks(
    signal: dict, stocks: list[dict[str, str]]
) -> list[str]:
    """Use Gemini to select the top 4 S&P 500 stocks most affected by the signal."""
    client = _get_client()

    stock_list = "\n".join(
        f"- {s['ticker']}: {s['company']} ({s['sector']})" for s in stocks
    )

    prompt = f"""You are a senior quantitative researcher. Based on the investment signal below,
select the 4 stocks from the provided list that would be MOST affected by this signal.

Investment Signal:
- Summary: {signal['signal_summary']}
- Sector: {signal['sector']}
- Timeframe: {signal['timeframe']}
- Direction: {signal['direction']}

Available stocks:
{stock_list}

Return ONLY a JSON array of exactly 4 ticker symbols, e.g. ["AAPL", "MSFT", "GOOGL", "AMZN"].
No explanation, no markdown, no code blocks. Just the JSON array."""

    text = _call_gemini(client, prompt)
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


PERSONA_PROMPTS = {
    "Ray Dalio": "You are Ray Dalio, founder of Bridgewater Associates. Write in your characteristic style — focus on macroeconomic cycles, diversification principles, and radical transparency. Reference how this fits into the broader economic machine.",
    "Warren Buffett": "You are Warren Buffett, the Oracle of Omaha. Write in your folksy, wisdom-filled style — emphasize intrinsic value, long-term compounding, competitive moats, and margin of safety. Use simple analogies.",
    "Simplify": "You are a financial educator explaining to a beginner investor. Use very simple language, avoid jargon, and break down the recommendation so anyone can understand it. Be encouraging and clear.",
    "Quant": "You are an elite quantitative analyst at a top hedge fund. Be precise and data-driven — reference specific return figures, sentiment scores, and statistical reasoning. Use technical financial language and quantitative frameworks.",
}


async def generate_summary(
    signal: dict,
    stock_analyses: list[dict],
    persona: str = "Default",
) -> str:
    """Generate a final recommendation summary paragraph using Gemini."""
    client = _get_client()

    analyses_text = json.dumps(stock_analyses, indent=2, default=str)

    persona_instruction = PERSONA_PROMPTS.get(persona, "You are a senior quantitative researcher writing an investment recommendation.")

    prompt = f"""{persona_instruction}

Based on the following signal extraction and stock analysis data, write a concise recommendation
paragraph (4-6 sentences) that summarizes:
1. The key signal identified
2. The recommended sector and direction (long/short)
3. The top stocks and their recent performance
4. The overall sentiment from news articles
5. A clear actionable recommendation with the timeframe

Investment Signal:
- Summary: {signal['signal_summary']}
- Sector: {signal['sector']}
- Timeframe: {signal['timeframe']}
- Direction: {signal['direction']}

Stock Analysis Data:
{analyses_text}

Write ONLY the recommendation paragraph. No headers, no bullet points, no markdown."""

    return _call_gemini(client, prompt)


async def chat_with_context(
    context: str,
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> str:
    """Chat with Gemini using the analysis summary as context."""
    client = _get_client()

    history_text = ""
    if history:
        for msg in history[-10:]:  # Keep last 10 messages to avoid token limits
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_text += f"\n{role.upper()}: {content}"

    prompt = f"""You are a helpful financial analyst assistant for HackAI Market Intelligence.
You have access to the following investment analysis that was generated for the user:

--- ANALYSIS CONTEXT ---
{context}
--- END CONTEXT ---

Use this context to answer the user's questions about the analysis, stocks, signals,
sentiment, or any related financial topics. Be concise, clear, and helpful.
If the user asks about something not covered in the context, you can provide general
financial knowledge but note that it's outside the specific analysis.

{f"Previous conversation:{history_text}" if history_text else ""}

USER: {user_message}

Respond naturally and concisely. Do not use markdown headers. Keep responses under 150 words unless more detail is specifically requested."""

    return _call_gemini(client, prompt)

