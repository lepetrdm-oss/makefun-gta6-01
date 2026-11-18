// Solmar Bay — boot, the one game loop, the player on foot, the camera, the screens
// (title / play / paused / wasted), saving, and the deterministic screenshot presets.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages that
// scene instead of the loop, paints it a few times and sets window.__shotReady.
import * as THREE from 'three';
import { CITY, MISSIONS, PLAYER, STEP, STORY_INTRO } from './config.js';
import { createCity, mulberry32 } from './world.js';
import { ACTION_ENTER, ACTION_MELEE, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createTraffic, driveCar, makeCarMesh, nearestCar } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const screenStart = document.getElementById('screen-start');
const screenPause = document.getElementById('screen-pause');
const screenOver = document.getElementById('screen-over');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = createCity(scene, seed);
const traffic = createTraffic(scene, city, 14);
const pedestrians = createPedestrians(scene, city, 18);
const police = createPolice(scene, city);
const missions = createMissions(city);
const combat = createCombat(scene, camera);
const audio = createAudio();
const hud = createHud();
const input = createInput(canvas);

// The special Coral Coupe waiting on the docks for the Harbor Heist.
const heistCar = (() => {
  const model = { name: 'Coral Coupe', color: 0xd83a3a, speed: 31, value: 900 };
  const mesh = makeCarMesh(model, false);
  mesh.position.set(150, 0, -104);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
  const car = { mesh, model, heading: Math.PI / 2, speed: 0, targetSpeed: 0, isPolice: false, isPlayer: false, health: 100, heist: true };
  traffic.cars.push(car);
  return car;
})();

// The player on foot: a simple figure with a jacket, jeans and a cap.
function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.85, 4, 10),
    new THREE.MeshLambertMaterial({ color: 0x2a6fd8 }),
  );
  jacket.position.y = 1.05;
  jacket.castShadow = true;
  group.add(jacket);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.92;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.12, 12),
    new THREE.MeshLambertMaterial({ color: 0xd83a3a }),
  );
  cap.position.y = 2.1;
  group.add(cap);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.55, 0.26),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
  );
  legs.position.y = 0.28;
  group.add(legs);
  return group;
}

const player = {
  mesh: makePlayerMesh(),
  x: 0, z: 26,
  heading: Math.PI,
  health: PLAYER.health,
  invulnerable: 0,
  walkPhase: 0,
  speed: 0,
};
player.mesh.position.set(player.x, 0, player.z);
scene.add(player.mesh);

let playerCar = null;
let screen = 'title';
let camYaw = Math.PI;
let camPitch = 0.32;
let sirenTimer = 0;
let saveFlash = 0;

function announce(message) { statusEl.textContent = message; }

function showOnly(which) {
  screenStart.style.display = which === 'title' ? 'flex' : 'none';
  screenPause.style.display = which === 'paused' ? 'flex' : 'none';
  screenOver.style.display = which === 'over' ? 'flex' : 'none';
}

function playerPos() {
  return playerCar ? { x: playerCar.mesh.position.x, z: playerCar.mesh.position.z } : { x: player.x, z: player.z };
}

function exitCar() {
  if (!playerCar) return;
  const car = playerCar;
  playerCar = null;
  player.x = car.mesh.position.x + Math.sin(car.heading + Math.PI / 2) * 2.5;
  player.z = car.mesh.position.z + Math.cos(car.heading + Math.PI / 2) * 2.5;
  player.heading = car.heading;
  city.pushOut(player, PLAYER.radius);
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.visible = true;
  car.isPlayer = false;
  car.targetSpeed = 0;
  audio.setEngine(0, false);
  announce('On foot.');
}

function enterCar(car) {
  playerCar = car;
  car.isPlayer = true;
  traffic.cars.splice(traffic.cars.indexOf(car), 1);
  player.mesh.visible = false;
  police.addCrime(2, (stars) => hud.showToast(`Car stolen! Wanted level ${stars} — the SBPD is coming.`));
  audio.siren();
  announce(`Driving the ${car.model.name}.`);
}

function damagePlayer(amount, cause) {
  if (player.invulnerable > 0) return;
  player.health -= amount;
  player.invulnerable = 1;
  hud.showToast(`${cause}! Health ${Math.max(0, Math.round(player.health))}`);
  if (player.health <= 0) {
    player.health = 0;
    screen = 'over';
    document.getElementById('over-text').textContent =
      'The Solmar Bay PD got you this time. Your cash and missions are saved — try again, Rex.';
    showOnly('over');
    announce('Wasted. Game over.');
  }
}

