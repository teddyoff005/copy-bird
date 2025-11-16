const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let bird;
let pipes;
let score;
let highScore = 0;
let gameOver;
let gameStarted;
let isPaused;
let frame;
let grassOffset = 0;

// --- Scenery ---
let clouds = [];
let stars = [];
const numClouds = 10;
const numStars = 100;
// ---------------

// --- Bird Color Feature ---
const birdThemes = [
    { body: 'yellow', wing: '#FFC300', beak: '#F9A602' },
    { body: '#E74C3C', wing: '#C0392B', beak: '#A93226' }, // Red
    { body: '#3498DB', wing: '#2980B9', beak: '#2471A3' },  // Blue
    { body: '#27AE60', wing: '#229954', beak: '#1E8449' },  // Green
    { body: '#8E44AD', wing: '#7D3C98', beak: '#6C3483' },  // Purple
    { body: '#E67E22', wing: '#D35400', beak: '#BA4A00' }   // Orange
];
let currentThemeIndex = 0;
let changeColorButton;
// -----------------------------

// --- Day/Night Cycle Feature ---
const dayColor = { r: 112, g: 197, b: 206 };
const nightColor = { r: 25, g: 25, b: 112 };
let currentColor = { ...dayColor };
let targetColor = { ...dayColor };
const colorTransitionSpeed = 0.01;
let scoreForNextCycle = 10;
let isDay = true;
// -----------------------------

// Game constants
let birdX;
let gravity;
let lift;
let pipeWidth;
let pipeGap;
let pipeFrequency;
let groundHeight;
let birdRadius;

// Bird object
function Bird() {
    this.y = canvas.height / 2;
    this.velocity = 0;
    this.rotation = 0;

    this.show = function(frame) {
        const theme = birdThemes[currentThemeIndex];
        ctx.save();
        ctx.translate(birdX, this.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = theme.body;
        ctx.beginPath();
        ctx.arc(0, 0, birdRadius, 0, 2 * Math.PI);
        ctx.fill();

        const wingFlapSpeed = 10;
        const wingAngle = Math.sin(frame / wingFlapSpeed) * (Math.PI / 6);
        ctx.fillStyle = theme.wing;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, birdRadius, wingAngle, Math.PI - wingAngle, false);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(birdRadius / 2, -birdRadius / 3, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = theme.beak;
        ctx.beginPath();
        ctx.moveTo(birdRadius - 5, 0);
        ctx.lineTo(birdRadius + 10, -5);
        ctx.lineTo(birdRadius + 10, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    this.update = function() {
        if (!gameStarted) return;

        this.velocity += gravity;
        this.y += this.velocity;

        if (this.velocity < 0) {
            this.rotation = -Math.PI / 6;
        } else {
            this.rotation = Math.min(Math.PI / 2, this.rotation + 0.1);
        }

        if (this.y - birdRadius < 0) {
            this.y = birdRadius;
            gameOver = true;
        }
    }

    this.up = function() {
        this.velocity = lift;
        this.rotation = -Math.PI / 6;
    }
}

// Pipe object
function Pipe(x) {
    this.x = x;
    const minTop = canvas.height * 0.1;
    const maxTop = canvas.height * 0.4;
    this.top = Math.random() * (maxTop - minTop) + minTop;
    this.bottom = this.top + pipeGap;
    this.passed = false;

    this.show = function() {
        ctx.fillStyle = '#008000';
        ctx.fillRect(this.x, 0, pipeWidth, this.top);
        ctx.fillRect(this.x, this.bottom, pipeWidth, canvas.height - this.bottom - groundHeight);
        ctx.fillStyle = '#006400';
        ctx.fillRect(this.x, 0, 10, this.top);
        ctx.fillRect(this.x + pipeWidth - 10, 0, 10, this.top);
        ctx.fillRect(this.x, this.bottom, 10, canvas.height - this.bottom - groundHeight);
        ctx.fillRect(this.x + pipeWidth - 10, this.bottom, 10, canvas.height - this.bottom - groundHeight);
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(this.x + 10, this.top - 15, pipeWidth - 20, 15);
        ctx.fillRect(this.x + 10, this.bottom, pipeWidth - 20, 15);
    }

    this.update = function() {
        this.x -= 1.5;
    }

    this.hits = function(bird) {
        if (bird.y - birdRadius < this.top || bird.y + birdRadius > this.bottom) {
            if (birdX + birdRadius > this.x && birdX - birdRadius < this.x + pipeWidth) {
                return true;
            }
        }
        return false;
    }
}

function createScenery() {
    clouds = [];
    stars = [];
    for (let i = 0; i < numClouds; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5,
            size: Math.random() * 20 + 15
        });
    }
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1
        });
    }
}

function setup() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    birdX = canvas.width / 4;
    gravity = 0.15;
    lift = -5;
    pipeWidth = 65;
    pipeGap = 240;
    pipeFrequency = 120;
    groundHeight = canvas.height * 0.1;
    birdRadius = 20;

    const savedThemeIndex = localStorage.getItem('copyBirdThemeIndex');
    if (savedThemeIndex) {
        currentThemeIndex = parseInt(savedThemeIndex, 10);
    }

    const savedHighScore = localStorage.getItem('copyBirdHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore, 10);
    }

    bird = new Bird();
    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    isPaused = false;
    frame = 0;

    currentColor = { ...dayColor };
    targetColor = { ...dayColor };
    scoreForNextCycle = 10;
    isDay = true;

    createScenery();
    draw();
}

