const vehicles = [
  {
    id: 'apex',
    name: 'Apex GT',
    desc: 'Carbon-black coupé tuned for surgical cornering.',
    image:
      'https://images.unsplash.com/photo-1519648023493-d82b5f8d7fd3?auto=format&fit=crop&w=900&q=80',
    maxSpeed: 310,
  },
  {
    id: 'ridge',
    name: 'Ridge Trail',
    desc: 'High-riding SUV with adaptive traction and airy cabin.',
    image:
      'https://images.unsplash.com/photo-1541447271681-72db28ac2b77?auto=format&fit=crop&w=900&q=80',
    maxSpeed: 245,
  },
  {
    id: 'atlas',
    name: 'Atlas Carrier',
    desc: 'Heavy-duty truck with torque to bulldoze traffic.',
    image:
      'https://images.unsplash.com/photo-1526991908809-0d1d1a240a0b?auto=format&fit=crop&w=900&q=80',
    maxSpeed: 210,
  },
];

const enemyCars = [
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=600&q=80',
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const vehicleOptions = document.getElementById('vehicleOptions');
const startButton = document.getElementById('startButton');
const speedEl = document.getElementById('speed');
const distanceEl = document.getElementById('distance');
const overlay = document.getElementById('overlay');
const finalDistanceEl = document.getElementById('finalDistance');
const restartButton = document.getElementById('restart');
const leftControl = document.getElementById('leftControl');
const rightControl = document.getElementById('rightControl');

let lastTimestamp = 0;
const lanes = 3;

const gameState = {
  running: false,
  selectedVehicle: null,
  player: null,
  obstacles: [],
  speed: 0,
  distance: 0,
  spawnTimer: 0,
};

function createVehicleCards() {
  vehicles.forEach((vehicle, index) => {
    const card = document.createElement('article');
    card.className = `vehicle-card${index === 0 ? ' active' : ''}`;
    card.dataset.id = vehicle.id;

    card.innerHTML = `
      <img src="${vehicle.image}" alt="${vehicle.name}" loading="lazy" />
      <div>
        <h3>${vehicle.name}</h3>
        <p>${vehicle.desc}</p>
      </div>
    `;

    card.addEventListener('click', () => selectVehicle(vehicle.id));
    vehicleOptions.appendChild(card);
  });

  selectVehicle(vehicles[0].id);
}

function selectVehicle(id) {
  const vehicle = vehicles.find((v) => v.id === id);
  if (!vehicle) return;
  gameState.selectedVehicle = vehicle;
  vehicleOptions.querySelectorAll('.vehicle-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.id === id);
  });
}

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;
}

function resetGame() {
  gameState.player = null;
  gameState.obstacles = [];
  gameState.speed = 0;
  gameState.distance = 0;
  gameState.spawnTimer = 0;
  overlay.classList.add('hidden');
}

function startGame() {
  if (!gameState.selectedVehicle) return;
  resetGame();
  const vehicleImage = new Image();
  vehicleImage.src = gameState.selectedVehicle.image;

  const laneWidth = canvas.width / lanes;
  const carWidth = laneWidth * 0.55;
  const carHeight = carWidth * 1.8;

  gameState.player = {
    lane: 1,
    width: carWidth,
    height: carHeight,
    x: laneWidth * 1 + laneWidth / 2 - carWidth / 2,
    y: canvas.height - carHeight - 30,
    image: vehicleImage,
  };

  gameState.running = true;
  lastTimestamp = 0;
  requestAnimationFrame(gameLoop);
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * lanes);
  const laneWidth = canvas.width / lanes;
  const carWidth = laneWidth * (0.52 + Math.random() * 0.1);
  const carHeight = carWidth * (1.7 + Math.random() * 0.2);

  const obstacle = {
    lane,
    width: carWidth,
    height: carHeight,
    x: laneWidth * lane + laneWidth / 2 - carWidth / 2,
    y: -carHeight,
    speed: 120 + Math.random() * 40,
    image: new Image(),
  };
  obstacle.image.src = enemyCars[Math.floor(Math.random() * enemyCars.length)];
  gameState.obstacles.push(obstacle);
}

