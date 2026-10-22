// Start background music on first click
document.addEventListener('click', function startMusic() {
    const music = document.getElementById('bg-music');
    if (music && music.paused) {
        music.volume = 0.15; // Set to low volume (15%)
        music.play().catch(e => console.log("Audio waiting for interaction"));
    }
    // Remove the listener after the first click so it doesn't keep triggering
    document.removeEventListener('click', startMusic);
});