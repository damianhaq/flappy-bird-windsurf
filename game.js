let canvas,
  ctx,
  pipes = [],
  score = 0;
let playerName = "";
let gameLoop;
const GRAVITY = 0.35;
const JUMP_FORCE = -7;
const PIPE_SPEED = 1.5;
const PIPE_SPAWN_RATE = 150;
let frameCount = 0;

const clouds = [
  { x: 50, y: 100, speed: 0.5, size: 1 },
  { x: 200, y: 150, speed: 0.3, size: 1.2 },
  { x: 350, y: 80, speed: 0.4, size: 0.8 },
];

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
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.ellipse(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      this.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Eye
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(
      this.x + this.width * 0.7,
      this.y + this.height * 0.4,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Beak
    ctx.fillStyle = "#e67e22";
    ctx.beginPath();
    ctx.moveTo(this.x + this.width * 0.8, this.y + this.height * 0.5);
    ctx.lineTo(this.x + this.width * 1.2, this.y + this.height * 0.5);
    ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.7);
    ctx.fill();
  },
};

class Pipe {
  constructor() {
    this.width = 50;
    this.gap = 180;
    this.x = canvas.width;
    this.topHeight = Math.random() * (canvas.height - this.gap - 150) + 50;
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
    ctx.fillStyle = "#2ecc71";
    // Top pipe
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    // Bottom pipe
    ctx.fillRect(
      this.x,
      this.bottomY,
      this.width,
      canvas.height - this.bottomY
    );

    // Pipe caps
    ctx.fillStyle = "#27ae60";
    // Top cap
    ctx.fillRect(this.x - 5, this.topHeight - 20, this.width + 10, 20);
    // Bottom cap
    ctx.fillRect(this.x - 5, this.bottomY, this.width + 10, 20);
  }

  collidesWith(bird) {
    return (
      bird.x < this.x + this.width &&
      bird.x + bird.width > this.x &&
      (bird.y < this.topHeight || bird.y + bird.height > this.bottomY)
    );
  }
}

let currentRanking = [];
let playerPosition = 0;
let lastRankingUpdate = 0;
const RANKING_UPDATE_INTERVAL = 5000; // 5 sekund

// Zoptymalizowana funkcja updateRanking
function updateRanking(force = false) {
  const now = Date.now();
  if (!force && now - lastRankingUpdate < RANKING_UPDATE_INTERVAL) {
    return; // Zbyt wcześnie na aktualizację
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

    // Zapisz lokalnie
    localStorage.setItem('lastRanking', JSON.stringify({
      timestamp: now,
      data: currentRanking
    }));

    updateRankingDisplay();
  }, (error) => {
    console.error('Error fetching ranking:', error);
    // Użyj zapisanych lokalnie danych w przypadku błędu
    const cachedRanking = localStorage.getItem('lastRanking');
    if (cachedRanking) {
      const parsed = JSON.parse(cachedRanking);
      currentRanking = parsed.data;
      updateRankingDisplay();
    } else {
      // Jeśli nie ma cache'u, pokaż pusty ranking
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
  // Pobierz nick z inputa lub z localStorage
  const inputElement = document.getElementById("playerName");
  playerName = (inputElement ? inputElement.value : "") || localStorage.getItem("playerName") || "Anonymous";
  localStorage.setItem("playerName", playerName);

  // Ukryj ekran startowy
  const startScreen = document.getElementById("start-screen");
  if (startScreen) startScreen.style.display = "none";

  // Ukryj ekran końca gry
  const gameOver = document.getElementById("game-over");
  if (gameOver) gameOver.style.display = "none";

  // Inicjalizacja canvas
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // Obsługa kliknięć i dotknięć
  canvas.addEventListener("click", () => bird.jump());
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    bird.jump();
  });

  // Obsługa spacji
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      bird.jump();
    }
  });

  // Reset stanu gry
  bird.y = 300;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frameCount = 0;

  // Start gry
  gameLoop = setInterval(update, 1000 / 60);
  loadHighScores();
  updateRanking(); // Start updating ranking
  syncPendingScores();
}

function update() {
  // Update game state
  bird.update();

  // Update clouds
  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed;
    if (cloud.x + 100 < 0) {
      cloud.x = canvas.width + 50;
      cloud.y = Math.random() * 200 + 50;
    }
  });

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
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.size));

  pipes.forEach((pipe) => pipe.draw());
  bird.draw();

  // Draw score
  ctx.fillStyle = "#2c3e50";
  ctx.font = "24px 'Roboto'";
  ctx.fillText(`Score: ${score}`, 10, 30);

  if (score > 0) {
    // Update player's score in real-time
    const dbRef = firebase.database().ref('scores');
    dbRef.orderByChild('player_name').equalTo(playerName).once('value', (snapshot) => {
      if (!snapshot.exists() || (snapshot.val() && Object.values(snapshot.val())[0].score < score)) {
        saveScore();
      }
    });
  }

  frameCount++;
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
  const finalScore = document.getElementById("final-score");
  if (finalScore) finalScore.textContent = score;
  
  const gameOverScreen = document.getElementById("game-over");
  if (gameOverScreen) gameOverScreen.style.display = "block";
  
  saveScore();
}