function drawRoad() {
  const laneWidth = canvas.width / lanes;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 4;
  ctx.setLineDash([16, 14]);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  for (let i = 1; i < lanes; i += 1) {
    const x = laneWidth * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(car) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(car.image, car.x, car.y, car.width, car.height);
  ctx.restore();
}

function detectCollision(a, b) {
  return !(
    a.x + a.width < b.x + 6 ||
    a.x + 6 > b.x + b.width ||
    a.y + a.height < b.y + 10 ||
    a.y + 10 > b.y + b.height
  );
}

function endGame() {
  gameState.running = false;
  finalDistanceEl.textContent = Math.round(gameState.distance).toLocaleString();
  overlay.classList.remove('hidden');
}

function update(delta) {
  const accel = 22;
  const targetSpeed = gameState.selectedVehicle.maxSpeed;
  if (gameState.speed < targetSpeed) {
    gameState.speed = Math.min(targetSpeed, gameState.speed + accel * (delta / 1000));
  }

  const speedPx = (gameState.speed / 3.6) * 0.8; // convert to px/s with cinematic pacing
  gameState.distance += (gameState.speed * delta) / 3.6;

  gameState.spawnTimer += delta;
  const spawnInterval = 900 + Math.max(0, 1400 - gameState.speed * 2.5);
  if (gameState.spawnTimer > spawnInterval) {
    spawnObstacle();
    gameState.spawnTimer = 0;
  }

  gameState.obstacles.forEach((obstacle) => {
    obstacle.y += (speedPx + obstacle.speed) * (delta / 1000);
  });
  gameState.obstacles = gameState.obstacles.filter((o) => o.y < canvas.height + o.height);

  const playerRect = gameState.player;
  for (const obstacle of gameState.obstacles) {
    if (detectCollision(playerRect, obstacle)) {
      endGame();
      break;
    }
  }

  speedEl.textContent = Math.round(gameState.speed);
  distanceEl.textContent = Math.round(gameState.distance).toLocaleString();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();

  gameState.obstacles.forEach(drawCar);
  if (gameState.player) drawCar(gameState.player);
}

function gameLoop(timestamp) {
  if (!gameState.running) return;
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  update(delta);
  render();

  requestAnimationFrame(gameLoop);
}

function changeLane(direction) {
  if (!gameState.player) return;
  const nextLane = Math.min(lanes - 1, Math.max(0, gameState.player.lane + direction));
  const laneWidth = canvas.width / lanes;
  gameState.player.lane = nextLane;
  gameState.player.x = laneWidth * nextLane + laneWidth / 2 - gameState.player.width / 2;
}

function bindControls() {
  document.addEventListener('keydown', (event) => {
    if (!gameState.running) return;
    if (event.key === 'ArrowLeft') changeLane(-1);
    if (event.key === 'ArrowRight') changeLane(1);
  });

  leftControl.addEventListener('click', () => changeLane(-1));
  rightControl.addEventListener('click', () => changeLane(1));
}

function bindUI() {
  startButton.addEventListener('click', () => {
    startGame();
  });

  restartButton.addEventListener('click', () => {
    startGame();
  });

  window.addEventListener('resize', () => {
    const laneBefore = gameState.player?.lane ?? 1;
    resizeCanvas();
    if (gameState.player) {
      const laneWidth = canvas.width / lanes;
      gameState.player.width = laneWidth * 0.55;
      gameState.player.height = gameState.player.width * 1.8;
      gameState.player.x = laneWidth * laneBefore + laneWidth / 2 - gameState.player.width / 2;
      gameState.player.y = canvas.height - gameState.player.height - 30;
    }
  });
}

function init() {
  resizeCanvas();
  createVehicleCards();
  bindControls();
  bindUI();
}

init();
