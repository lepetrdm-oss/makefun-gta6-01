// Combat: shooting with a raycast from the camera, a tracer and muzzle flash,
// and a close-range punch. Hits damage pedestrians, traffic cars and police.
import * as THREE from 'three';

export function createCombat(scene, camera) {
  const raycaster = new THREE.Raycaster();
  const tracerGeo = new THREE.BufferGeometry();
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe27a });
  const tracer = new THREE.Line(tracerGeo, tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe27a }),
  );
  flash.visible = false;
  scene.add(flash);
  let tracerTimer = 0;
  let cooldown = 0;

  function shoot(shooterPos, targets, onHit) {
    if (cooldown > 0) return false;
    cooldown = 0.28;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 90;
    const meshes = [];
    for (const target of targets) meshes.push(target.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    let end;
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point;
      let root = hit.object;
      while (root.parent && root.parent !== scene) root = root.parent;
      const target = targets.find((t) => t.mesh === root);
      if (target && onHit) onHit(target, hit.point);
    } else {
      end = raycaster.ray.at(90, new THREE.Vector3());
    }
    tracerGeo.setFromPoints([shooterPos.clone().add(new THREE.Vector3(0, 1.3, 0)), end]);
    tracer.visible = true;
    tracerTimer = 0.08;
    flash.position.copy(shooterPos).add(new THREE.Vector3(0, 1.3, 0));
    flash.visible = true;
    return true;
  }

  function punch(playerPos, playerHeading, targets, onHit) {
    const fx = Math.sin(playerHeading);
    const fz = Math.cos(playerHeading);
    for (const target of targets) {
      const dx = target.mesh.position.x - playerPos.x;
      const dz = target.mesh.position.z - playerPos.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < 2.4 && side < 1.2) {
        if (onHit) onHit(target, target.mesh.position);
        return true;
      }
    }
    return false;
  }

  function step(dt) {
    cooldown = Math.max(0, cooldown - dt);
    if (tracerTimer > 0) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) { tracer.visible = false; flash.visible = false; }
    }
  }

  return { shoot, punch, step };
}
