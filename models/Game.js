const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  soldiers: { type: Number, required: true, default: 1 },
  owner: { type: String, required: true },
  isPlayer: { type: Boolean, default: false }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerCountry: { type: String, required: true },
  countries: [countrySchema],
  turnOrder: [{ type: String }],
  currentTurnIndex: { type: Number, default: 0 },
  round: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'won', 'lost'], default: 'active' },
  battleLog: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);