from pydantic import BaseModel


class SignalExtraction(BaseModel):
    signal_summary: str
    sector: str
    timeframe: str
    direction: str  # "long" or "short"


class StockReturns(BaseModel):
    ticker: str
    company_name: str
    last_close: float | None
    week_return_pct: float | None
    month_return_pct: float | None
    three_month_return_pct: float | None
    year_return_pct: float | None


class ArticleSentiment(BaseModel):
    title: str
    url: str
    published_at: str
    sentiment_score: float
    relevance_score: float


class StockSentiment(BaseModel):
    ticker: str
    articles: list[ArticleSentiment]
    average_sentiment: float | None


class StockAnalysis(BaseModel):
    returns: StockReturns
    sentiment: StockSentiment


class AnalysisResponse(BaseModel):
    signal: SignalExtraction
    selected_stocks: list[str]
    stock_analyses: list[StockAnalysis]
    summary_recommendation: str
