const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const API = '/api/game';

let currentGame = null;
let selectedAttacker = null;

if (!token) {
    window.location.href = '/';
} else {
    document.body.classList.add('game-active');
    document.getElementById('player-info').innerText = `Commander ${username}`;
    loadGame();
}

// 1. Load the current game (or create one)
async function loadGame() {
    try {
        const res = await fetch(API, { headers: { 'Authorization': `Bearer ${token}` } });
        const games = await res.json();
        
        // Find the most recent active game
        const activeGame = games.find(g => g.status === 'active');
        
        if (activeGame) {
            currentGame = activeGame;
            renderGame();
        } else {
            createNewGame();
        }
    } catch (err) {
        document.getElementById('battle-log').innerHTML = `<p style="color:red;">Error loading game. Server might be waking up.</p>`;
    }
}

// 2. Render the game board
function renderGame() {
    const grid = document.getElementById('countries-grid');
    grid.innerHTML = '';
    
    // Render countries
    currentGame.countries.forEach(country => {
        const card = document.createElement('div');
        card.className = `country-card ${country.isPlayer ? 'player-owned' : ''}`;
        
        // Highlight if selected
        if (selectedAttacker === country.name) card.classList.add('selected');
        
        // Click to select as attacker (only if player owns it)
        if (country.isPlayer) {
            card.onclick = () => { selectAttacker(country.name); };
        } else {
            // Click to select as defender (if we already selected an attacker)
            card.onclick = () => { selectDefender(country.name); };
        }

        card.innerHTML = `
            <div class="country-name">${country.name}</div>
            <div class="country-soldiers">${country.soldiers} 🪖</div>
            <div class="owner-badge" style="${country.isPlayer ? 'background:#4CAF50;' : ''}">
                ${country.isPlayer ? 'YOURS' : country.owner.toUpperCase()}
            </div>
        `;
        grid.appendChild(card);
    });

    // Render Battle Log
    const logContainer = document.getElementById('battle-log');
    logContainer.innerHTML = '';
    // Show most recent first
    [...currentGame.battleLog].reverse().forEach(log => {
        const p = document.createElement('p');
        p.innerText = log;
        logContainer.appendChild(p);
    });

    // Update Button States
    updateUI();
}

// 3. Selection Logic
function selectAttacker(name) {
    selectedAttacker = name;
    renderGame();
    document.getElementById('battle-log').innerHTML += `<p style="color:#4CAF50">Selected attacker: ${name}</p>`;
}

function selectDefender(name) {
    if (!selectedAttacker) {
        alert("Select one of YOUR countries to attack with first!");
        return;
    }
    
    // Check if it's the player's turn
    const currentTurn = currentGame.turnOrder[currentGame.currentTurnIndex];
    if (currentTurn !== 'player') {
        alert("It's not your turn! Click 'End Turn' to let the NPCs play.");
        return;
    }

    executeAttack(selectedAttacker, name);
}

function updateUI() {
    const attackBtn = document.getElementById('attack-btn');
    if (selectedAttacker) {
        attackBtn.disabled = false;
        attackBtn.innerText = `⚔️ Attack (With ${selectedAttacker})`;
    } else {
        attackBtn.disabled = true;
        attackBtn.innerText = `⚔️ Select Your Country First`;
    }
}

// 4. Attack Action
async function executeAttack(attacker = selectedAttacker, defender = null) {
    if (!defender) {
        alert("Click an enemy country on the board to attack it!");
        return;
    }
    
    try {
        document.getElementById('battle-log').innerHTML = `<p>Rolling dice...</p>`;
        const res = await fetch(`${API}/${currentGame._id}/attack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ attackerCountry: attacker, defenderCountry: defender })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            currentGame = data.game;
            selectedAttacker = null; // Reset selection
            renderGame();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error executing attack.");
    }
}

// 5. End Turn
async function endTurn() {
    try {
        document.getElementById('battle-log').innerHTML = `<p>Simulating NPC turns... please wait.</p>`;
        const res = await fetch(`${API}/${currentGame._id}/endTurn`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok) {
            currentGame = data;
            selectedAttacker = null;
            renderGame();
        }
    } catch (err) {
        alert("Error ending turn.");
    }
}

// 6. Create New Game
async function createNewGame() {
    const country = prompt("Enter a country to start with (e.g., South Africa, India, China, Brazil):", "South Africa");
    if (!country) return;

    try {
        const res = await fetch(`${API}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ playerCountry: country })
        });
        
        const data = await res.json();
        if (res.ok) {
            currentGame = data;
            selectedAttacker = null;
            renderGame();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error creating game.");
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}