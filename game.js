let canvas,
  ctx,
  pipes = [],
  score = 0;
let playerName = "";
let gameLoop;
let bird;

const GRAVITY = 0.35;
const JUMP_FORCE = -7;
const PIPE_SPEED = 1.5;
const PIPE_SPAWN_RATE = 150;
let frameCount = 0;

const clouds = [
  { x: 100, y: 100, speed: 0.5, size: 1 },
  { x: 300, y: 50, speed: 0.3, size: 0.7 },
  { x: 500, y: 150, speed: 0.4, size: 0.9 },
  { x: 700, y: 60, speed: 0.6, size: 0.6 },
  { x: 900, y: 120, speed: 0.35, size: 0.8 },
  { x: 350, y: 80, speed: 0.4, size: 0.8 },
];

class Bird {
  constructor() {
    this.x = 50;
    this.y = canvas.height / 2;
    this.velocity = 0;
    this.gravity = 0.6 * (canvas.height / 600); 
    this.lift = -10 * (canvas.height / 600); 
    this.size = Math.max(20, canvas.width / 20); 
  }

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;

    // Kolizja z podłożem
    if (this.y + this.size > canvas.height) {
      gameOver();
      return;
    }

    // Kolizja z górą
    if (this.y - this.size < 0) {
      this.y = this.size;
      this.velocity = 0;
    }
  }

  jump() {
    this.velocity = this.lift;
  }

  draw() {
    // Ciało ptaka
    ctx.fillStyle = "#f4d03f";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Dziób
    ctx.fillStyle = "#e67e22";
    ctx.beginPath();
    ctx.moveTo(this.x + this.size, this.y);
    ctx.lineTo(this.x + this.size + 10, this.y - 5);
    ctx.lineTo(this.x + this.size + 10, this.y + 5);
    ctx.closePath();
    ctx.fill();

    // Oko
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x + this.size/2, this.y - this.size/3, this.size/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Źrenica
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x + this.size/2, this.y - this.size/3, this.size/8, 0, Math.PI * 2);
    ctx.fill();

    // Skrzydło
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.ellipse(
      this.x - this.size/2,
      this.y,
      this.size/2,
      this.size,
      Math.PI/4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

let currentRanking = [];
let playerPosition = 0;
let lastRankingUpdate = 0;
const RANKING_UPDATE_INTERVAL = 5000; 

function updateRanking(force = false) {
  const now = Date.now();
  if (!force && now - lastRankingUpdate < RANKING_UPDATE_INTERVAL) {
    return; 
  }
  
  lastRankingUpdate = now;
  const dbRef = firebase.database().ref('scores');
  dbRef.orderByChild('score').limitToLast(10).on('value', (snapshot) => {
    currentRanking = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        currentRanking.unshift({
          name: childSnapshot.val().player_name,
          score: childSnapshot.val().score
        });
      });
    }

    localStorage.setItem('lastRanking', JSON.stringify({
      timestamp: now,
      data: currentRanking
    }));

    updateRankingDisplay();
  }, (error) => {
    console.error('Error fetching ranking:', error);
    const cachedRanking = localStorage.getItem('lastRanking');
    if (cachedRanking) {
      const parsed = JSON.parse(cachedRanking);
      currentRanking = parsed.data;
      updateRankingDisplay();
    } else {
      currentRanking = [];
      updateRankingDisplay();
    }
  });
}

function updateRankingDisplay() {
  const rankingList = document.getElementById('ranking-list');
  if (!rankingList) return;

  rankingList.innerHTML = '';
  currentRanking.forEach((entry, index) => {
    const rankingItem = document.createElement('div');
    rankingItem.className = 'ranking-item';
    if (entry.name === playerName) {
      rankingItem.classList.add('current-player');
      playerPosition = index + 1;
    }
    rankingItem.textContent = `${index + 1}. ${entry.name}: ${entry.score}`;
    rankingList.appendChild(rankingItem);
  });
}

