# HackAI Market Intelligence

A full-stack application for automated financial analysis. It parses market news/signals from text files, determines affected S&P 500 stocks, fetches market data, performs sentiment analysis, and generates an AI summary using the Gemini pipeline.

## Project Structure
- `app/` - The FastAPI Python backend
- `frontend/` - The Next.js React frontend

## Setup Backend (FastAPI)

1. Navigate to the project root:
   ```bash
   cd HackAI
   ```
2. Create and activate a virtual environment, then install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in your API keys:
   - `GEMINI_API_KEY`
   - `MASSIVE_API_KEY`
   - `ALPHA_VANTAGE_API_KEY`
4. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at http://localhost:8000.

## Setup Frontend (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd HackAI/frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file to specify the API URL (optional if running backend locally at port 8000):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:3000.

## Deployment

- **Frontend**: Designed for instant deployment on [Vercel](https://vercel.com).
- **Backend**: Can be easily hosted on Railway, Render, or any standard Python hosting service. Update the frontend's `NEXT_PUBLIC_API_URL` to point to the production backend URL when deploying.
