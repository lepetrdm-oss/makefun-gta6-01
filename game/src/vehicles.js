// Cars: a box-built car factory, the traffic that fills the roads, and the driving
// model for the player's car. Traffic cars follow the street grid and turn at
// intersections; the player can steal any of them with E.
import * as THREE from 'three';
import { CAR, CAR_MODELS, CITY } from './config.js';

export function makeCarMesh(model, isPolice) {
  const group = new THREE.Group();
  const bodyColor = isPolice ? 0x33517e : model.color;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.62, 4.4),
    new THREE.MeshLambertMaterial({ color: bodyColor }),
  );
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.2),
    new THREE.MeshLambertMaterial({ color: isPolice ? 0xdfe8f2 : 0x222d3a }),
  );
  cabin.position.set(0, 1.18, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.55, -0.25);
    group.add(bar);
    const bar2 = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }),
    );
    bar2.position.set(0, 1.55, 0.15);
    group.add(bar2);
    group.userData.lightBar = [bar, bar2];
  }
  group.userData.wheels = wheels;
  return group;
}

function carForward(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

/** Traffic: a set of cars cruising the grid, turning at intersections. */
export function createTraffic(scene, city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const model = CAR_MODELS[Math.floor(city.random() * CAR_MODELS.length)];
    const mesh = makeCarMesh(model, false);
    const point = city.randomRoadPoint();
    const onXStreet = city.roadXs.some((r) => Math.abs(point.x - r) < 1);
    const heading = onXStreet
      ? (city.random() < 0.5 ? 0 : Math.PI)
      : (city.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    mesh.position.set(point.x, 0, point.z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    cars.push({
      mesh, model, heading,
      speed: 7 + city.random() * 5,
      targetSpeed: 9 + city.random() * 5,
      isPolice: false, isPlayer: false, health: 100, sirenPhase: 0,
    });
  }

  function step(dt, playerPos) {
    for (const car of cars) {
      const f = carForward(car.heading);
      // Slow for a car close ahead on the same street.
      let ahead = false;
      for (const other of cars) {
        if (other === car) continue;
        const dx = other.mesh.position.x - car.mesh.position.x;
        const dz = other.mesh.position.z - car.mesh.position.z;
        const along = dx * f.x + dz * f.z;
        const side = Math.abs(dx * f.z - dz * f.x);
        if (along > 0 && along < 9 && side < 2.4) { ahead = true; break; }
      }
      const want = ahead ? 0 : car.targetSpeed;
      car.speed += Math.max(-14 * dt, Math.min(8 * dt, want - car.speed));
      car.mesh.position.x += f.x * car.speed * dt;
      car.mesh.position.z += f.z * car.speed * dt;
      // Turn at an intersection, or wrap around the city edge.
      const nearX = city.roadXs.find((r) => Math.abs(car.mesh.position.x - r) < 1.2);
      const nearZ = city.roadZs.find((r) => Math.abs(car.mesh.position.z - r) < 1.2);
      if (nearX !== undefined && nearZ !== undefined && city.random() < dt * 0.5) {
        const choices = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((h) => h !== car.heading);
        car.heading = choices[Math.floor(city.random() * choices.length)];
        car.mesh.position.x = nearX;
        car.mesh.position.z = nearZ;
      }
      if (Math.abs(car.mesh.position.x) > CITY.bound + 6 || Math.abs(car.mesh.position.z) > CITY.bound + 6) {
        const point = city.randomRoadPoint();
        car.mesh.position.set(point.x, 0, point.z);
        car.heading = city.roadXs.some((r) => Math.abs(point.x - r) < 1)
          ? (city.random() < 0.5 ? 0 : Math.PI)
          : (city.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      }
      car.mesh.rotation.y = car.heading;
      for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += (car.speed * dt) / 0.36;
    }
  }

  return { cars, step };
}

/** The player's car: accelerate, brake, steer, and collide with buildings. */
export function driveCar(car, input, dt, city) {
  const f = carForward(car.heading);
  if (input.forward > 0) car.speed += CAR.accel * dt;
  else if (input.forward < 0) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.5) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.drag * 4 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(car.model.speed, car.speed));
  const steerDir = car.speed >= 0 ? 1 : -1;
  car.heading += input.turn * CAR.steer * steerDir * dt * Math.min(1, Math.abs(car.speed) / 6 + 0.25);
  const nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
  if (city.collides(nx, nz, 1.6)) {
    car.speed *= -0.25;
  } else {
    car.mesh.position.x = nx;
    car.mesh.position.z = nz;
  }
  car.mesh.rotation.y = car.heading;
  for (const wheel of car.mesh.userData.wheels) {
    wheel.rotation.x += (car.speed * dt) / 0.36;
    wheel.rotation.y = input.turn * 0.35;
  }
  return car.speed;
}

/** Find the nearest stealable car to a point, within range. */
export function nearestCar(cars, x, z, range) {
  let best = null;
  let bestD = range;
  for (const car of cars) {
    const dx = car.mesh.position.x - x;
    const dz = car.mesh.position.z - z;
    const d = Math.hypot(dx, dz);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
