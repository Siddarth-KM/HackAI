from datetime import date, timedelta
import time
from massive import RESTClient
from app.config import settings


def _get_client() -> RESTClient:
    return RESTClient(api_key=settings.massive_api_key)


async def get_stock_returns(ticker: str) -> dict:
    """Fetch 1 year of daily OHLCV data and calculate returns."""
    client = _get_client()

    today = date.today()
    one_year_ago = today - timedelta(days=365)

    # Retry with backoff on 429 rate limit errors
    aggs = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            aggs = client.get_aggs(
                ticker=ticker,
                multiplier=1,
                timespan="day",
                from_=one_year_ago.isoformat(),
                to=today.isoformat(),
                adjusted=True,
                sort="asc",
            )
            break
        except Exception as e:
            if "429" in str(e) or "too many" in str(e).lower() or "rate" in str(e).lower():
                wait_time = (attempt + 1) * 15
                print(f"Massive API rate limited for {ticker}, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                raise
    else:
        print(f"Massive API: max retries exceeded for {ticker}, returning empty data")
        return {
            "ticker": ticker,
            "last_close": None,
            "week_return_pct": None,
            "month_return_pct": None,
            "three_month_return_pct": None,
            "year_return_pct": None,
        }

    if not aggs:
        return {
            "ticker": ticker,
            "last_close": None,
            "week_return_pct": None,
            "month_return_pct": None,
            "three_month_return_pct": None,
            "year_return_pct": None,
        }

    last_close = aggs[-1].close

    def _find_close_near(target_date: date) -> float | None:
        """Find the closing price on or nearest before the target date."""
        for agg in reversed(aggs):
            agg_date = date.fromtimestamp(agg.timestamp / 1000)
            if agg_date <= target_date:
                return agg.close
        return None

    def _calc_return(days_ago: int) -> float | None:
        target = today - timedelta(days=days_ago)
        past_close = _find_close_near(target)
        if past_close and past_close != 0:
            return round(((last_close - past_close) / past_close) * 100, 2)
        return None

    return {
        "ticker": ticker,
        "last_close": round(last_close, 2),
        "week_return_pct": _calc_return(7),
        "month_return_pct": _calc_return(30),
        "three_month_return_pct": _calc_return(90),
        "year_return_pct": _calc_return(365),
    }
