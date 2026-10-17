const { generateBattleCommentary } = require('../utils/aiCommentary');
const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const { COUNTRIES_POOL } = require('../data/countries');
const { resolveBattle, soldiersGained } = require('../utils/battle');
const { simulateNPCTurn } = require('../utils/npcAI');
const auth = require('../middleware/auth');

// CREATE A NEW GAME
router.post('/create', auth, async (req, res) => {
  try {
    const { playerCountry } = req.body;

    const playerCountryData = COUNTRIES_POOL.find(c => c.name === playerCountry);
    if (!playerCountryData) {
      return res.status(400).json({ message: 'Invalid country selection' });
    }

    const others = COUNTRIES_POOL.filter(c => c.name !== playerCountry);
    const shuffled = others.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 9);

    const countries = [
      {
        name: playerCountry,
        soldiers: playerCountryData.soldiers,
        owner: 'player',
        isPlayer: true
      },
      ...selected.map((c, i) => ({
        name: c.name,
        soldiers: c.soldiers,
        owner: `npc${i + 1}`,
        isPlayer: false
      }))
    ];

    // Starting bonus: +3 to player
    const playerCountryInGame = countries.find(c => c.isPlayer);
    playerCountryInGame.soldiers += 3;

    // Nerf strongest NPCs
    countries.forEach(c => {
      if (!c.isPlayer && c.soldiers > 5) {
        c.soldiers -= 1;
      }
    });

    // Player goes first
    const npcOrder = [
      'npc1', 'npc2', 'npc3', 'npc4', 'npc5',
      'npc6', 'npc7', 'npc8', 'npc9'
    ].sort(() => 0.5 - Math.random());

    const turnOrder = ['player', ...npcOrder];

    const game = new Game({
      userId: req.userId,
      playerCountry,
      countries,
      turnOrder,
      currentTurnIndex: 0,
      round: 1,
      status: 'active',
      battleLog: [`Game started! You chose ${playerCountry} with ${playerCountryInGame.soldiers} soldiers.`]
    });

    await game.save();
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET ALL GAMES
router.get('/', auth, async (req, res) => {
  try {
    const games = await Game.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ATTACK
router.post('/:gameId/attack', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { attackerCountry, defenderCountry } = req.body;

    const game = await Game.findOne({ _id: gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (game.status !== 'active') return res.status(400).json({ message: 'Game is not active' });

    const attacker = game.countries.find(c => c.name === attackerCountry);
    const defender = game.countries.find(c => c.name === defenderCountry);

    if (!attacker || !defender) {
      return res.status(400).json({ message: 'Country not found' });
    }

    const currentTurn = game.turnOrder[game.currentTurnIndex];
    if (currentTurn !== 'player') {
      return res.status(400).json({ message: 'It is not your turn' });
    }

    if (attacker.owner !== 'player') {
      return res.status(400).json({ message: 'You do not own this country' });
    }

    if (attacker.soldiers < 2) {
      return res.status(400).json({ message: 'You need at least 2 soldiers to attack' });
    }

    if (defender.owner === 'player') {
      return res.status(400).json({ message: 'You cannot attack your own country' });
    }

    const result = resolveBattle(attacker.soldiers, defender.soldiers);
    if (!result) {
      return res.status(400).json({ message: 'Cannot attack with current soldiers' });
    }

    attacker.soldiers -= result.attackerLosses;
    defender.soldiers -= result.defenderLosses;

    // Generate AI commentary
const commentary = await generateBattleCommentary({
  attackerName: attacker.name,
  defenderName: defender.name,
  attackerSoldiers: attacker.soldiers + result.attackerLosses,
  defenderSoldiers: defender.soldiers + result.defenderLosses,
  attackerRolls: result.attackerRolls,
  defenderRolls: result.defenderRolls,
  attackerLosses: result.attackerLosses,
  defenderLosses: result.defenderLosses,
  conquered: defender.soldiers <= 0
});

game.battleLog.push(commentary);

    let conquered = false;
    let gained = 0;

    if (defender.soldiers <= 0) {
      conquered = true;
      gained = soldiersGained(defender.soldiers + result.defenderLosses);

      defender.owner = 'player';
      defender.isPlayer = true;
      defender.soldiers = 1;

      attacker.soldiers += gained;

      game.battleLog.push(`🏆 ${defender.name} conquered! You gained ${gained} soldiers.`);

      const playerOwned = game.countries.filter(c => c.owner === 'player').length;
      if (playerOwned === game.countries.length) {
        game.status = 'won';
        game.battleLog.push(`🎉 VICTORY! You conquered the world!`);
      }
    }

    await game.save();

    res.json({
      game,
      battle: {
        attackerRolls: result.attackerRolls,
        defenderRolls: result.defenderRolls,
        attackerLosses: result.attackerLosses,
        defenderLosses: result.defenderLosses,
        pairs: result.pairs,
        conquered,
        soldiersGained: gained
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// END TURN (auto-plays NPC turns)
router.post('/:gameId/endTurn', auth, async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findOne({ _id: gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (game.status !== 'active') return res.status(400).json({ message: 'Game is not active' });

    game.currentTurnIndex++;

    let safety = 0;
    while (game.currentTurnIndex < game.turnOrder.length && safety < 20) {
      safety++;
      const currentPlayer = game.turnOrder[game.currentTurnIndex];

      if (currentPlayer === 'player') {
        break;
      }

      const npcLog = simulateNPCTurn(currentPlayer, game);
      game.battleLog.push(...npcLog);

      const playerOwned = game.countries.filter(c => c.owner === 'player').length;
      if (playerOwned === 0) {
        game.status = 'lost';
        game.battleLog.push(`💀 Game Over—you have been eliminated.`);
        await game.save();
        return res.json(game);
      }

      game.currentTurnIndex++;
    }

// Skip eliminated players
while (game.currentTurnIndex < game.turnOrder.length) {
  const currentPlayer = game.turnOrder[game.currentTurnIndex];
  const ownedCountries = game.countries.filter(c => c.owner === currentPlayer).length;
  
  if (ownedCountries === 0 && currentPlayer !== 'player') {
    // Skip eliminated NPC
    game.currentTurnIndex++;
  } else {
    break;
  }
}
    
    if (game.currentTurnIndex >= game.turnOrder.length) {
      game.currentTurnIndex = 0;
      game.round++;

      game.countries.forEach(country => {
        country.soldiers += 2;
      });

      game.battleLog.push(`📅 Round ${game.round} begins! All countries received 2 new soldiers.`);
    }

    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;