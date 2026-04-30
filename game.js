// Geometry Dash Style - Tree Jump Game

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game States
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Characters (Geometry Dash style)
const CHARACTERS = ['🌳', '🦌', '🐿️', '🦅', '🦝', '🐰', '🦊', '🐢', '🦗', '🦋'];
const CHARACTER_COLORS = ['#00FF00', '#FF1493', '#FFD700', '#00BFFF', '#FF6347', '#32CD32', '#FF8C00', '#9370DB', '#20B2AA', '#FF69B4'];

// Game Variables
let gameState = GameState.MENU;
let selectedCharacter = 0;
let currentLevel = 1;
let score = 0;
let coinsCollected = 0;

// Player Object - Geometry Dash Style
const player = {
    x: 80,
    y: 0,
    width: 35,
    height: 35,
    velocityY: 0,
    velocityX: 10,
    jumping: false,
    grounded: false,
    color: CHARACTER_COLORS[0],
    rotation: 0,
    isFlipped: false,
    jumpCount: 0
};

// Geometry Dash Physics
const gravity = 0.7;
const jumpPower = -16;
const maxVelocity = 20;
const groundLevel = canvas.height - 80;

// Game Objects
let obstacles = [];
let coins = [];
let particles = [];
let goalReached = false;
let gameOverTriggered = false;
let cameraX = 0;

// Background grid for Geometry Dash style
function drawBackground() {
    // Dark background
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    for (let x = -cameraX % gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Venom glow gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(153, 0, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(102, 0, 204, 0.05)');
    gradient.addColorStop(1, 'rgba(153, 0, 255, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Particle class
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1;
        this.color = color;
        this.size = 6 + Math.random() * 8;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += gravity;
        this.life -= 0.02;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x - cameraX, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 4 + Math.random() * 4;
        particles.push(new Particle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 6,
            color
        ));
    }
}

// Geometry Dash Style Obstacle
class Obstacle {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'block', 'spike', 'platform'
        this.color = this.getColor();
        this.rotation = 0;
    }

    getColor() {
        const colors = {
            'block': '#FF1744',
            'spike': '#00FF00',
            'platform': '#FFD700'
        };
        return colors[this.type] || '#FF1744';
    }

    update() {
        this.x -= player.velocityX;
        this.rotation += 0.02;
    }

    draw() {
        const screenX = this.x - cameraX;

        if (this.type === 'spike') {
            // Floating spike hazard
            ctx.fillStyle = '#00FF00';
            ctx.globalAlpha = 0.9;
            
            // Triangle spike
            ctx.beginPath();
            ctx.moveTo(screenX + this.width / 2, this.y - this.height);
            ctx.lineTo(screenX, this.y);
            ctx.lineTo(screenX + this.width, this.y);
            ctx.closePath();
            ctx.fill();

            // Glow
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;

        } else if (this.type === 'platform') {
            // Platform block
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(screenX, this.y, this.width, this.height);
            
            // Border
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, this.y, this.width, this.height);

            // Pattern
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < this.width; i += 10) {
                ctx.fillRect(screenX + i, this.y + 5, 4, 4);
            }

        } else {
            // Regular block obstacle
            ctx.fillStyle = '#FF1744';
            ctx.fillRect(screenX, this.y, this.width, this.height);
            
            // Border
            ctx.strokeStyle = '#FF6B6B';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, this.y, this.width, this.height);

            // X pattern on block
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(screenX, this.y);
            ctx.lineTo(screenX + this.width, this.y + this.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX + this.width, this.y);
            ctx.lineTo(screenX, this.y + this.height);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    isColliding(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
}

