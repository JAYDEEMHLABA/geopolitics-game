// Roll a single die (1-6)
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

// Roll multiple dice
function rollDice(count) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie());
  }
  return rolls;
}

// Resolve a single battle round
// Returns { attackerLosses, defenderLosses, attackerRolls, defenderRolls, pairs }
function resolveBattle(attackerSoldiers, defenderSoldiers) {
  // Attacker must leave 1 behind
  const attackerDiceCount = Math.min(attackerSoldiers - 1, defenderSoldiers);
  const defenderDiceCount = attackerDiceCount;
  
  if (attackerDiceCount < 1) {
    return null; // Can't attack
  }
  
  const attackerRolls = rollDice(attackerDiceCount);
  const defenderRolls = rollDice(defenderDiceCount);
  
  let attackerLosses = 0;
  let defenderLosses = 0;
  const pairs = [];
  
  for (let i = 0; i < attackerDiceCount; i++) {
    const a = attackerRolls[i];
    const d = defenderRolls[i];
    
    if (a > d) {
      defenderLosses++;
      pairs.push({ attacker: a, defender: d, winner: 'attacker' });
    } else if (d > a) {
      attackerLosses++;
      pairs.push({ attacker: a, defender: d, winner: 'defender' });
    } else {
      pairs.push({ attacker: a, defender: d, winner: 'tie' });
    }
  }
  
  return {
    attackerRolls,
    defenderRolls,
    attackerLosses,
    defenderLosses,
    pairs
  };
}

// Calculate soldiers gained from conquering
function soldiersGained(defenderSoldierValue) {
  return Math.max(2, Math.floor(defenderSoldierValue / 2));
}

module.exports = {
  rollDie,
  rollDice,
  resolveBattle,
  soldiersGained
};