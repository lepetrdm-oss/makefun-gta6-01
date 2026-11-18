// The city of Solmar Bay: a procedural road grid by the sea, built from boxes with
// canvas-painted window textures, palms, lamps, a beach and a marina. It also owns the
// building colliders the player, cars and pedestrians use to stay out of walls.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

/** Small deterministic random generator, so a seed always builds the same city. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function windowTexture(random, base, floors) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < 4; c += 1) {
      const lit = random() < 0.42;
      ctx.fillStyle = lit ? '#ffd97a' : '#2c3e55';
      ctx.fillRect(12 + c * 28, 16 + f * (224 / floors), 18, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 4.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 }),
  );
  trunk.position.y = 2.1;
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.9, 4.5, Math.sin(a) * 0.9);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    group.add(leaf);
  }
  return group;
}

/** A glowing gold beacon column marking the current mission target. */
export function makeBeacon() {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd34d, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const column = new THREE.Mesh(geo, mat);
  column.position.y = 30;
  group.add(column);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.18, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd34d }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);
  group.visible = false;
  return group;
}

export function createCity(scene, seed) {
  const random = mulberry32(seed);
  const colliders = [];
  const roadXs = [];
  const roadZs = [];
  for (let i = -3; i <= 3; i += 1) {
    roadXs.push(i * CITY.pitch);
    roadZs.push(i * CITY.pitch);
  }
  const isRoad = (v) => roadXs.some((r) => Math.abs(v - r) < CITY.roadWidth / 2 + 1);

  // Sky, sun, sea fog and the ground slab.
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(0x9fc8e8, 160, 420);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.9);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
  sun.shadow.camera.far = 500;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x7d8a6a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads: dark asphalt strips with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c8 });
  for (const x of roadXs) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, 420), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    road.receiveShadow = true;
    scene.add(road);
    for (let z = -180; z <= 180; z += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.04, z);
      scene.add(dash);
    }
  }
  for (const z of roadZs) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(420, CITY.roadWidth), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    road.receiveShadow = true;
    scene.add(road);
    for (let x = -180; x <= 180; x += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.04, z);
      scene.add(dash);
    }
  }

  // The sea and the sand to the east, plus the marina piers.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 700),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CITY.seaX + 110, 0.05, 0);
  scene.add(sea);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 700),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CITY.seaX - 2, 0.03, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2a });
  for (const pz of [-130, -104, -78]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 6), pierMat);
    pier.position.set(CITY.seaX + 10, 0.4, pz);
    pier.castShadow = true;
    scene.add(pier);
  }

  // Buildings fill every block that is not a road: towers downtown, low shops
  // and houses toward the beach, a hotel row and a park with trees.
  const baseColors = ['#d9c9a8', '#b8c4d4', '#e0a37e', '#8fb8a8', '#c9a8c4', '#a8b8d9'];
  const textures = baseColors.map((c) => windowTexture(random, c, 8 + Math.floor(random() * 8)));
  let texIndex = 0;
  const parkBlocks = new Set(['-1,1', '1,-1']);
  for (let bx = -3; bx <= 3; bx += 1) {
    for (let bz = -3; bz <= 3; bz += 1) {
      const cx = bx * CITY.pitch + CITY.pitch / 2;
      const cz = bz * CITY.pitch + CITY.pitch / 2;
      const key = `${bx},${bz}`;
      if (parkBlocks.has(key)) {
        // A park: grass, palms and a fountain.
        const grass = new THREE.Mesh(
          new THREE.PlaneGeometry(CITY.block, CITY.block),
          new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
        );
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(cx, 0.03, cz);
        grass.receiveShadow = true;
        scene.add(grass);
        for (let i = 0; i < 6; i += 1) {
          const palm = makePalm();
          palm.position.set(cx - 14 + random() * 28, 0, cz - 14 + random() * 28);
          scene.add(palm);
        }
        const fountain = new THREE.Mesh(
          new THREE.CylinderGeometry(4, 4.4, 1, 16),
          new THREE.MeshLambertMaterial({ color: 0x9fc8e8 }),
        );
        fountain.position.set(cx, 0.5, cz);
        scene.add(fountain);
        continue;
      }
      const downtown = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
      const nearBeach = bx >= 2;
      const height = downtown ? 26 + random() * 42 : nearBeach ? 8 + random() * 10 : 10 + random() * 18;
      const w = CITY.block * (0.55 + random() * 0.3);
      const d = CITY.block * (0.55 + random() * 0.3);
      const tex = textures[texIndex % textures.length];
      texIndex += 1;
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, height, d),
        new THREE.MeshLambertMaterial({ map: tex }),
      );
      building.position.set(cx, height / 2, cz);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      // A flat roof cap in a contrasting colour.
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.5, 1.2, d * 0.5),
        new THREE.MeshLambertMaterial({ color: 0x5a6675 }),
      );
      roof.position.set(cx, height + 0.6, cz);
      scene.add(roof);
      colliders.push({ x: cx, z: cz, hx: w / 2 + 0.4, hz: d / 2 + 0.4 });
      // Palms and lamps along the block edges.
      if (random() < 0.7) {
        const palm = makePalm();
        palm.position.set(cx - w / 2 - 4, 0, cz + d / 2 + 3);
        scene.add(palm);
      }
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 5, 6),
        new THREE.MeshLambertMaterial({ color: 0x222222 }),
      );
      lamp.position.set(cx + w / 2 + 3, 2.5, cz - d / 2 - 3);
      scene.add(lamp);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
      );
      bulb.position.set(cx + w / 2 + 3, 5.1, cz - d / 2 - 3);
      scene.add(bulb);
    }
  }

  // A landmark hotel tower on the south strip and a garage on Palm Row.
  const hotel = new THREE.Mesh(
    new THREE.BoxGeometry(30, 46, 18),
    new THREE.MeshLambertMaterial({ map: textures[1], color: 0xffe0b0 }),
  );
  hotel.position.set(-78, 23, 130);
  hotel.castShadow = true;
  scene.add(hotel);
  colliders.push({ x: -78, z: 130, hx: 15.4, hz: 9.4 });

  const beacon = makeBeacon();
  scene.add(beacon);

  function collides(x, z, radius) {
    if (Math.abs(x) > CITY.bound || Math.abs(z) > CITY.bound) return true;
    if (x > CITY.seaX - 6) return true;
    for (const c of colliders) {
      if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return true;
    }
    return false;
  }

  function pushOut(pos, radius) {
    // Nudge a position out of any collider it overlaps, one axis at a time.
    for (const c of colliders) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      if (Math.abs(dx) < c.hx + radius && Math.abs(dz) < c.hz + radius) {
        const px = c.hx + radius - Math.abs(dx);
        const pz = c.hz + radius - Math.abs(dz);
        if (px < pz) pos.x = c.x + Math.sign(dx || 1) * (c.hx + radius);
        else pos.z = c.z + Math.sign(dz || 1) * (c.hz + radius);
      }
    }
    pos.x = Math.max(-CITY.bound, Math.min(CITY.bound, pos.x));
    pos.z = Math.max(-CITY.bound, Math.min(CITY.bound, pos.z));
    if (pos.x > CITY.seaX - 7) pos.x = CITY.seaX - 7;
    return pos;
  }

  function randomRoadPoint() {
    if (random() < 0.5) return { x: roadXs[Math.floor(random() * roadXs.length)], z: -180 + random() * 360 };
    return { x: -180 + random() * 360, z: roadZs[Math.floor(random() * roadZs.length)] };
  }

  return { random, colliders, roadXs, roadZs, isRoad, collides, pushOut, randomRoadPoint, beacon };
}
