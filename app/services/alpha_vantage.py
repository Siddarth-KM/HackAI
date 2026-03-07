import httpx
from datetime import datetime, timedelta
from app.config import settings

BASE_URL = "https://www.alphavantage.co/query"


async def get_stock_sentiment(ticker: str) -> dict:
    """Fetch news sentiment for a ticker from Alpha Vantage.

    Filters to articles with relevance score > 50 from the last 6 months.
    Returns the 10 most recent articles and the average sentiment score.
    """
    six_months_ago = datetime.now() - timedelta(days=180)
    time_from = six_months_ago.strftime("%Y%m%dT0000")

    params = {
        "function": "NEWS_SENTIMENT",
        "tickers": ticker,
        "time_from": time_from,
        "limit": 50,
        "apikey": settings.alpha_vantage_api_key,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

    feed = data.get("feed", [])

    relevant_articles = []
    for article in feed:
        ticker_sentiments = article.get("ticker_sentiment", [])
        for ts in ticker_sentiments:
            if ts.get("ticker", "").upper() == ticker.upper():
                relevance = float(ts.get("relevance_score", 0)) * 100
                if relevance > 50:
                    relevant_articles.append({
                        "title": article.get("title", ""),
                        "url": article.get("url", ""),
                        "published_at": article.get("time_published", ""),
                        "sentiment_score": float(ts.get("ticker_sentiment_score", 0)),
                        "relevance_score": round(relevance, 2),
                    })
                break

    # Sort by published date descending and take top 10
    relevant_articles.sort(key=lambda x: x["published_at"], reverse=True)
    top_articles = relevant_articles[:10]

    avg_sentiment = None
    if top_articles:
        avg_sentiment = round(
            sum(a["sentiment_score"] for a in top_articles) / len(top_articles), 4
        )

    return {
        "ticker": ticker,
        "articles": top_articles,
        "average_sentiment": avg_sentiment,
    }
