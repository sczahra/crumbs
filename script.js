const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restart');
const overlay = document.getElementById('overlay');
const missionPanel = document.getElementById('missionPanel');
const timerEl = document.getElementById('timer');
const cellIdEl = document.getElementById('cellId');
const alertEl = document.getElementById('alert');
const staminaEl = document.getElementById('stamina');
const finalTimeEl = document.getElementById('finalTime');
const joystick = document.getElementById('joystick');
const joystickStick = document.getElementById('joystickStick');
const sprintButton = document.getElementById('sprintButton');
const interactButton = document.getElementById('interactButton');

const gameState = {
  running: false,
  time: 0,
  stamina: 100,
  alert: 0,
  cell: null,
  player: { x: 0, z: 12, y: 0, heading: 0 },
  guards: [],
  camera: { yaw: Math.PI * 0.35, pitch: 0.35, distance: 28 },
  input: {
    forward: 0,
    right: 0,
    sprint: false,
  },
};

const keys = new Set();
const joystickState = { active: false, id: null, x: 0, y: 0 };
const cameraDrag = { active: false, id: null, lastX: 0, lastY: 0 };

const world = {
  size: 46,
  structures: [],
  staticFaces: [],
  cells: [],
  light: normalize({ x: -0.4, y: 0.7, z: -0.5 }),
};

const textures = {
  concrete: createTexture('#5c6069', '#2f3137'),
  asphalt: createTexture('#2b2d32', '#1a1c1f'),
  metal: createTexture('#747a80', '#3b3f45'),
};

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.floor(width * devicePixelRatio);
  canvas.height = Math.floor(height * devicePixelRatio);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

function createTexture(base, accent) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 160;
  textureCanvas.height = 160;
  const tctx = textureCanvas.getContext('2d');
  const gradient = tctx.createLinearGradient(0, 0, 160, 160);
  gradient.addColorStop(0, base);
  gradient.addColorStop(1, accent);
  tctx.fillStyle = gradient;
  tctx.fillRect(0, 0, 160, 160);
  const imageData = tctx.getImageData(0, 0, 160, 160);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 26;
    imageData.data[i] = clampColor(imageData.data[i] + noise);
    imageData.data[i + 1] = clampColor(imageData.data[i + 1] + noise);
    imageData.data[i + 2] = clampColor(imageData.data[i + 2] + noise);
  }
  tctx.putImageData(imageData, 0, 0);
  tctx.globalAlpha = 0.25;
  tctx.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 160; i += 20) {
    tctx.beginPath();
    tctx.moveTo(0, i);
    tctx.lineTo(160, i);
    tctx.stroke();
  }
  return ctx.createPattern(textureCanvas, 'repeat');
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function normalize(vec) {
  const length = Math.hypot(vec.x, vec.y, vec.z) || 1;
  return { x: vec.x / length, y: vec.y / length, z: vec.z / length };
}

function addBox({ center, size, color, texture }) {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const corners = [
    { x: cx - hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy - hy, z: cz + hz },
    { x: cx - hx, y: cy - hy, z: cz + hz },
    { x: cx - hx, y: cy + hy, z: cz - hz },
    { x: cx + hx, y: cy + hy, z: cz - hz },
    { x: cx + hx, y: cy + hy, z: cz + hz },
    { x: cx - hx, y: cy + hy, z: cz + hz },
  ];

  const faces = [
    { indices: [0, 1, 2, 3], normal: { x: 0, y: -1, z: 0 } },
    { indices: [4, 5, 6, 7], normal: { x: 0, y: 1, z: 0 } },
    { indices: [0, 1, 5, 4], normal: { x: 0, y: 0, z: -1 } },
    { indices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 } },
    { indices: [2, 3, 7, 6], normal: { x: 0, y: 0, z: 1 } },
    { indices: [3, 0, 4, 7], normal: { x: -1, y: 0, z: 0 } },
  ];

  faces.forEach((face) => {
    world.staticFaces.push({
      vertices: face.indices.map((index) => corners[index]),
      normal: face.normal,
      color,
      texture,
    });
  });
}

