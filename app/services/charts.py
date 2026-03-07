import base64
import io
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend — no display
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker


def generate_returns_chart(
    ticker: str,
    company_name: str,
    week_return_pct: float | None,
    month_return_pct: float | None,
    three_month_return_pct: float | None,
    year_return_pct: float | None,
) -> str:
    """Generate a bar chart of stock returns across all timeframes.

    Returns a base64-encoded PNG string for the frontend to render.
    """
    labels = ["1 Week", "1 Month", "3 Months", "1 Year"]
    values = [week_return_pct, month_return_pct, three_month_return_pct, year_return_pct]

    # Replace None with 0 for plotting, track which were missing
    plot_values = [v if v is not None else 0.0 for v in values]

    colors = ["#2ecc71" if v >= 0 else "#e74c3c" for v in plot_values]

    fig, ax = plt.subplots(figsize=(7, 4))
    bars = ax.bar(labels, plot_values, color=colors, width=0.5, edgecolor="white", linewidth=0.8)

    # Annotate each bar with its value
    for bar, val, orig in zip(bars, plot_values, values):
        label = f"{val:+.2f}%" if orig is not None else "N/A"
        y_offset = 0.3 if val >= 0 else -0.3
        va = "bottom" if val >= 0 else "top"
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + y_offset,
            label,
            ha="center",
            va=va,
            fontsize=9,
            fontweight="bold",
            color="#333333",
        )

    ax.axhline(0, color="#888888", linewidth=0.8, linestyle="--")
    ax.set_title(f"{ticker} — {company_name}\nReturn by Timeframe", fontsize=12, fontweight="bold", pad=12)
    ax.set_ylabel("Return (%)", fontsize=10)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(axis="x", labelsize=10)
    ax.tick_params(axis="y", labelsize=9)

    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)

    return base64.b64encode(buf.read()).decode("utf-8")