// Coin - Geometry Dash style
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.rotation = 0;
        this.collected = false;
    }

    update() {
        this.x -= player.velocityX;
        this.rotation += 0.2;
    }

    draw() {
        const screenX = this.x - cameraX;
        
        ctx.save();
        ctx.translate(screenX + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Coin glow
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin shine
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(-4, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    isColliding(rect) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const distance = Math.sqrt(
            Math.pow(centerX - (rect.x + rect.width / 2), 2) +
            Math.pow(centerY - (rect.y + rect.height / 2), 2)
        );
        return distance < 25;
    }
}

// Goal - Geometry Dash style
class Goal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.rotation = 0;
        this.scale = 1;
    }

    update() {
        this.x -= player.velocityX;
        this.rotation += 0.08;
        this.scale = 1 + Math.sin(this.rotation) * 0.15;
    }

    draw() {
        const screenX = this.x - cameraX;
        
        ctx.save();
        ctx.translate(screenX + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.scale, this.scale);
        
        // Outer glow
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // Flag circle
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = '#00AA00';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Checkmark
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-3, 8);
        ctx.lineTo(10, -8);
        ctx.stroke();
        
        ctx.restore();
    }

    isColliding(rect) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const distance = Math.sqrt(
            Math.pow(centerX - (rect.x + rect.width / 2), 2) +
            Math.pow(centerY - (rect.y + rect.height / 2), 2)
        );
        return distance < 35;
    }
}

let goal = null;

// Initialize level - Geometry Dash style
function initializeLevel() {
    obstacles = [];
    coins = [];
    particles = [];
    goalReached = false;
    gameOverTriggered = false;
    
    player.x = 100;
    player.y = groundLevel - player.height;
    player.velocityY = 0;
    player.jumping = false;
    player.grounded = true;
    player.color = CHARACTER_COLORS[selectedCharacter];
    cameraX = 0;
    
    // Difficulty scaling
    const difficulty = Math.min(currentLevel / 50, 1);
    const speed = 10 + difficulty * 4;
    player.velocityX = speed;
    
    // Generate Geometry Dash style levels
    let distance = canvas.width + 200;
    const baseGap = 200 - difficulty * 80;
    
    for (let i = 0; i < 150; i++) {
        distance += baseGap + Math.random() * 120 - 60 * difficulty;
        
        // Variety of obstacles
        const obstacleType = Math.random();
        
        if (obstacleType < 0.5) {
            // Ground blocks
            obstacles.push(new Obstacle(distance, groundLevel, 40, 40, 'block'));
        } else if (obstacleType < 0.75) {
            // Spike hazards
            const spikeY = groundLevel - 60 - Math.random() * 100;
            obstacles.push(new Obstacle(distance, spikeY, 30, 40, 'spike'));
        } else {
            // Platform blocks
            obstacles.push(new Obstacle(distance, groundLevel - 60, 50, 20, 'platform'));
        }
        
        // Coins along the way
        if (Math.random() > 0.6) {
            coins.push(new Coin(distance + 20, groundLevel - 100));
        }
    }
    
    // Add goal
    goal = new Goal(distance + 150, groundLevel - 80);
    
    // Update HUD
    document.getElementById('levelDisplay').textContent = currentLevel;
    document.getElementById('scoreDisplay').textContent = score;
    document.getElementById('charDisplay').textContent = CHARACTERS[selectedCharacter];
}

// Input handling
let inputActive = false;
function handleInput() {
    if (gameState === GameState.PLAYING && player.grounded && !inputActive) {
        player.velocityY = jumpPower;
        player.jumping = true;
        player.grounded = false;
        inputActive = true;
        createParticles(player.x + player.width / 2, player.y + player.height, player.color, 8);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    }
});

document.addEventListener('keyup', () => {
    inputActive = false;
});

canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
});
canvas.addEventListener('touchend', () => {
    inputActive = false;
});

// Update player with Geometry Dash physics
function updatePlayer() {
    if (gameState !== GameState.PLAYING) return;
    
    // Apply gravity
    player.velocityY += gravity;
    
    // Cap velocity
    if (player.velocityY > maxVelocity) {
        player.velocityY = maxVelocity;
    }
    
    player.y += player.velocityY;
    
    // Ground collision
    if (player.y + player.height >= groundLevel) {
        player.y = groundLevel - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.jumping = false;
    } else {
        player.grounded = false;
    }
    
    // Camera follow
    cameraX = player.x - 150;
    if (cameraX < 0) cameraX = 0;
    
    // Out of bounds
    if (player.y > canvas.height + 100) {
        triggerGameOver();
        return;
    }
    
    // Obstacle collisions
    for (let obstacle of obstacles) {
        if (obstacle.isColliding(player)) {
            triggerGameOver();
            return;
        }
    }
    
    // Coin collisions
    for (let i = coins.length - 1; i >= 0; i--) {
        if (coins[i].isColliding(player) && !coins[i].collected) {
            coins[i].collected = true;
            score += 100;
            coinsCollected++;
            createParticles(coins[i].x, coins[i].y, '#FFD700', 12);
            coins.splice(i, 1);
        }
    }
    
    // Goal collision
    if (goal && goal.isColliding(player)) {
        goalReached = true;
        createParticles(goal.x, goal.y, '#00FF00', 20);
        setTimeout(() => {
            currentLevel++;
            initializeLevel();
        }, 500);
    }
}

