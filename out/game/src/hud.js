// The HUD: health bar, cash, wanted stars, mission objective, speed, toast messages
// and a circular minimap drawn on a 2D canvas — roads, the sea, the player, traffic,
// police and the gold mission marker.
import { CITY } from './config.js';

export function createHud() {
  const cashEl = document.getElementById('cash');
  const healthFill = document.getElementById('healthfill');
  const wantedEl = document.getElementById('wanted');
  const objTitle = document.getElementById('objTitle');
  const objText = document.getElementById('objText');
  const objDist = document.getElementById('objDist');
  const speedVal = document.getElementById('speedVal');
  const carName = document.getElementById('carName');
  const toastEl = document.getElementById('toast');
  const crosshair = document.getElementById('crosshair');
  const map = document.getElementById('minimap');
  const mctx = map.getContext('2d');
  let toastTimer = null;

  function showToast(text, ms = 3200) {
    toastEl.textContent = text;
    toastEl.style.display = 'block';
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toastEl.style.display = 'none'; }, ms);
  }

  function update(state) {
    cashEl.textContent = `$${state.cash.toLocaleString('en-US')}`;
    healthFill.style.width = `${Math.max(0, state.health)}%`;
    healthFill.style.background = state.health > 50
      ? 'linear-gradient(90deg, #37d67a, #9be15d)'
      : state.health > 25 ? 'linear-gradient(90deg, #f2c230, #f28c30)' : 'linear-gradient(90deg, #e5534b, #f28c30)';
    let stars = '';
    for (let i = 0; i < 5; i += 1) {
      stars += `<span class="${i < state.wanted ? 'lit' : ''}">★</span>`;
    }
    wantedEl.innerHTML = stars || '<span style="color:#8fa8c8">— no heat —</span>';
    objTitle.textContent = state.objective.title;
    objText.textContent = state.objective.text;
    objDist.textContent = state.objective.dist || '';
    speedVal.textContent = String(Math.round(Math.abs(state.speed) * 3.6));
    carName.textContent = state.carName || 'On foot';
    crosshair.style.display = state.aiming ? 'block' : 'none';
  }

  function drawMinimap(city, playerPos, playerHeading, traffic, police, targetPos) {
    const size = 180;
    const scale = size / (CITY.bound * 2 + 40);
    const toMap = (x, z) => [(x + CITY.bound + 20) * scale, (z + CITY.bound + 20) * scale];
    mctx.clearRect(0, 0, size, size);
    mctx.save();
    mctx.beginPath();
    mctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    mctx.clip();
    mctx.fillStyle = '#1d2f1a';
    mctx.fillRect(0, 0, size, size);
    // Sea to the east.
    const [seaX] = toMap(CITY.seaX, 0);
    mctx.fillStyle = '#1f7fb8';
    mctx.fillRect(seaX, 0, size - seaX, size);
    // Roads.
    mctx.strokeStyle = '#4a4f57';
    mctx.lineWidth = 5;
    for (const x of city.roadXs) {
      const [mx] = toMap(x, 0);
      mctx.beginPath(); mctx.moveTo(mx, 0); mctx.lineTo(mx, size); mctx.stroke();
    }
    for (const z of city.roadZs) {
      const [, mz] = toMap(0, z);
      mctx.beginPath(); mctx.moveTo(0, mz); mctx.lineTo(size, mz); mctx.stroke();
    }
    // Mission marker.
    if (targetPos) {
      const [mx, mz] = toMap(targetPos.x, targetPos.z);
      mctx.fillStyle = '#ffd34d';
      mctx.beginPath(); mctx.arc(mx, mz, 6, 0, Math.PI * 2); mctx.fill();
      mctx.strokeStyle = '#fff';
      mctx.lineWidth = 2;
      mctx.stroke();
    }
    // Traffic as pale dots, police as red dots.
    mctx.fillStyle = '#dfe8f2';
    for (const car of traffic) {
      const [mx, mz] = toMap(car.mesh.position.x, car.mesh.position.z);
      mctx.fillRect(mx - 2, mz - 2, 4, 4);
    }
    mctx.fillStyle = '#ff3b30';
    for (const cruiser of police) {
      const [mx, mz] = toMap(cruiser.mesh.position.x, cruiser.mesh.position.z);
      mctx.beginPath(); mctx.arc(mx, mz, 3.5, 0, Math.PI * 2); mctx.fill();
    }
    // The player: a white arrow pointing where they face.
    const [px, pz] = toMap(playerPos.x, playerPos.z);
    mctx.save();
    mctx.translate(px, pz);
    mctx.rotate(playerHeading);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -8); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath();
    mctx.fill();
    mctx.restore();
    mctx.restore();
  }

  return { update, drawMinimap, showToast };
}