function stepPlayer(dt, move) {
  if (playerCar) return;
  const speed = move.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  player.heading += move.turn * PLAYER.turnSpeed * dt * (move.forward !== 0 ? 1 : 0.6);
  const moving = move.forward !== 0;
  const stepSpeed = moving ? speed * move.forward : 0;
  const nx = player.x + Math.sin(player.heading) * stepSpeed * dt;
  const nz = player.z + Math.cos(player.heading) * stepSpeed * dt;
  if (!city.collides(nx, nz, PLAYER.radius)) {
    player.x = nx;
    player.z = nz;
  }
  player.speed = stepSpeed;
  player.walkPhase += dt * Math.abs(stepSpeed) * 1.6;
  player.mesh.position.set(player.x, Math.abs(Math.sin(player.walkPhase)) * 0.05, player.z);
  player.mesh.rotation.y = player.heading;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
}

function stepWorld(dt, move) {
  // Camera orbit from mouse drag.
  camYaw += input.takeDrag() * 0.004;
  if (playerCar) {
    player.speed = driveCar(playerCar, move, dt, city);
    audio.setEngine(player.speed, true);
    // Running over pedestrians is a crime.
    for (const ped of pedestrians.peds) {
      if (ped.down) continue;
      const d = Math.hypot(ped.mesh.position.x - playerCar.mesh.position.x, ped.mesh.position.z - playerCar.mesh.position.z);
      if (d < 2.2 && Math.abs(player.speed) > 5) {
        pedestrians.knockDown(ped);
        police.addCrime(1);
        hud.showToast('You hit a pedestrian! Wanted level up.');
      }
    }
  } else {
    stepPlayer(dt, move);
    audio.setEngine(0, false);
  }
  traffic.step(dt, playerPos());
  pedestrians.step(dt, playerPos(), 14);
  const events = police.step(dt, playerPos(), Math.abs(player.speed), (amount) => damagePlayer(amount, 'Ram by a police cruiser'));
  if (events.rammed) audio.siren();
  if (police.wanted > 0) {
    sirenTimer -= dt;
    if (sirenTimer <= 0) { audio.siren(); sirenTimer = 1.4; }
  }
  combat.step(dt);

  // Missions: move the beacon, check the stage, pay out.
  const target = missions.targetPos();
  if (target) {
    city.beacon.position.set(target.x, 0, target.z);
    city.beacon.visible = true;
    city.beacon.rotation.y += dt * 0.8;
  } else {
    city.beacon.visible = false;
  }
  const pos = playerPos();
  const result = missions.update(pos, !!playerCar, null);
  if (result && result.reached) {
    if (result.storyDone) {
      hud.showToast('Story complete! Solmar Bay is yours, Rex. $' + result.mission.reward + ' earned.');
      audio.cash();
      missions.save(pos, player.health, police.wanted);
    } else if (result.nextMission) {
      hud.showToast(`${result.mission.title} complete! +$${result.mission.reward}. Next: ${result.nextMission.title}`);
      audio.cash();
      missions.save(pos, player.health, police.wanted);
    } else {
      hud.showToast(`Objective done: ${result.stage.label}`);
    }
  } else if (result && result.needCar) {
    hud.showToast('This stage needs a car — steal one and drive it there.');
  }

  // Shooting (on foot): raycast from the camera centre.
  if (input.takeShoot() && !playerCar && screen === 'play') {
    audio.ensure();
    const shotTargets = [
      ...pedestrians.peds.filter((p) => !p.down).map((p) => ({ mesh: p.mesh, kind: 'ped', ref: p })),
      ...traffic.cars.map((c) => ({ mesh: c.mesh, kind: 'car', ref: c })),
      ...police.cruisers.map((c) => ({ mesh: c.mesh, kind: 'police', ref: c })),
    ];
    const fired = combat.shoot(new THREE.Vector3(player.x, 0, player.z), shotTargets, (target) => {
      if (target.kind === 'ped') {
        pedestrians.knockDown(target.ref);
        police.addCrime(1);
        hud.showToast('Pedestrian down! The PD saw that.');
      } else if (target.kind === 'police') {
        target.ref.health -= 34;
        police.addCrime(1);
        if (target.ref.health <= 0) {
          scene.remove(target.ref.mesh);
          police.cruisers.splice(police.cruisers.indexOf(target.ref), 1);
          hud.showToast('Cruiser disabled!');
        }
      } else {
        target.ref.health -= 25;
        if (target.ref.health <= 0) target.ref.targetSpeed = 0;
      }
    });
    if (fired) {
      audio.gunshot();
      police.addCrime(0);
      if (police.wanted === 0) police.addCrime(1);
    }
  }
}

