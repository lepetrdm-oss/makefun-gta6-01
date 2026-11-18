// Missions and the story: a chain of jobs with markers, objectives, cash rewards
// and progression, plus saving and loading the player's progress.
import { MISSIONS, SAVE_KEY } from './config.js';

export function createMissions(city) {
  let missionIndex = 0;
  let stageIndex = 0;
  let cash = 0;
  let completed = 0;
  let active = true;

  function current() {
    return active && missionIndex < MISSIONS.length ? MISSIONS[missionIndex] : null;
  }
  function currentStage() {
    const mission = current();
    return mission ? mission.stages[stageIndex] : null;
  }
  function objectiveText() {
    const mission = current();
    if (!mission) return { title: 'Solmar Bay is yours', text: 'All four jobs done. Free roam, Rex — the city is yours.', dist: '' };
    const stage = mission.stages[stageIndex];
    return { title: mission.title, text: `${stage.label} — ${mission.giver} · $${mission.reward}`, dist: '' };
  }

  function startMission(index) {
    missionIndex = index;
    stageIndex = 0;
    active = true;
  }

  // Called every frame with the player's position. Returns an event object when
  // a stage completes, a mission completes, or the whole story ends.
  function update(playerPos, inCar, events) {
    const mission = current();
    if (!mission) return null;
    const stage = mission.stages[stageIndex];
    if (!stage) return null;
    const dx = playerPos.x - stage.pos[0];
    const dz = playerPos.z - stage.pos[2];
    const dist = Math.hypot(dx, dz);
    const reached = dist < stage.radius;
    if (stage.kind === 'deliver' && !inCar) return { stage, dist, reached: false, needCar: true };
    if (!reached) return { stage, dist, reached: false };
    // Stage done.
    stageIndex += 1;
    if (stageIndex < mission.stages.length) {
      return { stage, dist, reached: true, mission, nextStage: mission.stages[stageIndex] };
    }
    cash += mission.reward;
    completed += 1;
    missionIndex += 1;
    stageIndex = 0;
    if (missionIndex >= MISSIONS.length) {
      active = false;
      return { stage, dist, reached: true, mission, storyDone: true };
    }
    return { stage, dist, reached: true, mission, nextMission: MISSIONS[missionIndex] };
  }

  function targetPos() {
    const stage = currentStage();
    return stage ? { x: stage.pos[0], z: stage.pos[2] } : null;
  }

  function save(playerPos, health, wanted) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash, missionIndex, stageIndex, completed, health, wanted,
        playerPos: { x: playerPos.x, z: playerPos.z },
        savedAt: Date.now(),
      }));
      return true;
    } catch {
      return false;
    }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      cash = data.cash || 0;
      missionIndex = data.missionIndex || 0;
      stageIndex = data.stageIndex || 0;
      completed = data.completed || 0;
      active = missionIndex < MISSIONS.length;
      return data;
    } catch {
      return null;
    }
  }

  return {
    get cash() { return cash; },
    set cash(value) { cash = value; },
    get completed() { return completed; },
    get missionIndex() { return missionIndex; },
    current, currentStage, objectiveText, startMission, update, targetPos, save, load,
  };
}