// Draw player - Geometry Dash style
function drawPlayer() {
    const screenX = player.x - cameraX;
    
    ctx.save();
    ctx.translate(screenX + player.width / 2, player.y + player.height / 2);
    
    // Character shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, player.height / 2 + 10, player.width + 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Character glow
    ctx.fillStyle = player.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, player.width / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Character emoji
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CHARACTERS[selectedCharacter], 0, 0);
    
    ctx.restore();
}

// Draw ground
function drawGround() {
    const groundGradient = ctx.createLinearGradient(0, groundLevel, 0, canvas.height);
    groundGradient.addColorStop(0, '#1a1a2e');
    groundGradient.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundLevel, canvas.width, canvas.height - groundLevel);
    
    // Ground line
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundLevel);
    ctx.lineTo(canvas.width, groundLevel);
    ctx.stroke();
    
    // Ground pattern
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    for (let i = -cameraX; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, groundLevel);
        ctx.lineTo(i + 15, groundLevel + 15);
        ctx.stroke();
    }
}

// Trigger game over
function triggerGameOver() {
    if (gameOverTriggered) return;
    gameOverTriggered = true;
    gameState = GameState.GAME_OVER;
    
    document.getElementById('finalLevel').textContent = currentLevel;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('totalCoins').textContent = coinsCollected;
    document.getElementById('gameOverScreen').classList.add('show');
}

// Game loop
function gameLoop() {
    // Draw background
    drawBackground();
    
    if (gameState === GameState.PLAYING) {
        // Update game objects
        updatePlayer();
        
        for (let obstacle of obstacles) {
            obstacle.update();
        }
        
        for (let coin of coins) {
            coin.update();
        }
        
        if (goal) {
            goal.update();
        }
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }
        
        // Draw game objects
        for (let obstacle of obstacles) {
            obstacle.draw();
        }
        
        for (let coin of coins) {
            coin.draw();
        }
        
        if (goal) {
            goal.draw();
        }
    }
    
    // Draw ground
    drawGround();
    
    // Draw particles
    for (let particle of particles) {
        particle.draw();
    }
    
    // Draw player
    drawPlayer();
    
    requestAnimationFrame(gameLoop);
}

// Character selection
function initializeMenu() {
    const characterSelect = document.getElementById('characterSelect');
    characterSelect.innerHTML = '';
    
    CHARACTERS.forEach((char, index) => {
        const btn = document.createElement('button');
        btn.className = 'character-btn';
        if (index === 0) btn.classList.add('selected');
        btn.textContent = char;
        btn.onclick = () => {
            document.querySelectorAll('.character-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCharacter = index;
        };
        characterSelect.appendChild(btn);
    });
}

// UI Event listeners
document.getElementById('startBtn').addEventListener('click', () => {
    gameState = GameState.PLAYING;
    document.getElementById('menu').classList.add('hidden');
    initializeLevel();
});

document.getElementById('restartBtn').addEventListener('click', () => {
    gameState = GameState.PLAYING;
    currentLevel = 1;
    score = 0;
    coinsCollected = 0;
    document.getElementById('gameOverScreen').classList.remove('show');
    initializeLevel();
});

document.getElementById('menuBtn').addEventListener('click', () => {
    gameState = GameState.MENU;
    currentLevel = 1;
    score = 0;
    coinsCollected = 0;
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('menu').classList.remove('hidden');
    initializeMenu();
});

// Start the game
initializeMenu();
gameLoop();
