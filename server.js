require('dotenv').config();
process.env.MONGODB_URI = 'mongodb+srv://jaydeemhlaba10_db_user:f5ksVd1OOwKPZOCH@jaydee.msidnyb.mongodb.net/geopolitics?retryWrites=true&w=majority';
process.env.PORT = 3000;
process.env.JWT_SECRET = 'jaydee_uct_honours_2027_secret_key';

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));

// Test route
app.get('/', (req, res) => {
  res.send('Geopolitics Game Server is Running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});