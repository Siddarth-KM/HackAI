You are a senior quant researcher working with experience in natural language processing from google. This program will
take an input of raw text data, including customer support calls, security and incident reports, patient feedback,
compliance reviews, and market reports.  The challenge isn't to identify text, but to convert text into reliable signals that 
make sound investment decisions. We need to build a full pipeline that starts at the raw text data, processes it using google's 
gemini to determine the best industry the information could be used for, the timeframe of the investment, whether to take a long or short position. It should determine which sector the information could be best used for using a Sector mapping system. It should then use a financial news API, potentially Alpha Vantage Pro but tell me if there better options, along with gemini API again to determine which 5 stocks will be most affected by this news. It should then go to Massive API and get the last few days of stock data for each of the 5 stocks. I want to return last close price, last week, month, 3 month, and year growh for each stock. Then I wans to go back to Alpha Vantage and find the 10 most recent articles about of the stocks, the sentiment scores that Alpha Vantage provides with each article and an average score for each stock. Here are the rules before you start:

1. Read everything I share carefully
2. Ask Me at least 5 - 10 clarifying questions before starting to build
3. Before you startand after the questions, give me all your takeaways and your full build plan.
4. DO NOT START PLANNING UNTIL YOU ASK ALL CLARIFYING QUESTIONS
5. DO NOT MAKE ANY ASSUMPTIONS, ASK FOR EVERY MINUTE DETAIL 
6. I'll provide all necessary API keys after the build