# Geopolitics Game - UCT INF4001N Entrance Exam

## Live URL
https://geopolitics-game.onrender.com

## Tech Stack
- Node.js, Express
- MongoDB Atlas (NoSQL)
- Google Gemini AI (for battle commentary)
- JWT Authentication

## How to Run Locally
1. Clone the repository.
2. Run `npm install`.
3. Create a `.env` file with MONGODB_URI, JWT_SECRET, and GEMINI_API_KEY.
4. Run `node server.js`.

## Test Credentials
- Username: jaydee
- Password: test1234

## Database Access
The database is hosted on MongoDB Atlas (Cluster: geopolitics). 

As requested in the brief, I have created specific database users for the UCT graders. You can use any of the following credentials to connect to the database:

**Option 1:**
- Username: `ammarcanani_gmail_com`
- Password: `UctGrader2026`

**Option 2:**
- Username: `mc_tanner_uct_ac_za`
- Password: `UctGrader2026`

**Option 3:**
- Username: `ridewaan_hanslo_uct_ac_za`
- Password: `UctGrader2026`

*(Note: MongoDB does not allow special characters like '@' or '.' in usernames, which is why the emails are formatted with underscores. The connection string is: `mongodb+srv://<username>:UctGrader2026@jaydee.msidnyb.mongodb.net/geopolitics`)*