function buildEnvironment() {
  world.staticFaces = [];
  world.cells = [];
  const wallHeight = 9;
  const wallThickness = 1.2;
  const size = world.size;

  addBox({
    center: [0, wallHeight / 2, -size],
    size: [size * 2, wallHeight, wallThickness],
    color: '#5d6068',
    texture: textures.concrete,
  });
  addBox({
    center: [0, wallHeight / 2, size],
    size: [size * 2, wallHeight, wallThickness],
    color: '#5d6068',
    texture: textures.concrete,
  });
  addBox({
    center: [-size, wallHeight / 2, 0],
    size: [wallThickness, wallHeight, size * 2],
    color: '#5d6068',
    texture: textures.concrete,
  });
  addBox({
    center: [size, wallHeight / 2, 0],
    size: [wallThickness, wallHeight, size * 2],
    color: '#5d6068',
    texture: textures.concrete,
  });

  const cellBlockLength = 32;
  const cellBlockWidth = 18;
  const cellBlockHeight = 8;
  addBox({
    center: [0, cellBlockHeight / 2, -22],
    size: [cellBlockLength, cellBlockHeight, cellBlockWidth],
    color: '#4a4f58',
    texture: textures.concrete,
  });

  addBox({
    center: [0, 1.2, -22],
    size: [cellBlockLength - 2, 2.4, cellBlockWidth - 2],
    color: '#2b2f36',
    texture: textures.asphalt,
  });

  const corridorZ = -16;
  const cellDepth = 4;
  const cellWidth = 4;
  let cellIndex = 1;
  for (let x = -14; x <= 14; x += 6) {
    const leftCellZ = corridorZ - cellDepth;
    const rightCellZ = corridorZ + cellDepth;
    const labelLeft = `C-${String(cellIndex).padStart(2, '0')}`;
    world.cells.push({ id: labelLeft, x, z: leftCellZ - 2 });
    cellIndex += 1;
    const labelRight = `C-${String(cellIndex).padStart(2, '0')}`;
    world.cells.push({ id: labelRight, x, z: rightCellZ + 2 });
    cellIndex += 1;

    addBox({
      center: [x, 2.4, leftCellZ],
      size: [cellWidth, 4.8, cellDepth],
      color: '#3f444d',
      texture: textures.metal,
    });
    addBox({
      center: [x, 2.4, rightCellZ],
      size: [cellWidth, 4.8, cellDepth],
      color: '#3f444d',
      texture: textures.metal,
    });
  }

  addBox({
    center: [18, 3.2, 10],
    size: [12, 6.4, 12],
    color: '#3d4148',
    texture: textures.concrete,
  });

  addBox({
    center: [-20, 2.5, 18],
    size: [12, 5, 8],
    color: '#4c525a',
    texture: textures.concrete,
  });

  const towers = [
    [-40, -40],
    [40, -40],
    [-40, 40],
    [40, 40],
  ];
  towers.forEach(([x, z]) => {
    addBox({
      center: [x, 6.5, z],
      size: [4, 13, 4],
      color: '#40454e',
      texture: textures.metal,
    });
    addBox({
      center: [x, 13, z],
      size: [6, 2, 6],
      color: '#606770',
      texture: textures.metal,
    });
  });
}

function createGuards() {
  gameState.guards = [
    guard([10, 0, -2], [
      [10, -12],
      [26, -8],
      [24, 8],
      [8, 6],
    ]),
    guard([-12, 0, 6], [
      [-12, 10],
      [-26, 12],
      [-24, -6],
      [-10, -8],
    ]),
    guard([0, 0, -14], [
      [0, -20],
      [14, -22],
      [14, -10],
      [0, -6],
      [-12, -8],
    ]),
  ];
}

function assignRandomCell() {
  if (!world.cells.length) return null;
  const index = Math.floor(Math.random() * world.cells.length);
  return world.cells[index];
}

function guard(position, path) {
  return {
    x: position[0],
    y: 0,
    z: position[2] ?? position[1],
    path: path.map(([x, z]) => ({ x, z })),
    pathIndex: 0,
    speed: 2.4 + Math.random() * 0.8,
  };
}

