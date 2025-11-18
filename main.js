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
const colorTransitionSpeed = 0.002;
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

        // Body with 3D effect
        const bodyGradient = ctx.createRadialGradient(0, 0, birdRadius / 4, 0, 0, birdRadius);
        bodyGradient.addColorStop(0, theme.wing);
        bodyGradient.addColorStop(1, theme.body);

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, birdRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Wing with flapping animation
        const wingFlapSpeed = 8;
        const wingAngle = Math.sin(frame / wingFlapSpeed) * (Math.PI / 8) - Math.PI / 16;
        ctx.fillStyle = theme.wing;
        ctx.beginPath();
        ctx.moveTo(-birdRadius * 0.7, 0); // Adjusted starting point
        ctx.quadraticCurveTo(-birdRadius * 0.5, -birdRadius * 1.2, 0, -birdRadius * 0.7); // Top curve
        ctx.quadraticCurveTo(birdRadius * 0.5, -birdRadius * 0.5, birdRadius * 0.7, 0); // Outer curve
        ctx.quadraticCurveTo(birdRadius * 0.5, birdRadius * 0.5, 0, birdRadius * 0.7); // Bottom curve
        ctx.quadraticCurveTo(-birdRadius * 0.5, birdRadius * 1.2, -birdRadius * 0.7, 0); // Inner curve
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(birdRadius * 0.4, -birdRadius * 0.3, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(birdRadius * 0.4 + 2, -birdRadius * 0.3, 2, 0, 2 * Math.PI);
        ctx.fill();

        // Beak
        ctx.fillStyle = theme.beak;
        ctx.beginPath();
        ctx.moveTo(birdRadius * 0.8, 0);
        ctx.lineTo(birdRadius + 10, -2);
        ctx.lineTo(birdRadius + 10, 2);
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
        // Pipe Body
        const pipeBodyGradient = ctx.createLinearGradient(this.x, 0, this.x + pipeWidth, 0);
        pipeBodyGradient.addColorStop(0, '#a9a9a9');
        pipeBodyGradient.addColorStop(0.5, '#696969');
        pipeBodyGradient.addColorStop(1, '#a9a9a9');
        ctx.fillStyle = pipeBodyGradient;
        ctx.fillRect(this.x, 0, pipeWidth, this.top);
        ctx.fillRect(this.x, this.bottom, pipeWidth, canvas.height - this.bottom - groundHeight);

        // Pipe Cap
        const pipeCapGradient = ctx.createLinearGradient(this.x, 0, this.x + pipeWidth, 0);
        pipeCapGradient.addColorStop(0, '#696969');
        pipeCapGradient.addColorStop(0.5, '#494949');
        pipeCapGradient.addColorStop(1, '#696969');
        ctx.fillStyle = pipeCapGradient;
        ctx.fillRect(this.x - 5, this.top - 25, pipeWidth + 10, 25);
        ctx.fillRect(this.x - 5, this.bottom, pipeWidth + 10, 25);

        // Highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 5, 0, 10, this.top);
        ctx.fillRect(this.x + 5, this.bottom, 10, canvas.height - this.bottom - groundHeight);
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
        const cloud = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5,
            parts: [],
            speed: Math.random() * 0.1 + 0.05 // Slower speed
        };
        const numParts = Math.floor(Math.random() * 5) + 4; // More parts for complex clouds
        for (let j = 0; j < numParts; j++) {
            cloud.parts.push({
                x: (Math.random() - 0.5) * 80, // Wider spread
                y: (Math.random() - 0.5) * 30, // Wider spread
                radiusX: Math.random() * 40 + 20, // Ellipse radius
                radiusY: Math.random() * 20 + 10, // Ellipse radius
                opacity: Math.random() * 0.5 + 0.3
            });
        }
        clouds.push(cloud);
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
    const spikeWidth = 10;
    const spikeHeight = 25;
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
        grassOffset -= 0.5;
        if (grassOffset <= -spikeWidth) {
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
            cloud.x -= cloud.speed;
            let rightmostPart = 0;
            cloud.parts.forEach(part => {
                rightmostPart = Math.max(rightmostPart, part.x + part.size);
            });
            if (cloud.x + rightmostPart < 0) {
                cloud.x = canvas.width + rightmostPart;
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

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const topColor = isDay ? `rgb(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)})` : `rgb(${Math.round(currentColor.r)}, ${Math.round(currentColor.g)}, ${Math.round(currentColor.b)})`;
    const bottomColor = isDay ? '#87CEEB' : '#4682B4';
    skyGradient.addColorStop(0, topColor);
    skyGradient.addColorStop(1, bottomColor);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars and Clouds with fade
    const nightAlpha = (currentColor.r - dayColor.r) / (nightColor.r - dayColor.r);
    
    ctx.globalAlpha = nightAlpha;
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (Math.sin(frame / 10 + star.x) * 0.5 + 0.5), 0, 2 * Math.PI);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1 - nightAlpha;
    clouds.forEach(cloud => {
        // Cloud Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        cloud.parts.forEach(part => {
            ctx.beginPath();
            ctx.ellipse(cloud.x + part.x + 5, cloud.y + part.y + 5, part.radiusX, part.radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        cloud.parts.forEach(part => {
            const gradient = ctx.createRadialGradient(
                cloud.x + part.x, cloud.y + part.y, Math.min(part.radiusX, part.radiusY) / 2,
                cloud.x + part.x, cloud.y + part.y, Math.max(part.radiusX, part.radiusY)
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${part.opacity})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, ${part.opacity * 0.7})`);
            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.ellipse(cloud.x + part.x, cloud.y + part.y, part.radiusX, part.radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    ctx.globalAlpha = 1.0;

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].show();
    }

    const groundGradient = ctx.createLinearGradient(0, canvas.height - groundHeight, 0, canvas.height);
    groundGradient.addColorStop(0, '#6B4F35');
    groundGradient.addColorStop(1, '#A07855');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

    // Spiky Grass
    for (let i = grassOffset; i < canvas.width + spikeWidth; i += spikeWidth / 4) { // Increased density
        const grassGradient = ctx.createLinearGradient(i, canvas.height - groundHeight, i, canvas.height - groundHeight - spikeHeight);
        grassGradient.addColorStop(0, '#008000'); // Darker green
        grassGradient.addColorStop(1, '#3CB371'); // Lighter green
        ctx.fillStyle = grassGradient;
        ctx.beginPath();
        ctx.moveTo(i - spikeWidth / 2, canvas.height - groundHeight);
        ctx.quadraticCurveTo(i, canvas.height - groundHeight - spikeHeight, i + spikeWidth / 2, canvas.height - groundHeight);
        ctx.closePath();
        ctx.fill();
    }

    bird.show(frame);

    if (!gameStarted) {
        // Title
        ctx.font = '80px "Arial Black", Gadget, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText('Copy Bird', canvas.width / 2, canvas.height / 4);
        ctx.fillText('Copy Bird', canvas.width / 2, canvas.height / 4);

        ctx.font = '25px Arial';
        ctx.fillStyle = 'white';
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
        ctx.font = '50px "Arial Black", Gadget, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(score, canvas.width / 2, 80);
        ctx.fillText(score, canvas.width / 2, 80);
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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '60px "Arial Black", Gadget, sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeText('Game Over', canvas.width / 2, canvas.height / 2 - 100);
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 100);

            ctx.font = '30px Arial';
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2);
            ctx.fillText('High Score: ' + highScore, canvas.width / 2, canvas.height / 2 + 50);

            ctx.font = '20px Arial';
            ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 120);
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