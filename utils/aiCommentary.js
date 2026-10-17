const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(apiKey);

async function generateBattleCommentary(battleData) {
  const { attackerName, defenderName, attackerSoldiers, defenderSoldiers, 
          attackerRolls, defenderRolls, attackerLosses, defenderLosses, conquered } = battleData;

  const prompt = `You are a dramatic war correspondent covering a geopolitical battle. 
Write ONE short, exciting paragraph (2-3 sentences) describing this battle. 
Use vivid language, mention the dice rolls as if they were combat maneuvers, 
and sound like a sports commentator meets a war reporter.

Battle details:
- Attacker: ${attackerName} (${attackerSoldiers} soldiers)
- Defender: ${defenderName} (${defenderSoldiers} soldiers)
- Attacker rolls: ${attackerRolls.join(', ')}
- Defender rolls: ${defenderRolls.join(', ')}
- Attacker losses: ${attackerLosses}
- Defender losses: ${defenderLosses}
- Result: ${conquered ? `${attackerName} CONQUERED ${defenderName}!` : 'Battle continues'}

Write the commentary now. Keep it under 60 words. Be dramatic and fun!`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return '🎙️ ' + response.text().trim();
  } catch (error) {
    console.error('AI Commentary Error:', error.message);
    // Fallback if AI fails (like an invalid API key)
    return `⚔️ ${attackerName} clashed with ${defenderName}! Rolls: ${attackerRolls.join(',')} vs ${defenderRolls.join(',')}. Losses: ${attackerLosses} vs ${defenderLosses}.`;
  }
}

// CRITICAL: This line must be here!
module.exports = { generateBattleCommentary };