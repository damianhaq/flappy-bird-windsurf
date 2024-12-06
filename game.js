let canvas, ctx, pipes = [], score = 0;
let playerName = '';
let gameLoop;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 120;
let frameCount = 0;

const bird = {
    x: 50,
    y: 300,
    velocity: 0,
    width: 30,
    height: 30,
    jump() {
        this.velocity = JUMP_FORCE;
    },
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height - this.height) {
            gameOver();
        }
    },
    draw() {
        // Bird body
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height/2, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.7, this.y + this.height * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.8, this.y + this.height * 0.5);
        ctx.lineTo(this.x + this.width * 1.2, this.y + this.height * 0.5);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.7);
        ctx.fill();
    }
};

class Pipe {
    constructor() {
        this.width = 50;
        this.gap = 150;
        this.x = canvas.width;
        this.topHeight = Math.random() * (canvas.height - this.gap - 100) + 50;
        this.bottomY = this.topHeight + this.gap;
        this.scored = false;
    }

    update() {
        this.x -= PIPE_SPEED;
        
        // Score point when passing pipe
        if (!this.scored && this.x + this.width < bird.x) {
            score++;
            this.scored = true;
        }
    }

    draw() {
        ctx.fillStyle = '#2ecc71';
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom pipe
        ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY);
        
        // Pipe caps
        ctx.fillStyle = '#27ae60';
        // Top cap
        ctx.fillRect(this.x - 5, this.topHeight - 20, this.width + 10, 20);
        // Bottom cap
        ctx.fillRect(this.x - 5, this.bottomY, this.width + 10, 20);
    }

    collidesWith(bird) {
        return (bird.x < this.x + this.width &&
                bird.x + bird.width > this.x &&
                (bird.y < this.topHeight || bird.y + bird.height > this.bottomY));
    }
}

function startGame() {
    playerName = document.getElementById('player-name').value;
    if (!playerName) {
        alert('Proszę wpisać imię!');
        return;
    }

    document.getElementById('player-form').classList.add('hidden');
    document.getElementById('gameCanvas').classList.remove('hidden');

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Reset game state
    bird.y = 300;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frameCount = 0;

    // Add event listeners
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            bird.jump();
            e.preventDefault();
        }
    });

    canvas.addEventListener('click', () => {
        bird.jump();
    });

    gameLoop = setInterval(update, 1000/60);
    loadHighScores();
}

function update() {
    // Update game state
    bird.update();
    
    // Spawn new pipes
    if (frameCount % PIPE_SPAWN_RATE === 0) {
        pipes.push(new Pipe());
    }

    // Update pipes and check collisions
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].update();

        // Remove pipes that are off screen
        if (pipes[i].x + pipes[i].width < 0) {
            pipes.splice(i, 1);
        }
        // Check for collisions
        else if (pipes[i].collidesWith(bird)) {
            gameOver();
            return;
        }
    }

    // Draw everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    ctx.fillStyle = 'white';
    drawCloud(50 + (frameCount % 100), 100);
    drawCloud(200 - (frameCount % 150), 150);
    drawCloud(350 + (frameCount % 120), 80);
    
    pipes.forEach(pipe => pipe.draw());
    bird.draw();

    // Draw score
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 24px Arial';
    ctx.strokeText(`Wynik: ${score}`, 10, 30);
    ctx.fillText(`Wynik: ${score}`, 10, 30);

    frameCount++;
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 10, 20, 0, Math.PI * 2);
    ctx.arc(x + 15, y + 10, 20, 0, Math.PI * 2);
    ctx.arc(x + 30, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

function gameOver() {
    clearInterval(gameLoop);
    saveScore();
    setTimeout(() => {
        alert(`Koniec gry! Twój wynik: ${score}`);
        document.getElementById('player-form').classList.remove('hidden');
        document.getElementById('gameCanvas').classList.add('hidden');
    }, 100);
}

function saveScore() {
    let scores = JSON.parse(localStorage.getItem('highScores') || '[]');
    scores.push({
        player_name: playerName,
        score: score,
        date: new Date().toISOString()
    });
    
    // Sort by score (descending) and keep only top 10
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    
    localStorage.setItem('highScores', JSON.stringify(scores));
    loadHighScores();
}

function loadHighScores() {
    const scores = JSON.parse(localStorage.getItem('highScores') || '[]');
    const highscoresDiv = document.getElementById('highscores');
    highscoresDiv.innerHTML = scores.map((score, index) => 
        `<div>${index + 1}. ${score.player_name}: ${score.score}</div>`
    ).join('');
}
