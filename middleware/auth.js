const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('🔍 Auth header received:', authHeader);
  
  // Case-insensitive "Bearer " removal
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  console.log('🔍 Token extracted:', token ? token.substring(0, 20) + '...' : 'NONE');
  console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'UNDEFINED');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', decoded);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log('❌ Token error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};