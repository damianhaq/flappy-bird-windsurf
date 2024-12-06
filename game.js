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
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.font = "bold 24px Arial";
  ctx.strokeText(`Wynik: ${score}`, 10, 30);
  ctx.fillText(`Wynik: ${score}`, 10, 30);

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

// TODO: Zastąp tę konfigurację danymi z Twojego projektu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDL5Wl2C_wygGrLT_vcgrVIxQW1A9b3Db4",
  authDomain: "flappy-bird-game-314e7.firebaseapp.com",
  databaseURL:
    "https://flappy-bird-game-314e7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flappy-bird-game-314e7",
  storageBucket: "flappy-bird-game-314e7.firebasestorage.app",
  messagingSenderId: "809910247379",
  appId: "1:809910247379:web:42c6e25685e032f2ddd926",
  measurementId: "G-0EVMTV04MH",
};

// Initialize Firebase
let database;
try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

async function saveScore() {
  const scoreData = {
    player_name: playerName || "Anonymous",
    score: score,
    date: new Date().toISOString(),
  };

  try {
    // Zapisujemy lokalnie
    let scores = JSON.parse(localStorage.getItem("highScores") || "[]");
    scores.push(scoreData);
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem("highScores", JSON.stringify(scores));

    // Jeśli Firebase jest skonfigurowany, zapisujemy online
    if (database) {
      try {
        await database.ref("scores").push(scoreData);
        console.log("Score saved to Firebase");
      } catch (firebaseError) {
        console.error("Error saving to Firebase:", firebaseError);
      }
    }

    loadHighScores();
  } catch (error) {
    console.error("Error saving score:", error);
    loadHighScores();
  }
}

async function loadHighScores() {
  try {
    let allScores = [];

    // Pobieramy lokalne wyniki
    let localScores = JSON.parse(localStorage.getItem("highScores") || "[]");
    allScores = [...localScores];

    // Jeśli Firebase jest skonfigurowany, pobieramy wyniki online
    if (database) {
      try {
        const snapshot = await database
          .ref("scores")
          .orderByChild("score")
          .limitToLast(10)
          .once("value");

        snapshot.forEach((childSnapshot) => {
          allScores.push(childSnapshot.val());
        });
        console.log("Scores loaded from Firebase");
      } catch (firebaseError) {
        console.error("Error loading from Firebase:", firebaseError);
      }
    }

    // Sortujemy i ograniczamy do top 10
    allScores.sort((a, b) => b.score - a.score);
    allScores = allScores.slice(0, 10);

    // Formatujemy datę
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    };

    // Tworzymy HTML dla wyników
    const scoresHTML = allScores
      .map(
        (score, index) =>
          `<div>${index + 1}. ${score.player_name}: ${score.score} (${formatDate(score.date)})</div>`
      )
      .join("");

    // Wyświetlamy wyniki na ekranie startowym
    const highscoresDiv = document.getElementById("highscores");
    if (highscoresDiv) {
      highscoresDiv.innerHTML = `<h3>Najlepsze wyniki</h3>${scoresHTML}`;
    }

    // Wyświetlamy wyniki na ekranie końcowym
    const gameOverHighscores = document.getElementById("highscores-game-over");
    if (gameOverHighscores) {
      gameOverHighscores.innerHTML = `<h3>Najlepsze wyniki</h3>${scoresHTML}`;
    }
  } catch (error) {
    console.error("Error loading scores:", error);
    // W przypadku błędu pokazujemy tylko lokalne wyniki
    const localScores = JSON.parse(localStorage.getItem("highScores") || "[]");
    const scoresHTML = localScores
      .map(
        (score, index) =>
          `<div>${index + 1}. ${score.player_name}: ${score.score}</div>`
      )
      .join("");

    const highscoresDiv = document.getElementById("highscores");
    if (highscoresDiv) {
      highscoresDiv.innerHTML = `<h3>Najlepsze wyniki (lokalne)</h3>${scoresHTML}`;
    }

    const gameOverHighscores = document.getElementById("highscores-game-over");
    if (gameOverHighscores) {
      gameOverHighscores.innerHTML = `<h3>Najlepsze wyniki (lokalne)</h3>${scoresHTML}`;
    }
  }
}

// Wczytaj zapisany nick przy starcie
window.onload = function() {
  const savedName = localStorage.getItem("playerName");
  if (savedName) {
    document.getElementById("playerName").value = savedName;
  }
};