function project(point) {
  const { yaw, pitch, distance } = gameState.camera;
  const camX = gameState.player.x + Math.sin(yaw) * distance;
  const camZ = gameState.player.z + Math.cos(yaw) * distance;
  const camY = distance * 0.45 + 7 + gameState.camera.pitch * 6;

  const dx = point.x - camX;
  const dy = point.y - camY;
  const dz = point.z - camZ;

  const cosYaw = Math.cos(-yaw);
  const sinYaw = Math.sin(-yaw);
  const xz = dx * cosYaw - dz * sinYaw;
  const zz = dx * sinYaw + dz * cosYaw;

  const cosPitch = Math.cos(-pitch);
  const sinPitch = Math.sin(-pitch);
  const yz = dy * cosPitch - zz * sinPitch;
  const zz2 = dy * sinPitch + zz * cosPitch;

  const fov = 600;
  const scale = fov / (fov + zz2);
  return {
    x: canvas.width / devicePixelRatio / 2 + xz * scale,
    y: canvas.height / devicePixelRatio / 2 + yz * scale,
    z: zz2,
    scale,
  };
}

function shadeColor(color, intensity) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 255) * intensity));
  const g = Math.min(255, Math.round(((num >> 8) & 255) * intensity));
  const b = Math.min(255, Math.round((num & 255) * intensity));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawFace(face) {
  const projected = face.vertices.map(project);
  if (projected.some((p) => p.z < -200)) return;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i += 1) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.closePath();

  const light = Math.max(0.28, face.normal.x * world.light.x + face.normal.y * world.light.y + face.normal.z * world.light.z);
  ctx.fillStyle = shadeColor(face.color, light + 0.2);
  ctx.fill();
  if (face.texture && light > 0.35) {
    ctx.save();
    ctx.globalAlpha = 0.3 + light * 0.2;
    ctx.clip();
    ctx.fillStyle = face.texture;
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(10, 10, 12, 0.35)';
  ctx.stroke();
}

