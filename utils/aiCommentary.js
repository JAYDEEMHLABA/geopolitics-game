const { resolveBattle, soldiersGained } = require('./battle');

// NPC personalities
const NPC_PERSONALITIES = {
  aggressive: { minSoldierAdvantage: 0, maxConquestsPerTurn: 2, maxAttacksPerTurn: 5 },
  cautious: { minSoldierAdvantage: 2, maxConquestsPerTurn: 1, maxAttacksPerTurn: 3 },
  opportunistic: { minSoldierAdvantage: 1, maxConquestsPerTurn: 1, maxAttacksPerTurn: 4 }
};

function getPersonality(npcId) {
  const hash = npcId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const keys = Object.keys(NPC_PERSONALITIES);
  return keys[hash % keys.length];
}

function decideNPCMove(npcId, countries) {
  const npcCountries = countries.filter(c => c.owner === npcId);
  if (npcCountries.length === 0) return null;

  const personality = NPC_PERSONALITIES[getPersonality(npcId)];

  const attacker = npcCountries.reduce((a, b) =>
    a.soldiers > b.soldiers ? a : b
  );

  if (attacker.soldiers < 3) return null;

  let enemies = countries.filter(c => c.owner !== npcId && c.soldiers >= 2);

  if (enemies.length === 0) {
    enemies = countries.filter(c => c.owner === 'player' && c.soldiers >= 1);
  }
  if (enemies.length === 0) return null;

  const target = enemies.reduce((a, b) => a.soldiers < b.soldiers ? a : b);
  const advantage = attacker.soldiers - target.soldiers;
  
  if (advantage < personality.minSoldierAdvantage) return null;

  return { attacker, target, personality };
}

function simulateNPCTurn(npcId, game) {
  const log = [];
  const npcCountries = game.countries.filter(c => c.owner === npcId);
  if (npcCountries.length === 0) return []; // Eliminated

  let conquestsThisTurn = 0;
  let attacksThisTurn = 0;
  const personality = NPC_PERSONALITIES[getPersonality(npcId)];

  while (attacksThisTurn < personality.maxAttacksPerTurn) {
    attacksThisTurn++;
    const move = decideNPCMove(npcId, game.countries);
    if (!move) {
      if (attacksThisTurn === 1) log.push(`🤖 ${npcId} chooses not to attack this turn.`);
      break;
    }

    const { attacker, target } = move;
    if (conquestsThisTurn >= personality.maxConquestsPerTurn) {
      log.push(`🤖 ${npcId} has conquered enough for this turn.`);
      break;
    }

    const result = resolveBattle(attacker.soldiers, target.soldiers);
    if (!result) break;

    attacker.soldiers -= result.attackerLosses;
    target.soldiers -= result.defenderLosses;

    // FAST LOG (No AI for NPCs to prevent timeout)
    log.push(`⚔️ ${attacker.name} attacked ${target.name}. Rolls: ${result.attackerRolls.join(',')} vs ${result.defenderRolls.join(',')}. Losses: ${result.attackerLosses} vs ${result.defenderLosses}.`);

    if (target.soldiers <= 0) {
      const gained = soldiersGained(target.soldiers + result.defenderLosses);
      target.owner = npcId;
      target.isPlayer = false;
      target.soldiers = 1;
      attacker.soldiers += gained;
      conquestsThisTurn++;
      log.push(`🏴 ${npcId} conquered ${target.name}!`);
    }

    if (attacker.soldiers < 2) break;
  }
  return log;
}

module.exports = { decideNPCMove, simulateNPCTurn };