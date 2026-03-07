import json
from pathlib import Path

_sp500_cache: list[dict[str, str]] | None = None

DATA_FILE = Path(__file__).parent.parent / "data" / "sp500.json"


async def get_sp500_stocks() -> list[dict[str, str]]:
    """Load S&P 500 tickers, company names, and sectors from local JSON. Cached after first call."""
    global _sp500_cache
    if _sp500_cache is not None:
        return _sp500_cache

    with open(DATA_FILE) as f:
        _sp500_cache = json.load(f)

    return _sp500_cache


def filter_by_sector(stocks: list[dict[str, str]], sector: str) -> list[dict[str, str]]:
    """Filter S&P 500 stocks by GICS sector. Returns full list if no matches."""
    sector_lower = sector.lower()
    filtered = [s for s in stocks if sector_lower in s["sector"].lower()]
    return filtered if filtered else stocks
