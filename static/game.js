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
        
        // Prevent bird from going off screen
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height - this.height) {
            gameOver();
        }
    },
    draw() {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
};

class Pipe {
    constructor() {
        this.width = 50;
        this.gap = 150;
        this.x = canvas.width;
        this.topHeight = Math.random() * (canvas.height - this.gap - 100) + 50;
        this.bottomY = this.topHeight + this.gap;
    }

    update() {
        this.x -= PIPE_SPEED;
    }

    draw() {
        ctx.fillStyle = 'green';
        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom pipe
        ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY);
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
            score++;
        }
        // Check for collisions
        else if (pipes[i].collidesWith(bird)) {
            gameOver();
        }
    }

    // Draw everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bird.draw();
    pipes.forEach(pipe => pipe.draw());

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Wynik: ${score}`, 10, 30);

    frameCount++;
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

async function saveScore() {
    try {
        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: playerName,
                score: score
            })
        });
        if (response.ok) {
            loadHighScores();
        }
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

async function loadHighScores() {
    try {
        const response = await fetch('/api/highscores');
        const scores = await response.json();
        const highscoresDiv = document.getElementById('highscores');
        highscoresDiv.innerHTML = scores.map((score, index) => 
            `<div>${index + 1}. ${score.player_name}: ${score.score}</div>`
        ).join('');
    } catch (error) {
        console.error('Error loading highscores:', error);
    }
}
