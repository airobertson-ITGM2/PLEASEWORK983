// Tree Jump - Auto Running Platformer Game

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

// Characters
const CHARACTERS = ['🌳', '🦌', '🐿️', '🦅', '🦝', '🐰', '🦊', '🐢', '🦗', '🦋'];
const CHARACTER_COLORS = ['#2d5016', '#8b4513', '#ff6b35', '#ffd700', '#4a5568', '#f5deb3', '#ff6347', '#4682b4', '#6b4423', '#9370db'];

// Game Variables
let gameState = GameState.MENU;
let selectedCharacter = 0;
let currentLevel = 1;
let score = 0;
let coinsCollected = 0;

// Player Object
const player = {
    x: 100,
    y: 0,
    width: 30,
    height: 30,
    velocityY: 0,
    velocityX: 8,
    jumping: false,
    grounded: false,
    color: CHARACTER_COLORS[0]
};

// Physics
const gravity = 0.6;
const jumpPower = -15;
const groundLevel = canvas.height - 100;

// Obstacles and Collectibles
let obstacles = [];
let coins = [];
let particles = [];
let goalReached = false;
let gameOverTriggered = false;

// Cloud class for background
class Cloud {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80 + Math.random() * 40;
        this.height = 30 + Math.random() * 20;
        this.speed = 0.5 + Math.random() * 0.5;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.x = canvas.width;
        }
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.height, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.3, this.y - 10, this.height * 1.2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.6, this.y, this.height * 1.1, 0, Math.PI * 2);
        ctx.fill();
    }
}

let clouds = [];
function initializeClouds() {
    clouds = [];
    for (let i = 0; i < 5; i++) {
        clouds.push(new Cloud(Math.random() * canvas.width, 50 + Math.random() * 100));
    }
}
initializeClouds();

// Particle class
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1;
        this.color = color;
        this.size = 5 + Math.random() * 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3;
        this.life -= 0.02;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 3 + Math.random() * 3;
        particles.push(new Particle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 5,
            color
        ));
    }
}

// Obstacle class
class Obstacle {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'ground', 'air', 'spike'
        this.color = this.getRandomColor();
        this.rotation = Math.random() * Math.PI * 2;
    }

    getRandomColor() {
        const colors = ['#ff6b6b', '#ff8c42', '#ffa502', '#ff1744', '#d32f2f'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x -= player.velocityX;
    }

    draw() {
        if (this.type === 'ground') {
            // Ground obstacle
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, this.getDarkerColor(this.color));
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Spikes on top
            ctx.fillStyle = '#ffcc00';
            for (let i = 0; i < this.width; i += 15) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, this.y);
                ctx.lineTo(this.x + i + 7, this.y - 10);
                ctx.lineTo(this.x + i + 15, this.y);
                ctx.fill();
            }
        } else if (this.type === 'air') {
            // Flying obstacle
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Glow effect
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    getDarkerColor(color) {
        // Simple color darkening
        return color.replace(/ff/g, 'cc');
    }

    isColliding(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
}

// Coin class
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.rotation = 0;
        this.collected = false;
    }

    update() {
        this.x -= player.velocityX;
        this.rotation += 0.15;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Coin glow
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin shine
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, Math.PI * 2);
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
        return distance < 20;
    }
}

// Goal class
class Goal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.rotation = 0;
        this.scale = 1;
    }

    update() {
        this.x -= player.velocityX;
        this.rotation += 0.05;
        this.scale = 1 + Math.sin(this.rotation) * 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.scale, this.scale);
        
        // Glow
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Flag circle
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Checkmark
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-2, 6);
        ctx.lineTo(8, -6);
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
        return distance < 30;
    }
}

let goal = null;

// Initialize level
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
    
    // Generate level based on difficulty
    const difficulty = Math.min(currentLevel / 30, 1);
    const speed = 8 + difficulty * 3;
    player.velocityX = speed;
    
    // Generate obstacles and coins
    let obstacleDistance = canvas.width + 100;
    const baseGap = 150 - difficulty * 50;
    
    for (let i = 0; i < 100; i++) {
        obstacleDistance += baseGap + Math.random() * 100 - 50 * difficulty;
        
        const type = Math.random() > 0.6 ? 'air' : 'ground';
        const height = type === 'ground' ? 40 : 30;
        const width = type === 'ground' ? 50 : 30;
        const y = type === 'ground' ? groundLevel : groundLevel - 150 - Math.random() * 100;
        
        obstacles.push(new Obstacle(obstacleDistance, y, width, height, type));
        
        // Add coins randomly between obstacles
        if (Math.random() > 0.5) {
            coins.push(new Coin(obstacleDistance + width + 30, y - 40));
        }
    }
    
    // Add goal at the end
    goal = new Goal(obstacleDistance + 200, groundLevel - 60);
    
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
        createParticles(player.x + player.width / 2, player.y + player.height, player.color, 6);
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

// Update player
function updatePlayer() {
    if (gameState !== GameState.PLAYING) return;
    
    // Apply gravity
    player.velocityY += gravity;
    player.y += player.velocityY;
    
    // Check ground collision
    if (player.y + player.height >= groundLevel) {
        player.y = groundLevel - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.jumping = false;
    } else {
        player.grounded = false;
    }
    
    // Check if out of bounds (left side)
    if (player.x < -50) {
        triggerGameOver();
    }
    
    // Check obstacle collisions
    for (let obstacle of obstacles) {
        if (obstacle.isColliding(player)) {
            triggerGameOver();
            return;
        }
    }
    
    // Check coin collisions
    for (let i = coins.length - 1; i >= 0; i--) {
        if (coins[i].isColliding(player) && !coins[i].collected) {
            coins[i].collected = true;
            score += 100;
            coinsCollected++;
            createParticles(coins[i].x, coins[i].y, '#FFD700', 10);
            coins.splice(i, 1);
        }
    }
    
    // Check goal collision
    if (goal && goal.isColliding(player)) {
        goalReached = true;
        createParticles(goal.x, goal.y, '#4CAF50', 15);
        setTimeout(() => {
            currentLevel++;
            initializeLevel();
        }, 500);
    }
}

// Draw player
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, player.height / 2 + 10, player.width, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Character (emoji-based)
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CHARACTERS[selectedCharacter], 0, 0);
    
    ctx.restore();
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

// Draw ground
function drawGround() {
    const gradient = ctx.createLinearGradient(0, groundLevel, 0, canvas.height);
    gradient.addColorStop(0, '#2d5016');
    gradient.addColorStop(1, '#1a3009');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, groundLevel, canvas.width, canvas.height - groundLevel);
    
    // Grass pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, groundLevel);
        ctx.lineTo(i + 10, groundLevel - 5);
        ctx.stroke();
    }
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundLevel);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, groundLevel);
    
    // Update and draw clouds
    for (let cloud of clouds) {
        cloud.update();
        cloud.draw();
    }
    
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
        
        // Draw obstacles
        for (let obstacle of obstacles) {
            obstacle.draw();
        }
        
        // Draw coins
        for (let coin of coins) {
            coin.draw();
        }
        
        // Draw goal
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

// Event listeners for UI
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

// Initialize and start game
initializeMenu();
gameLoop();