function draw() {
    // --- Update Logic ---
    if (gameStarted && !gameOver && !isPaused) {
        bird.update();
        if (bird.y + birdRadius > canvas.height - groundHeight) {
            gameOver = true;
        }

        if (frame % pipeFrequency === 0) {
            pipes.push(new Pipe(canvas.width));
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].update();
            if (pipes[i].hits(bird)) {
                gameOver = true;
            }
            if (!pipes[i].passed && pipes[i].x + pipeWidth < birdX) {
                pipes[i].passed = true;
                score++;
            }
            if (pipes[i].x < -pipeWidth) {
                pipes.splice(i, 1);
            }
        }
        grassOffset -= 1.5;
        if (grassOffset <= -7) {
            grassOffset = 0;
        }
        
        if (score >= scoreForNextCycle) {
            targetColor = isDay ? { ...nightColor } : { ...dayColor };
            isDay = !isDay;
            scoreForNextCycle += 10;
        }

        currentColor.r += (targetColor.r - currentColor.r) * colorTransitionSpeed;
        currentColor.g += (targetColor.g - currentColor.g) * colorTransitionSpeed;
        currentColor.b += (targetColor.b - currentColor.b) * colorTransitionSpeed;

        // Update scenery
        clouds.forEach(cloud => {
            cloud.x -= 0.2;
            if (cloud.x + cloud.size * 2 < 0) {
                cloud.x = canvas.width + cloud.size * 2;
                cloud.y = Math.random() * canvas.height * 0.5;
            }
        });
        stars.forEach(star => {
            star.x -= 0.1;
            if (star.x < 0) {
                star.x = canvas.width;
                star.y = Math.random() * canvas.height;
            }
        });

        frame++;
    }

    // --- Drawing Logic ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgb(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars and Clouds with fade
    const nightAlpha = (currentColor.r - dayColor.r) / (nightColor.r - dayColor.r);
    
    ctx.globalAlpha = nightAlpha;
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1 - nightAlpha;
    ctx.fillStyle = 'white';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, 2 * Math.PI);
        ctx.arc(cloud.x + cloud.size * 0.8, cloud.y, cloud.size * 0.8, 0, 2 * Math.PI);
        ctx.arc(cloud.x - cloud.size * 0.8, cloud.y, cloud.size * 0.8, 0, 2 * Math.PI);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].show();
    }

    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
    const grassBladeWidth = 5;
    const grassBladeHeight = 15;
    ctx.fillStyle = '#7CFC00';
    for (let i = grassOffset; i < canvas.width; i += grassBladeWidth + 2) {
        ctx.fillRect(i, canvas.height - groundHeight - grassBladeHeight, grassBladeWidth, grassBladeHeight);
    }

    if (!gameStarted) {
        bird.y = (canvas.height / 2 - 50) + Math.sin(frame / 10) * 5;
        bird.rotation = 0;
    }
    bird.show(frame);

    // --- Overlay and UI Logic ---
    if (!gameStarted) {
        ctx.fillStyle = 'white';
        ctx.font = '25px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click or Press Space to Start', canvas.width / 2, canvas.height / 3);
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('High Score: ' + highScore, canvas.width - 20, 30);
        changeColorButton = { x: canvas.width / 2 - 75, y: bird.y + birdRadius + 20, width: 150, height: 40 };
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(changeColorButton.x, changeColorButton.y, changeColorButton.width, changeColorButton.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Change Color', canvas.width / 2, changeColorButton.y + 27);
    }

    if (gameStarted && !isPaused) {
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.textAlign = 'left';
        ctx.strokeText('Score: ' + score, canvas.width * 0.05, canvas.height * 0.05);
        ctx.fillText('Score: ' + score, canvas.width * 0.05, canvas.height * 0.05);
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
    }

    if (gameOver) {
        bird.y += bird.velocity;
        bird.velocity += gravity;
        bird.rotation = Math.min(Math.PI / 2, bird.rotation + 0.1);

        if (bird.y + birdRadius >= canvas.height - groundHeight) {
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('copyBirdHighScore', highScore);
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);
            ctx.font = '20px Arial';
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2);
            ctx.fillText('High Score: ' + highScore, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 80);
            return;
        }
    }

    requestAnimationFrame(draw);
}

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
    }
}

document.addEventListener('click', function(e) {
    if (gameOver) {
        if (bird.y + birdRadius >= canvas.height - groundHeight) {
            setup();
        }
        return;
    }
    if (isPaused) {
        isPaused = false;
        return;
    }

    if (!gameStarted) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (changeColorButton &&
            clickX > changeColorButton.x && clickX < changeColorButton.x + changeColorButton.width &&
            clickY > changeColorButton.y && clickY < changeColorButton.y + changeColorButton.height) {
            currentThemeIndex = (currentThemeIndex + 1) % birdThemes.length;
            localStorage.setItem('copyBirdThemeIndex', currentThemeIndex);
            return;
        }
    }
    
    if (!gameStarted) {
        startGame();
    }
    bird.up();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (gameStarted && !gameOver) {
            isPaused = !isPaused;
        }
    }

    if (e.code === 'Space') {
        if (gameOver) {
            if (bird.y + birdRadius >= canvas.height - groundHeight) {
                setup();
            }
            return;
        }
        if (isPaused) {
            isPaused = false;
            return;
        }
        if (!gameStarted) {
            startGame();
        }
        bird.up();
    }
});

setup();