# SmartCart Compare 🛒

SmartCart Compare is a real-time web scraping application designed to help users instantly compare product prices, ratings, and features between **Amazon.in** and **Flipkart**. 

With a modern, professional dark-themed UI, it displays the best matches side-by-side, helping users find the best deals without opening multiple tabs.

## ✨ Features

- **Live Price Comparison:** Scrapes Amazon and Flipkart simultaneously for the most up-to-date pricing.
- **Smart Result Grouping:** Automatically highlights the "Best Matches" at the top, while listing other options in a sleek, expandable compact list below.
- **Modern UI:** Built with an aesthetically pleasing dark mode featuring custom gradients, clean typography, and micro-animations.
- **Bot Detection Evasion:** Uses rotating, browser-realistic user-agents and tailored headers to reduce the chance of triggering CAPTCHAs.
- **Rate Limiting:** Built-in in-memory rate limiter prevents IP blocking from retailers (Max 2 requests per minute).
- **Caching & History:** Uses MongoDB to cache search results to speed up repeated queries and logs search history.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Vanilla CSS (Custom Design Tokens, Flexbox/Grid)

**Backend:**
- Node.js & Express.js
- Cheerio (HTML Parsing)
- Axios (HTTP Requests)
- MongoDB & Mongoose (Database & Caching)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/) installed on your machine. Ensure your local MongoDB server is running.

### 1. Backend Setup

1. Open your terminal in the root directory of the project.
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (if not already present) and add your environment variables. E.g.:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/smartcartcompare
   ```
4. Start the backend server:
   ```bash
   npm start
   ```
   *The server will run on http://localhost:3000*

### 2. Frontend Setup

1. Open a new terminal tab and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web app will launch and run locally (usually on http://localhost:5173).*

## ⚠️ Disclaimer

This project relies on web scraping. Retailers like Amazon and Flipkart frequently update their HTML structures and aggressively block bot traffic. If you encounter empty results or 503 errors, the retailer has likely updated their selectors or temporarily blocked your IP. 
