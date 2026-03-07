from app.models import (
    AnalysisResponse,
    ArticleSentiment,
    SignalExtraction,
    StockAnalysis,
    StockReturns,
    StockSentiment,
)
from app.services.sp500 import get_sp500_stocks, filter_by_sector
from app.services.gemini import extract_signal, select_stocks, generate_summary
from app.services.massive import get_stock_returns
from app.services.alpha_vantage import get_stock_sentiment
from app.services.charts import generate_returns_chart


async def run_pipeline(raw_text: str) -> AnalysisResponse:
    """Run the full text-to-investment-signal pipeline."""

    # Step 1: Extract signal from raw text via Gemini
    signal_data = await extract_signal(raw_text)
    signal = SignalExtraction(**signal_data)

    # Step 2: Get S&P 500 list and filter by sector, then select top 5 stocks
    sp500 = await get_sp500_stocks()
    sector_stocks = filter_by_sector(sp500, signal.sector)
    selected_tickers = await select_stocks(signal_data, sector_stocks)

    # Build a ticker -> company name lookup
    ticker_to_company = {s["ticker"]: s["company"] for s in sp500}

    # Step 3 & 4: For each stock, get price returns and sentiment
    stock_analyses: list[StockAnalysis] = []
    for ticker in selected_tickers:
        returns_data = await get_stock_returns(ticker)
        sentiment_data = await get_stock_sentiment(ticker)

        returns = StockReturns(
            ticker=ticker,
            company_name=ticker_to_company.get(ticker, ticker),
            last_close=returns_data["last_close"],
            week_return_pct=returns_data["week_return_pct"],
            month_return_pct=returns_data["month_return_pct"],
            three_month_return_pct=returns_data["three_month_return_pct"],
            year_return_pct=returns_data["year_return_pct"],
        )

        sentiment = StockSentiment(
            ticker=ticker,
            articles=[ArticleSentiment(**a) for a in sentiment_data["articles"]],
            average_sentiment=sentiment_data["average_sentiment"],
        )

        chart = generate_returns_chart(
            ticker=ticker,
            company_name=returns.company_name,
            week_return_pct=returns.week_return_pct,
            month_return_pct=returns.month_return_pct,
            three_month_return_pct=returns.three_month_return_pct,
            year_return_pct=returns.year_return_pct,
        )

        stock_analyses.append(StockAnalysis(returns=returns, sentiment=sentiment, chart_base64=chart))

    # Step 5: Generate summary recommendation via Gemini
    analyses_for_summary = [
        {
            "ticker": sa.returns.ticker,
            "company": sa.returns.company_name,
            "last_close": sa.returns.last_close,
            "week_return_pct": sa.returns.week_return_pct,
            "month_return_pct": sa.returns.month_return_pct,
            "three_month_return_pct": sa.returns.three_month_return_pct,
            "year_return_pct": sa.returns.year_return_pct,
            "avg_sentiment": sa.sentiment.average_sentiment,
            "num_articles": len(sa.sentiment.articles),
        }
        for sa in stock_analyses
    ]

    summary = await generate_summary(signal_data, analyses_for_summary)

    return AnalysisResponse(
        signal=signal,
        selected_stocks=selected_tickers,
        stock_analyses=stock_analyses,
        summary_recommendation=summary,
    )
