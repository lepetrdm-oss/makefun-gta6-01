// The wanted system: stars 1-5, police cruisers that spawn, chase and ram the
// player, and a heat level that cools when the player stays out of trouble.
import * as THREE from 'three';
import { POLICE, WANTED } from './config.js';
import { makeCarMesh } from './vehicles.js';

export function createPolice(scene, city) {
  const cruisers = [];
  let wanted = 0;
  let heatTimer = 0;
  let sirenTimer = 0;

  function addCrime(stars, onSiren) {
    const before = wanted;
    wanted = Math.min(5, wanted + stars);
    heatTimer = WANTED.decaySeconds;
    if (wanted > before && onSiren) onSiren(wanted);
    return wanted;
  }

  function spawnCruiser(targetPos) {
    const mesh = makeCarMesh({ name: 'SBPD Cruiser', color: 0x1c2f4a, speed: POLICE.maxSpeed }, true);
    const angle = city.random() * Math.PI * 2;
    const x = Math.max(-185, Math.min(185, targetPos.x + Math.sin(angle) * POLICE.spawnDistance));
    const z = Math.max(-185, Math.min(185, targetPos.z + Math.cos(angle) * POLICE.spawnDistance));
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const cruiser = {
      mesh, heading: Math.atan2(targetPos.x - x, targetPos.z - z),
      speed: 0, health: 100, sirenPhase: city.random() * 2,
    };
    cruisers.push(cruiser);
    return cruiser;
  }

  // One step: keep the right number of cruisers, steer them at the player, ram.
  // Returns events: { rammed, busted }.
  function step(dt, targetPos, targetSpeed, onDamage) {
    const events = { rammed: false, busted: false };
    if (wanted > 0) {
      heatTimer -= dt;
      if (heatTimer <= 0) {
        wanted = Math.max(0, wanted - 1);
        heatTimer = WANTED.decaySeconds;
      }
      const wantCount = Math.min(wanted + 1, 6);
      while (cruisers.length < wantCount) spawnCruiser(targetPos);
    } else {
      // No heat: cruisers drive off and despawn.
      for (const c of cruisers) {
        c.mesh.position.x += Math.sin(c.heading) * 8 * dt;
        c.mesh.position.z += Math.cos(c.heading) * 8 * dt;
        if (Math.hypot(c.mesh.position.x - targetPos.x, c.mesh.position.z - targetPos.z) > 120) {
          scene.remove(c.mesh);
          cruisers.splice(cruisers.indexOf(c), 1);
        }
      }
    }
    sirenTimer += dt;
    for (const cruiser of cruisers) {
      const dx = targetPos.x - cruiser.mesh.position.x;
      const dz = targetPos.z - cruiser.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - cruiser.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cruiser.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      cruiser.speed += Math.min(POLICE.accel * dt, POLICE.maxSpeed - cruiser.speed);
      if (dist < 4) cruiser.speed *= 0.94;
      cruiser.mesh.position.x += Math.sin(cruiser.heading) * cruiser.speed * dt;
      cruiser.mesh.position.z += Math.cos(cruiser.heading) * cruiser.speed * dt;
      cruiser.mesh.rotation.y = cruiser.heading;
      for (const wheel of cruiser.mesh.userData.wheels) wheel.rotation.x += (cruiser.speed * dt) / 0.36;
      // Flash the light bar.
      cruiser.sirenPhase += dt * 6;
      const [red, blue] = cruiser.mesh.userData.lightBar;
      red.material.color.setHex(Math.sin(cruiser.sirenPhase) > 0 ? 0xff2222 : 0x550000);
      blue.material.color.setHex(Math.sin(cruiser.sirenPhase) > 0 ? 0x002266 : 0x2266ff);
      if (dist < 3.2 && cruiser.speed > 4) {
        events.rammed = true;
        if (onDamage) onDamage(POLICE.ramDamage);
        cruiser.speed *= -0.3;
      }
    }
    return events;
  }

  function clear() {
    wanted = 0;
    heatTimer = 0;
    for (const c of cruisers) scene.remove(c.mesh);
    cruisers.length = 0;
  }

  return {
    get wanted() { return wanted; },
    get cruisers() { return cruisers; },
    get sirenOn() { return wanted > 0 && sirenTimer % 1.4 < 0.7; },
    addCrime, step, clear,
    setWanted(n) { wanted = Math.max(0, Math.min(5, n)); heatTimer = WANTED.decaySeconds; },
  };
}