function updateCamera(dt) {
  const pos = playerPos();
  const heading = playerCar ? playerCar.heading : player.heading;
  const camHeading = camYaw;
  const dist = playerCar ? 14 : 10;
  const height = playerCar ? 6.5 : 5;
  const tx = pos.x - Math.sin(camHeading) * dist;
  const tz = pos.z - Math.cos(camHeading) * dist;
  camera.position.set(tx, height, tz);
  camera.lookAt(pos.x + Math.sin(heading) * 2, 1.6, pos.z + Math.cos(heading) * 2);
  void dt;
}

function updateHud() {
  const objective = missions.objectiveText();
  const target = missions.targetPos();
  const pos = playerPos();
  if (target) {
    const dist = Math.hypot(target.x - pos.x, target.z - pos.z);
    objective.dist = `${Math.round(dist)}m to marker`;
  }
  hud.update({
    cash: missions.cash,
    health: player.health,
    wanted: police.wanted,
    objective,
    speed: player.speed,
    carName: playerCar ? playerCar.model.name : 'On foot',
    aiming: !playerCar && screen === 'play',
  });
  hud.drawMinimap(city, pos, playerCar ? playerCar.heading : player.heading, traffic.cars, police.cruisers, target);
}

function saveGame() {
  const ok = missions.save(playerPos(), player.health, police.wanted);
  hud.showToast(ok ? 'Game saved.' : 'Save failed — storage is off in this browser.');
  return ok;
}

function loadGame() {
  const data = missions.load();
  if (!data) { hud.showToast('No saved game found.'); return false; }
  if (playerCar) exitCar();
  player.x = data.playerPos.x;
  player.z = data.playerPos.z;
  player.health = data.health ?? PLAYER.health;
  police.setWanted(data.wanted ?? 0);
  city.pushOut(player, PLAYER.radius);
  player.mesh.position.set(player.x, 0, player.z);
  hud.showToast('Save loaded. Welcome back, Rex.');
  return true;
}

function resetRun() {
  if (playerCar) exitCar();
  police.clear();
  player.x = 0;
  player.z = 26;
  player.heading = Math.PI;
  player.health = PLAYER.health;
  player.invulnerable = 0;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.visible = true;
  missions.startMission(0);
  missions.cash = 0;
}

function startGame(fromSave) {
  audio.ensure();
  audio.startMusic();
  if (fromSave) {
    const data = missions.load();
    if (data) loadGame();
    else resetRun();
  } else {
    resetRun();
  }
  screen = 'play';
  showOnly('play');
  announce(`${STORY_INTRO} Mission 1: Sunset Courier.`);
  hud.showToast(STORY_INTRO, 5200);
}