function drawGround() {
  const groundSize = world.size + 8;
  const corners = [
    { x: -groundSize, y: 0, z: -groundSize },
    { x: groundSize, y: 0, z: -groundSize },
    { x: groundSize, y: 0, z: groundSize },
    { x: -groundSize, y: 0, z: groundSize },
  ];
  const projected = corners.map(project);
  const gradient = ctx.createLinearGradient(0, canvas.height / devicePixelRatio, 0, 0);
  gradient.addColorStop(0, '#14161b');
  gradient.addColorStop(0.6, '#1d2026');
  gradient.addColorStop(1, '#2a2e36');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  projected.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let i = -groundSize; i <= groundSize; i += 6) {
    const start = project({ x: i, y: 0.02, z: -groundSize });
    const end = project({ x: i, y: 0.02, z: groundSize });
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  for (let i = -groundSize; i <= groundSize; i += 6) {
    const start = project({ x: -groundSize, y: 0.02, z: i });
    const end = project({ x: groundSize, y: 0.02, z: i });
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawActor(actor, color) {
  const bodyHeight = 1.8;
  const body = [
    { x: actor.x - 0.4, y: 0, z: actor.z - 0.3 },
    { x: actor.x + 0.4, y: 0, z: actor.z - 0.3 },
    { x: actor.x + 0.4, y: bodyHeight, z: actor.z - 0.3 },
    { x: actor.x - 0.4, y: bodyHeight, z: actor.z - 0.3 },
  ];
  const head = { x: actor.x, y: bodyHeight + 0.6, z: actor.z - 0.25 };

  const bodyProjected = body.map(project);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bodyProjected[0].x, bodyProjected[0].y);
  bodyProjected.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();

  const headProjected = project(head);
  ctx.fillStyle = '#f1d7bf';
  ctx.beginPath();
  ctx.arc(headProjected.x, headProjected.y, 5 * headProjected.scale, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();

  const faces = [...world.staticFaces];

  gameState.guards.forEach((guard) => {
    const guardBox = [
      { x: guard.x - 0.5, y: 0, z: guard.z - 0.4 },
      { x: guard.x + 0.5, y: 0, z: guard.z - 0.4 },
      { x: guard.x + 0.5, y: 1.9, z: guard.z - 0.4 },
      { x: guard.x - 0.5, y: 1.9, z: guard.z - 0.4 },
    ];
    faces.push({
      vertices: guardBox,
      normal: { x: 0, y: 0, z: -1 },
      color: '#2a3140',
      texture: null,
    });
  });

  const playerBox = [
    { x: gameState.player.x - 0.5, y: 0, z: gameState.player.z - 0.4 },
    { x: gameState.player.x + 0.5, y: 0, z: gameState.player.z - 0.4 },
    { x: gameState.player.x + 0.5, y: 1.85, z: gameState.player.z - 0.4 },
    { x: gameState.player.x - 0.5, y: 1.85, z: gameState.player.z - 0.4 },
  ];
  faces.push({
    vertices: playerBox,
    normal: { x: 0, y: 0, z: -1 },
    color: '#353b46',
    texture: null,
  });

  faces
    .map((face) => ({
      ...face,
      depth: face.vertices.reduce((sum, v) => sum + project(v).z, 0) / face.vertices.length,
    }))
    .sort((a, b) => b.depth - a.depth)
    .forEach(drawFace);

  drawActor(gameState.player, '#4d5566');
  gameState.guards.forEach((guard) => drawActor(guard, '#1f2734'));

  drawLights();
}

function drawLights() {
  const lights = [
    { x: -40, y: 12, z: -40 },
    { x: 40, y: 12, z: -40 },
    { x: -40, y: 12, z: 40 },
    { x: 40, y: 12, z: 40 },
  ];
  lights.forEach((light) => {
    const projected = project(light);
    const radius = 10 * projected.scale;
    const gradient = ctx.createRadialGradient(
      projected.x,
      projected.y,
      0,
      projected.x,
      projected.y,
      radius * 6
    );
    gradient.addColorStop(0, 'rgba(255,220,160,0.75)');
    gradient.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius * 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function update(delta) {
  const inputVector = getInputVector();
  const sprinting = gameState.input.sprint && gameState.stamina > 5;
  const speed = sprinting ? 5.4 : 3.2;

  if (sprinting) {
    gameState.stamina = Math.max(0, gameState.stamina - delta * 0.03);
  } else {
    gameState.stamina = Math.min(100, gameState.stamina + delta * 0.02);
  }

  const moveMagnitude = Math.hypot(inputVector.x, inputVector.z);
  if (moveMagnitude > 0.01) {
    const moveDir = {
      x: inputVector.x / moveMagnitude,
      z: inputVector.z / moveMagnitude,
    };
    gameState.player.x += moveDir.x * speed * (delta / 1000);
    gameState.player.z += moveDir.z * speed * (delta / 1000);
    gameState.player.heading = Math.atan2(moveDir.x, moveDir.z);
  }

  const clamp = world.size - 3;
  gameState.player.x = Math.max(-clamp, Math.min(clamp, gameState.player.x));
  gameState.player.z = Math.max(-clamp, Math.min(clamp, gameState.player.z));

  updateGuards(delta / 1000);
  updateAlert(delta / 1000);
  gameState.time += delta;

  timerEl.textContent = formatTime(gameState.time / 1000);
  staminaEl.textContent = Math.round(gameState.stamina);
  alertEl.textContent = alertLabel(gameState.alert);
  finalTimeEl.textContent = formatTime(gameState.time / 1000);
}

function updateGuards(delta) {
  gameState.guards.forEach((guard) => {
    const target = guard.path[guard.pathIndex];
    const dx = target.x - guard.x;
    const dz = target.z - guard.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.4) {
      guard.pathIndex = (guard.pathIndex + 1) % guard.path.length;
      return;
    }
    guard.x += (dx / distance) * guard.speed * delta;
    guard.z += (dz / distance) * guard.speed * delta;
  });
}

function updateAlert(delta) {
  let alertBoost = 0;
  gameState.guards.forEach((guard) => {
    const distance = Math.hypot(guard.x - gameState.player.x, guard.z - gameState.player.z);
    if (distance < 6) {
      alertBoost += (6 - distance) * 8;
    }
  });
  if (alertBoost > 0) {
    gameState.alert = Math.min(100, gameState.alert + alertBoost * delta);
  } else {
    gameState.alert = Math.max(0, gameState.alert - 14 * delta);
  }
  if (gameState.alert >= 100) {
    endGame();
  }
}

function alertLabel(value) {
  if (value > 70) return 'High';
  if (value > 35) return 'Elevated';
  return 'Low';
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getInputVector() {
  const forward = gameState.input.forward;
  const right = gameState.input.right;
  const yaw = gameState.camera.yaw;

  const forwardVec = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const rightVec = { x: Math.cos(yaw), z: -Math.sin(yaw) };

  return {
    x: rightVec.x * right + forwardVec.x * forward,
    z: rightVec.z * right + forwardVec.z * forward,
  };
}

function gameLoop(timestamp) {
  if (!gameState.running) return;
  if (!gameState.lastTime) gameState.lastTime = timestamp;
  const delta = timestamp - gameState.lastTime;
  gameState.lastTime = timestamp;

  update(delta);
  render();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  gameState.running = true;
  gameState.time = 0;
  gameState.alert = 0;
  gameState.stamina = 100;
  const assignedCell = assignRandomCell();
  gameState.cell = assignedCell;
  gameState.player = {
    x: assignedCell?.x ?? 0,
    z: (assignedCell?.z ?? 12) + 2.5,
    y: 0,
    heading: 0,
  };
  gameState.lastTime = null;
  overlay.classList.add('hidden');
  missionPanel.classList.add('hidden');
  createGuards();
  cellIdEl.textContent = assignedCell?.id ?? 'C-00';
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState.running = false;
  overlay.classList.remove('hidden');
}

function bindControls() {
  window.addEventListener('keydown', (event) => {
    keys.add(event.key.toLowerCase());
    handleKeys();
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
    handleKeys();
  });

  sprintButton.addEventListener('pointerdown', () => {
    gameState.input.sprint = true;
  });
  sprintButton.addEventListener('pointerup', () => {
    gameState.input.sprint = false;
  });
  sprintButton.addEventListener('pointerleave', () => {
    gameState.input.sprint = false;
  });

  interactButton.addEventListener('click', () => {
    gameState.alert = Math.max(0, gameState.alert - 18);
  });

  joystick.addEventListener('pointerdown', (event) => {
    joystickState.active = true;
    joystickState.id = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  joystick.addEventListener('pointermove', (event) => {
    if (!joystickState.active || event.pointerId !== joystickState.id) return;
    updateJoystick(event);
  });

  joystick.addEventListener('pointerup', (event) => {
    if (event.pointerId !== joystickState.id) return;
    resetJoystick();
  });

  joystick.addEventListener('pointercancel', resetJoystick);

  canvas.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.joystick') || event.target.closest('.actions')) return;
    cameraDrag.active = true;
    cameraDrag.id = event.pointerId;
    cameraDrag.lastX = event.clientX;
    cameraDrag.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!cameraDrag.active || event.pointerId !== cameraDrag.id) return;
    const dx = event.clientX - cameraDrag.lastX;
    const dy = event.clientY - cameraDrag.lastY;
    cameraDrag.lastX = event.clientX;
    cameraDrag.lastY = event.clientY;
    gameState.camera.yaw -= dx * 0.003;
    gameState.camera.pitch = Math.min(0.6, Math.max(0.2, gameState.camera.pitch - dy * 0.002));
  });

  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId !== cameraDrag.id) return;
    cameraDrag.active = false;
  });

  canvas.addEventListener('pointercancel', () => {
    cameraDrag.active = false;
  });
}

function handleKeys() {
  gameState.input.forward = 0;
  gameState.input.right = 0;
  gameState.input.sprint = keys.has('shift');

  if (keys.has('w') || keys.has('arrowup')) gameState.input.forward += 1;
  if (keys.has('s') || keys.has('arrowdown')) gameState.input.forward -= 1;
  if (keys.has('a') || keys.has('arrowleft')) gameState.input.right -= 1;
  if (keys.has('d') || keys.has('arrowright')) gameState.input.right += 1;

  if (joystickState.active) {
    gameState.input.forward = -joystickState.y;
    gameState.input.right = joystickState.x;
  }
}

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const max = rect.width / 2;
  const dist = Math.min(max, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const x = (Math.cos(angle) * dist) / max;
  const y = (Math.sin(angle) * dist) / max;

  joystickState.x = x;
  joystickState.y = y;
  joystickStick.style.transform = `translate(${x * 30 - 50}%, ${y * 30 - 50}%)`;
  handleKeys();
}

function resetJoystick() {
  joystickState.active = false;
  joystickState.id = null;
  joystickState.x = 0;
  joystickState.y = 0;
  joystickStick.style.transform = 'translate(-50%, -50%)';
  handleKeys();
}

function init() {
  resizeCanvas();
  buildEnvironment();
  createGuards();
  gameState.cell = assignRandomCell();
  if (gameState.cell) {
    cellIdEl.textContent = gameState.cell.id;
    gameState.player.x = gameState.cell.x;
    gameState.player.z = gameState.cell.z + 2.5;
  }
  bindControls();

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  render();
}

init();