function startGame() {
  const inputElement = document.getElementById("playerName");
  playerName = (inputElement ? inputElement.value : "") || localStorage.getItem("playerName") || "Anonymous";
  localStorage.setItem("playerName", playerName);

  const startScreen = document.getElementById("start-screen");
  if (startScreen) startScreen.style.display = "none";

  const gameOver = document.getElementById("game-over");
  if (gameOver) gameOver.style.display = "none";

  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");
  
  // Dodaj style do canvas
  canvas.style.border = "3px solid #2c3e50";
  canvas.style.borderRadius = "10px";
  canvas.style.display = "block";
  canvas.style.margin = "20px auto";
  canvas.style.maxWidth = "100%";
  canvas.style.touchAction = "none";
  
  function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      canvas.width = window.innerWidth - 20; 
      canvas.height = Math.min(window.innerHeight * 0.6, 600); 
    } else {
      canvas.width = 400;
      canvas.height = 600;
    }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  document.querySelector(".game-area").appendChild(canvas);

  canvas.addEventListener("click", () => bird.jump());
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    bird.jump();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      bird.jump();
    }
  });

  // Inicjalizacja ptaka po utworzeniu canvas
  bird = new Bird();
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frameCount = 0;

  gameLoop = setInterval(update, 1000 / 60);
  loadHighScores();
  updateRanking(); 
  syncPendingScores();
}

function update() {
  frameCount++;

  // Aktualizuj ptaka
  bird.update();
  
  // Jeśli ptak spadł na ziemię, nie kontynuuj aktualizacji
  if (bird.y + bird.size > canvas.height) {
    return;
  }

  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed;
    if (cloud.x + 100 < 0) {
      cloud.x = canvas.width + 50;
    }
  });

  if (frameCount % 150 === 0) {
    pipes.push(new Pipe());
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].update();

    if (pipes[i].x + pipes[i].width < 0) {
      pipes.splice(i, 1);
      continue;
    }

    if (pipes[i].collidesWith(bird)) {
      gameOver();
      return;
    }
  }

  // Draw everything
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#87CEEB");  // Jasne niebo na górze
  gradient.addColorStop(1, "#4CA1AF");  // Ciemniejsze na dole
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.size));

  // Draw pipes
  pipes.forEach((pipe) => pipe.draw());

  // Draw bird
  bird.draw();

  // Draw ground
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

  // Draw score
  ctx.fillStyle = "#2c3e50";
  ctx.font = "bold 24px 'Roboto'";
  ctx.fillText(`Score: ${score}`, 10, 30);
}

function drawCloud(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.arc(15, -10, 20, 0, Math.PI * 2);
  ctx.arc(15, 10, 20, 0, Math.PI * 2);
  ctx.arc(30, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function gameOver() {
  clearInterval(gameLoop);
  const gameOverScreen = document.getElementById("game-over");
  if (gameOverScreen) {
    gameOverScreen.style.display = "block";
    const finalScore = document.getElementById("final-score");
    if (finalScore) {
      finalScore.textContent = score;
    }
  }
  saveScore();
  loadHighScores();
}

function restartGame() {
  const gameOverScreen = document.getElementById("game-over");
  if (gameOverScreen) gameOverScreen.style.display = "none";
  
  startGame();
}

async function loadHighScores() {
  try {
    const cachedScores = localStorage.getItem('lastRanking');
    if (cachedScores) {
      const parsed = JSON.parse(cachedScores);
      const age = Date.now() - parsed.timestamp;
      
      if (age < RANKING_UPDATE_INTERVAL) {
        displayScores(parsed.data);
        return;
      }
    }

    if (database) {
      const snapshot = await database
        .ref("scores")
        .orderByChild("score")
        .limitToLast(10)
        .once("value");

      const scores = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          scores.unshift(childSnapshot.val());
        });
      }

      localStorage.setItem('lastRanking', JSON.stringify({
        timestamp: Date.now(),
        data: scores
      }));

      displayScores(scores);
    }
  } catch (error) {
    console.error("Error loading scores:", error);
    const cachedScores = localStorage.getItem('lastRanking');
    if (cachedScores) {
      const parsed = JSON.parse(cachedScores);
      displayScores(parsed.data);
    } else {
      displayScores([]);
    }
  }
}

function displayScores(scores) {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const scoresHTML = scores.length > 0 
    ? scores
        .map((score, index) => 
          `<div>${index + 1}. ${score.player_name}: ${score.score} ${score.timestamp ? `(${formatDate(score.timestamp)})` : ''}</div>`
        )
        .join("")
    : '<div>Brak wyników</div>';

  ['highscores', 'highscores-game-over'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = `<h3>Najlepsze wyniki</h3>${scoresHTML}`;
    }
  });
}