function restartGame() {
  const gameOverScreen = document.getElementById("game-over");
  if (gameOverScreen) gameOverScreen.style.display = "none";
  
  startGame();
}

// Zoptymalizowana funkcja loadHighScores
async function loadHighScores() {
  try {
    // Najpierw sprawdź cache
    const cachedScores = localStorage.getItem('lastRanking');
    if (cachedScores) {
      const parsed = JSON.parse(cachedScores);
      const age = Date.now() - parsed.timestamp;
      
      // Jeśli cache jest świeży (mniej niż 5 sekund), użyj go
      if (age < RANKING_UPDATE_INTERVAL) {
        displayScores(parsed.data);
        return;
      }
    }

    // Jeśli cache jest nieaktualny lub nie istnieje, pobierz z Firebase
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

      // Zapisz do cache
      localStorage.setItem('lastRanking', JSON.stringify({
        timestamp: Date.now(),
        data: scores
      }));

      displayScores(scores);
    }
  } catch (error) {
    console.error("Error loading scores:", error);
    // W przypadku błędu, spróbuj użyć cache
    const cachedScores = localStorage.getItem('lastRanking');
    if (cachedScores) {
      const parsed = JSON.parse(cachedScores);
      displayScores(parsed.data);
    } else {
      // Jeśli nie ma cache'u, pokaż pusty ranking
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

// Zoptymalizowana funkcja saveScore
async function saveScore() {
  if (!playerName || score === 0) return;

  const scoreData = {
    player_name: playerName,
    score: score,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  try {
    const dbRef = firebase.database().ref('scores');
    
    // Sprawdź czy gracz już ma zapisany wynik
    const playerScores = await dbRef
      .orderByChild('player_name')
      .equalTo(playerName)
      .once('value');
    
    let updates = {};
    
    if (playerScores.exists()) {
      // Znajdź najwyższy wynik gracza
      let highestScore = 0;
      let highestScoreKey = null;
      
      playerScores.forEach((childSnapshot) => {
        const existingScore = childSnapshot.val().score;
        if (existingScore > highestScore) {
          highestScore = existingScore;
          highestScoreKey = childSnapshot.key;
        }
      });

      // Aktualizuj tylko jeśli nowy wynik jest wyższy
      if (score > highestScore) {
        if (highestScoreKey) {
          updates[`/scores/${highestScoreKey}`] = scoreData;
        } else {
          // Jeśli z jakiegoś powodu nie znaleziono klucza, dodaj nowy wpis
          const newScoreRef = dbRef.push();
          updates[`/scores/${newScoreRef.key}`] = scoreData;
        }
      }
      
      // Usuń pozostałe wyniki tego gracza
      playerScores.forEach((childSnapshot) => {
        if (childSnapshot.key !== highestScoreKey) {
          updates[`/scores/${childSnapshot.key}`] = null;
        }
      });
    } else {
      // Nowy gracz - dodaj wynik
      const newScoreRef = dbRef.push();
      updates[`/scores/${newScoreRef.key}`] = scoreData;
    }

    // Wykonaj aktualizacje w jednej transakcji
    if (Object.keys(updates).length > 0) {
      await database.ref().update(updates);
      
      // Usuń stare wyniki (zostaw tylko top 100)
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

        // Sortuj malejąco po wyniku
        scores.sort((a, b) => b.score - a.score);

        // Usuń wyniki poza top 100
        if (scores.length > 100) {
          const deletions = {};
          scores.slice(100).forEach((score) => {
            deletions[`/scores/${score.key}`] = null;
          });
          await database.ref().update(deletions);
        }
      }

      // Aktualizuj ranking
      updateRanking(true);
    }
  } catch (error) {
    console.error('Error saving score:', error);
    // Zapisz lokalnie w przypadku błędu
    const pendingScores = JSON.parse(localStorage.getItem('pendingScores') || '[]');
    pendingScores.push(scoreData);
    localStorage.setItem('pendingScores', JSON.stringify(pendingScores));
  }
}

// Funkcja do synchronizacji zaległych wyników
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
      // Zachowaj tylko niezsynchronizowane wyniki
      const remainingScores = pendingScores.filter((_, index) => !results[index]);
      localStorage.setItem('pendingScores', JSON.stringify(remainingScores));
    }
  });
}

// Wczytaj zapisany nick przy starcie
window.onload = function() {
  const savedName = localStorage.getItem("playerName");
  if (savedName) {
    const playerNameInput = document.getElementById("playerName");
    if (playerNameInput) {
      playerNameInput.value = savedName;
    }
  }
};
