import json
from google import genai
from app.config import settings

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

Return ONLY valid JSON, no markdown formatting, no code blocks, no explanation.

Raw text:
{raw_text}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


async def select_stocks(
    signal: dict, stocks: list[dict[str, str]]
) -> list[str]:
    """Use Gemini to select the top 5 S&P 500 stocks most affected by the signal."""
    client = _get_client()

    stock_list = "\n".join(
        f"- {s['ticker']}: {s['company']} ({s['sector']})" for s in stocks
    )

    prompt = f"""You are a senior quantitative researcher. Based on the investment signal below,
select the 5 stocks from the provided list that would be MOST affected by this signal.

Investment Signal:
- Summary: {signal['signal_summary']}
- Sector: {signal['sector']}
- Timeframe: {signal['timeframe']}
- Direction: {signal['direction']}

Available stocks:
{stock_list}

Return ONLY a JSON array of exactly 5 ticker symbols, e.g. ["AAPL", "MSFT", "GOOGL", "AMZN", "META"].
No explanation, no markdown, no code blocks. Just the JSON array."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


async def generate_summary(
    signal: dict,
    stock_analyses: list[dict],
) -> str:
    """Generate a final recommendation summary paragraph using Gemini."""
    client = _get_client()

    analyses_text = json.dumps(stock_analyses, indent=2, default=str)

    prompt = f"""You are a senior quantitative researcher writing an investment recommendation.

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

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text.strip()