async function saveScore() {
  if (!playerName || score === 0) return;

  const scoreData = {
    player_name: playerName,
    score: score,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  try {
    const dbRef = firebase.database().ref('scores');
    
    const playerScores = await dbRef
      .orderByChild('player_name')
      .equalTo(playerName)
      .once('value');
    
    let updates = {};
    
    if (playerScores.exists()) {
      let highestScore = 0;
      let highestScoreKey = null;
      
      playerScores.forEach((childSnapshot) => {
        const existingScore = childSnapshot.val().score;
        if (existingScore > highestScore) {
          highestScore = existingScore;
          highestScoreKey = childSnapshot.key;
        }
      });

      if (score > highestScore) {
        if (highestScoreKey) {
          updates[`/scores/${highestScoreKey}`] = scoreData;
        } else {
          const newScoreRef = dbRef.push();
          updates[`/scores/${newScoreRef.key}`] = scoreData;
        }
      }
      
      playerScores.forEach((childSnapshot) => {
        if (childSnapshot.key !== highestScoreKey) {
          updates[`/scores/${childSnapshot.key}`] = null;
        }
      });
    } else {
      const newScoreRef = dbRef.push();
      updates[`/scores/${newScoreRef.key}`] = scoreData;
    }

    await database.ref().update(updates);
      
    const allScores = await dbRef
      .orderByChild('score')
      .once('value');
      
    if (allScores.exists()) {
      const scores = [];
      allScores.forEach((childSnapshot) => {
        scores.push({
          key: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      scores.sort((a, b) => b.score - a.score);

      if (scores.length > 100) {
        const deletions = {};
        scores.slice(100).forEach((score) => {
          deletions[`/scores/${score.key}`] = null;
        });
        await database.ref().update(deletions);
      }
    }

    updateRanking(true);
  } catch (error) {
    console.error('Error saving score:', error);
    const pendingScores = JSON.parse(localStorage.getItem('pendingScores') || '[]');
    pendingScores.push(scoreData);
    localStorage.setItem('pendingScores', JSON.stringify(pendingScores));
  }
}

function syncPendingScores() {
  const pendingScores = JSON.parse(localStorage.getItem('pendingScores') || '[]');
  if (pendingScores.length === 0) return;

  const dbRef = firebase.database().ref('scores');
  
  const promises = pendingScores.map(scoreData => 
    dbRef.push(scoreData)
      .then(() => true)
      .catch(() => false)
  );

  Promise.all(promises).then(results => {
    const successfulSaves = results.filter(result => result).length;
    if (successfulSaves === pendingScores.length) {
      localStorage.removeItem('pendingScores');
    } else {
      const remainingScores = pendingScores.filter((_, index) => !results[index]);
      localStorage.setItem('pendingScores', JSON.stringify(remainingScores));
    }
  });
}

class Pipe {
  constructor() {
    this.width = Math.max(40, canvas.width / 10); 
    this.gap = Math.max(160, canvas.height / 3); 
    this.x = canvas.width;
    this.topHeight = Math.random() * (canvas.height - this.gap - 150) + 50;
    this.bottomY = this.topHeight + this.gap;
    this.speed = 3 * (canvas.width / 400); 
    this.scored = false;
  }

  update() {
    this.x -= this.speed;
    
    // Dodaj punkt gdy ptak przeleci przez rurę
    if (!this.scored && this.x + this.width < bird.x) {
      score++;
      this.scored = true;
    }
  }

  draw() {
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY);
  }

  collidesWith(bird) {
    if (
      bird.x + bird.size > this.x &&
      bird.x - bird.size < this.x + this.width &&
      bird.y - bird.size < this.topHeight
    ) {
      return true;
    }
    if (
      bird.x + bird.size > this.x &&
      bird.x - bird.size < this.x + this.width &&
      bird.y + bird.size > this.bottomY
    ) {
      return true;
    }
    return false;
  }
}

window.onload = function() {
  const savedName = localStorage.getItem("playerName");
  if (savedName) {
    const playerNameInput = document.getElementById("playerName");
    if (playerNameInput) {
      playerNameInput.value = savedName;
    }
  }
};
