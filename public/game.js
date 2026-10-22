const token = localStorage.getItem('token');
const bgMusic = document.getElementById('bg-music');
const attackSound = document.getElementById('attack-sound');

// Start music on load (set to a very low volume for war ambiance)
if (bgMusic) {
    bgMusic.volume = 0.1; // 10% volume for low background war song
    bgMusic.play().catch(e => {
        // Browsers block autoplay. We wait for the user to click the screen once.
        document.body.addEventListener('click', () => {
            bgMusic.play();
        }, { once: true });
    });
}
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
            // Play attack sound effect
    if (attackSound) {
        attackSound.currentTime = 0; // Reset sound to start
        attackSound.volume = 0.4; // Medium volume for the clash
        attackSound.play().catch(e => console.log("Audio play blocked"));
    }
        const res = await fetch(`${API}/${currentGame._id}/attack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ attackerCountry: attacker, defenderCountry: defender })
        });
        
        const data = await res.json();
        
                if (res.ok) {
            currentGame = data.game;
            selectedAttacker = null;
            
            // Check for WIN
            if (currentGame.status === 'won') {
                triggerVictory();
            } else if (currentGame.status === 'lost') {
                alert("💀 You have been eliminated! Better luck next time.");
                document.getElementById('battle-log').innerHTML += `<p style="color:red; font-weight:bold;">GAME OVER</p>`;
            }

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

            // Check for WIN or LOSS after NPCs play
            if (currentGame.status === 'won') {
                triggerVictory();
            } else if (currentGame.status === 'lost') {
                alert("💀 You have been eliminated by the NPCs!");
            }

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

function triggerVictory() {
    // 1. Play sound
    const winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); // A free victory sound
    winSound.play().catch(e => console.log("Audio blocked by browser"));
    
    // 2. Fire Confetti
    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    // 3. Show alert
    setTimeout(() => {
        alert("🏆 VICTORY! You have conquered the world! 🌍🎉");
    }, 500);
}