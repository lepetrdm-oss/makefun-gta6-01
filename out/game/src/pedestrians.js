// Pedestrians: simple walking figures on the sidewalks who stroll, chat and flee
// from gunfire. Knocking one down is a crime the police notice.
import * as THREE from 'three';
import { PED_NAMES } from './config.js';

function makePedMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.9, 4, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.85;
  group.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.5, 0.25),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
  );
  legs.position.y = 0.25;
  group.add(legs);
  return group;
}

const SKIN = [0xd83a6e, 0x3a8fd8, 0x7ac74f, 0xe8a13a, 0x8a5fd8, 0xd8d83a];

export function createPedestrians(scene, city, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePedMesh(SKIN[i % SKIN.length]);
    const point = city.randomRoadPoint();
    // Step off the road onto the sidewalk.
    const onXStreet = city.roadXs.some((r) => Math.abs(point.x - r) < 1);
    const x = point.x + (onXStreet ? 8 : 0);
    const z = point.z + (onXStreet ? 0 : 8);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh,
      name: PED_NAMES[i % PED_NAMES.length],
      heading: city.random() * Math.PI * 2,
      speed: 1.1 + city.random() * 0.9,
      walkPhase: city.random() * 6,
      fleeing: 0,
      down: false,
      downTimer: 0,
      targetHeading: city.random() * Math.PI * 2,
    });
  }

  function step(dt, dangerPos, dangerRadius) {
    for (const ped of peds) {
      if (ped.down) {
        ped.downTimer -= dt;
        ped.mesh.rotation.x = ped.downTimer > 0 ? Math.PI / 2 : 0;
        if (ped.downTimer <= 0) {
          ped.down = false;
          ped.mesh.rotation.x = 0;
          ped.mesh.position.y = 0;
          ped.fleeing = 3;
        }
        continue;
      }
      const dx = ped.mesh.position.x - dangerPos.x;
      const dz = ped.mesh.position.z - dangerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dangerPos && dist < dangerRadius) {
        ped.fleeing = 3;
        ped.targetHeading = Math.atan2(dx, dz);
      }
      if (ped.fleeing > 0) {
        ped.fleeing -= dt;
        ped.heading = ped.targetHeading;
        ped.speed = 5.2;
      } else {
        ped.speed = 1.4;
        if (city.random() < dt * 0.15) ped.targetHeading = city.random() * Math.PI * 2;
        let dh = ped.targetHeading - ped.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        ped.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
      }
      const nx = ped.mesh.position.x + Math.sin(ped.heading) * ped.speed * dt;
      const nz = ped.mesh.position.z + Math.cos(ped.heading) * ped.speed * dt;
      if (!city.collides(nx, nz, 0.5)) {
        ped.mesh.position.x = nx;
        ped.mesh.position.z = nz;
      } else {
        ped.targetHeading += Math.PI / 2;
      }
      ped.walkPhase += dt * ped.speed * 2.2;
      ped.mesh.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.06;
      ped.mesh.rotation.y = ped.heading;
    }
  }

  function knockDown(ped) {
    ped.down = true;
    ped.downTimer = 6;
    ped.mesh.rotation.x = Math.PI / 2;
    ped.mesh.position.y = 0.35;
  }

  return { peds, step, knockDown };
}