// Buttons.
document.getElementById('btn-start').addEventListener('click', () => startGame(false));
document.getElementById('btn-continue').addEventListener('click', () => startGame(true));
document.getElementById('btn-resume').addEventListener('click', () => { screen = 'play'; showOnly('play'); });
document.getElementById('btn-save').addEventListener('click', saveGame);
document.getElementById('btn-load').addEventListener('click', () => { loadGame(); screen = 'play'; showOnly('play'); });
document.getElementById('btn-quit').addEventListener('click', () => { screen = 'title'; showOnly('title'); });
document.getElementById('btn-retry').addEventListener('click', () => { resetRun(); screen = 'play'; showOnly('play'); });
document.getElementById('btn-over-title').addEventListener('click', () => { screen = 'title'; showOnly('title'); });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    const muted = audio.setMuted(!audio.isMuted);
    hud.showToast(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (actions & ACTION_PAUSE) {
    if (screen === 'play') {
      screen = 'paused';
      showOnly('paused');
      document.getElementById('pause-stats').textContent =
        `Cash $${missions.cash} · Missions done ${missions.completed} of ${MISSIONS.length} · Wanted ${police.wanted}★`;
      announce('Paused.');
    } else if (screen === 'paused') {
      screen = 'play';
      showOnly('play');
      announce('Playing.');
    }
  }
  if (actions & ACTION_ENTER && screen === 'play') {
    if (playerCar) {
      exitCar();
    } else {
      const car = nearestCar(traffic.cars, player.x, player.z, 4.5);
      if (car) {
        enterCar(car);
        if (car.heist && missions.currentStage() && missions.currentStage().kind === 'steal') {
          hud.showToast('The Coral Coupe is yours! Now lose the heat and deliver it.');
        }
      } else {
        hud.showToast('No car close enough — walk up to one and press E.');
      }
    }
  }
  if (actions & ACTION_MELEE && screen === 'play' && !playerCar) {
    const targets = [
      ...pedestrians.peds.filter((p) => !p.down).map((p) => ({ mesh: p.mesh, kind: 'ped', ref: p })),
    ];
    combat.punch(new THREE.Vector3(player.x, 0, player.z), player.heading, targets, (target) => {
      pedestrians.knockDown(target.ref);
      police.addCrime(1);
      hud.showToast('You knocked them out! The PD saw that.');
    });
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  handleActions();
  if (screen === 'play') {
    const move = input.move();
    stepWorld(STEP, move);
    updateCamera(STEP);
    updateHud();
    renderer.render(scene, camera);
  } else if (screen === 'title') {
    // Slow orbit over the city behind the title card.
    const t = now / 1000;
    camera.position.set(Math.sin(t * 0.05) * 130, 55, Math.cos(t * 0.05) * 130);
    camera.lookAt(0, 8, 0);
    traffic.step(STEP, playerPos());
    pedestrians.step(STEP, playerPos(), 0);
    renderer.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }
  if (saveFlash > 0) saveFlash -= STEP;
}

// ---- Screenshot presets: stage a fixed scene, paint it, signal readiness. ----
function stageShot(name) {
  screen = 'play';
  showOnly('play');
  // A few seconds of traffic and pedestrians so the streets are alive.
  for (let i = 0; i < 240; i += 1) {
    traffic.step(STEP, playerPos());
    pedestrians.step(STEP, playerPos(), 0);
  }
  if (name === 'start') {
    screen = 'title';
    showOnly('title');
    camera.position.set(90, 60, 150);
    camera.lookAt(0, 10, 0);
  } else if (name === 'drive') {
    const car = nearestCar(traffic.cars, 0, 0, 500) || traffic.cars[0];
    enterCar(car);
    police.clear();
    car.mesh.position.set(0, 0, -40);
    car.heading = 0;
    car.speed = 14;
    player.speed = 14;
    camYaw = 0;
    updateCamera(STEP);
    missions.startMission(0);
  } else if (name === 'chase') {
    const car = nearestCar(traffic.cars, 0, 0, 500) || traffic.cars[0];
    enterCar(car);
    car.mesh.position.set(0, 0, -20);
    car.heading = 0;
    car.speed = 18;
    player.speed = 18;
    police.setWanted(3);
    for (let i = 0; i < 4; i += 1) police.step(STEP, playerPos(), 18, null);
    // Park the cruisers where the camera can see them: two ahead closing in,
    // two flanking behind, so the chase reads at a glance.
    const offsets = [[-11, 30], [12, 36], [-22, -18], [20, -25]];
    police.cruisers.forEach((cruiser, i) => {
      const [ox, oz] = offsets[i % offsets.length];
      cruiser.mesh.position.set(car.mesh.position.x + ox, 0, car.mesh.position.z + oz);
      cruiser.heading = Math.atan2(-ox, -oz);
      cruiser.mesh.rotation.y = cruiser.heading;
      cruiser.speed = 6;
    });
    camYaw = 0;
    updateCamera(STEP);
    missions.startMission(1);
    missions.cash = 850;
  } else if (name === 'mission') {
    missions.startMission(0);
    missions.cash = 300;
    player.x = 132;
    player.z = -108;
    player.heading = Math.atan2(150 - player.x, -130 - player.z);
    player.mesh.position.set(player.x, 0, player.z);
    camYaw = player.heading;
    updateCamera(STEP);
  }
  updateHud();
  let painted = 0;
  function paint() {
    if (name === 'chase' || name === 'drive') {
      traffic.step(STEP, playerPos());
      if (name === 'chase') police.step(STEP, playerPos(), 18, null);
    }
    updateCamera(STEP);
    updateHud();
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 4) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) {
  stageShot(shot);
} else {
  showOnly('title');
  announce('Solmar Bay. Press Start to play.');
  requestAnimationFrame(frame);
}
