import * as THREE from 'three';
import { Avatar } from '../avatar/Avatar.js';
import { isSoftModel } from '../avatar/AvatarConfig.js';
import { loadBundledCharacterModel } from '../avatar/ModelImporter.js';

/**
 * Character Studio uses the SAME WebGLRenderer as the world, rendered into a
 * scissored viewport. No extra WebGL context, no second render loop.
 */
export const STUDIO_VIEWS = Object.freeze({
  front: { yaw: 0, pitch: 0, distance: 3.45, focus: .55 },
  side: { yaw: Math.PI / 2, pitch: 0, distance: 3.45, focus: .55 },
  back: { yaw: Math.PI, pitch: 0, distance: 3.45, focus: .55 },
  face: { yaw: 0, pitch: -.035, distance: 1.35, focus: .84 },
});

// The editor opens at a flattering three-quarter angle. The Front bookmark
// deliberately remains a true orthographic-facing yaw of zero.
export const STUDIO_INITIAL_VIEW = Object.freeze({
  ...STUDIO_VIEWS.front, yaw: -.55, pitch: -.16,
});

export function studioFrameBounds(stageRect, canvasRect, pixelWidth, pixelHeight) {
  const sx = pixelWidth / Math.max(1, canvasRect.width);
  const sy = pixelHeight / Math.max(1, canvasRect.height);
  const left = Math.max(canvasRect.left, stageRect.left);
  const right = Math.min(canvasRect.right, stageRect.right);
  const top = Math.max(canvasRect.top, stageRect.top);
  const bottom = Math.min(canvasRect.bottom, stageRect.bottom);
  return {
    x: Math.round((left - canvasRect.left) * sx),
    y: Math.round((canvasRect.bottom - bottom) * sy),
    width: Math.max(0, Math.round((right - left) * sx)),
    height: Math.max(0, Math.round((bottom - top) * sy)),
  };
}

const clamp = THREE.MathUtils.clamp;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export class CharacterStage {
  constructor(viewport, { onStatus = () => {}, onZoom = () => {} } = {}) {
    this.viewport = viewport;
    this.onStatus = onStatus;
    this.onZoom = onZoom;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10141b);
    this.scene.fog = new THREE.Fog(0x10141b, 8, 15);
    this.camera = new THREE.PerspectiveCamera(34, 1, .08, 35);
    this.scene.add(new THREE.HemisphereLight(0xdce9ff, 0x27222a, 2.0));
    const light = (color, power, x, y, z) => {
      const spot = new THREE.DirectionalLight(color, power);
      spot.position.set(x, y, z);
      this.scene.add(spot);
    };
    light(0xffead9, 3.1, -2.5, 5, -4);
    light(0x91b4d5, 1.8, 3, 3, 2);
    light(0xd3ccf5, .8, 2, 1, -3);

    this.decor = [];
    const make = (geometry, material, y, rotation = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      mesh.rotation.x = rotation;
      this.scene.add(mesh);
      this.decor.push(mesh);
      return mesh;
    };
    make(
      new THREE.CylinderGeometry(.98, 1.03, .082, 64),
      new THREE.MeshStandardMaterial({ color: 0x272b31, metalness: .74, roughness: .33 }), -.065,
    );
    make(
      new THREE.CylinderGeometry(.94, .94, .012, 64),
      new THREE.MeshStandardMaterial({ color: 0x393e48, metalness: .7, roughness: .3 }), -.018,
    );
    make(
      new THREE.RingGeometry(1.035, 1.045, 72),
      new THREE.MeshBasicMaterial({ color: 0xc4a57b, transparent: true, opacity: .56, side: THREE.DoubleSide }),
      -.014, -Math.PI / 2,
    );

    this.avatar = null;
    this.active = false;
    this.requestId = 0;
    this.currentModel = null;
    this.pendingModel = null;
    this.targetYaw = STUDIO_INITIAL_VIEW.yaw;
    this.yaw = this.targetYaw;
    this.pitch = STUDIO_INITIAL_VIEW.pitch;
    this.distance = STUDIO_INITIAL_VIEW.distance;
    this.targetDistance = this.distance;
    this.focusRatio = STUDIO_INITIAL_VIEW.focus;
    this.pointer = null;

    this.onPointerDown = event => {
      if (event.button !== 0 || !this.active) return;
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      this.viewport.setPointerCapture?.(event.pointerId);
      this.viewport.classList.add('is-dragging');
      event.preventDefault();
    };
    this.onPointerMove = event => {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.targetYaw += dx * .012;
      this.pitch = clamp(this.pitch + dy * .003, -.38, .42);
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      event.preventDefault();
    };
    this.onPointerUp = event => {
      if (!this.pointer || this.pointer.id !== event.pointerId) return;
      this.pointer = null;
      this.viewport.classList.remove('is-dragging');
      if (this.viewport.hasPointerCapture?.(event.pointerId)) {
        this.viewport.releasePointerCapture(event.pointerId);
      }
    };
    this.onWheel = event => {
      if (!this.active) return;
      event.preventDefault();
      this.zoom(Math.sign(event.deltaY));
    };
    this.onKeyDown = event => {
      if (!this.active) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        this.targetYaw += event.key === 'ArrowLeft' ? -.17 : .17;
        event.preventDefault();
      } else if (event.key === '+' || event.key === '=' || event.key === '-') {
        this.zoom(event.key === '-' ? 1 : -1);
        event.preventDefault();
      }
    };
    viewport.addEventListener('pointerdown', this.onPointerDown);
    viewport.addEventListener('pointermove', this.onPointerMove);
    viewport.addEventListener('pointerup', this.onPointerUp);
    viewport.addEventListener('pointercancel', this.onPointerUp);
    viewport.addEventListener('lostpointercapture', this.onPointerUp);
    viewport.addEventListener('wheel', this.onWheel, { passive: false });
    viewport.addEventListener('keydown', this.onKeyDown);
  }

  setView(name) {
    const view = STUDIO_VIEWS[name];
    if (!view) return;
    // The shortest arc to each camera bookmark is visually less jarring.
    this.targetYaw += wrap(view.yaw - this.targetYaw);
    this.pitch = view.pitch;
    this.focusRatio = view.focus;
    this.targetDistance = view.distance;
    this.onZoom(this.targetDistance);
  }

  focusAnatomy(tab) {
    const focus = {
      model: [3.45, .55],
      face: [1.35, .84],
      body: [2.95, .52],
      chest: [2.25, .69],
      arms: [2.9, .62],
      legs: [2.70, .28],
      style: [3.45, .55],
    }[tab];
    if (!focus) return;
    this.targetDistance = focus[0];
    this.focusRatio = focus[1];
    this.onZoom(this.targetDistance);
  }

  zoom(direction) {
    this.targetDistance = clamp(this.targetDistance * (direction > 0 ? 1.13 : .885), 1.06, 5.25);
    this.onZoom(this.targetDistance);
  }

  open(profile) {
    this.active = true;
    // Reset the orbit on each opening, including after prior manual rotation.
    this.targetYaw = STUDIO_INITIAL_VIEW.yaw;
    this.pitch = STUDIO_INITIAL_VIEW.pitch;
    this.focusRatio = STUDIO_INITIAL_VIEW.focus;
    this.targetDistance = STUDIO_INITIAL_VIEW.distance;
    this.yaw = this.targetYaw;
    this.distance = this.targetDistance;
    this.onZoom(this.targetDistance);
    this.setProfile(profile);
  }

  setProfile(profile) {
    if (!this.active) return;
    const model = profile.baseModel;
    if (!this.avatar) {
      this.avatar = new Avatar(this.scene, profile);
      this.currentModel = model;
    } else if (this.currentModel !== model) {
      this.avatar.rebuild(profile);
      this.currentModel = model;
    } else {
      this.avatar.updateStyle(profile);
    }
    if (isSoftModel(model)) {
      this.requestId++;
      this.pendingModel = null;
      this.onStatus('VITAE SOFT / REAL-TIME');
    } else if (this.avatar.external?.source === 'studio:' + model) {
      this.onStatus('VRM / HAZIR');
    } else if (this.pendingModel !== model) {
      this.pendingModel = model;
      const request = ++this.requestId;
      this.onStatus('VRM / YÜKLENİYOR');
      void loadBundledCharacterModel(model).then(asset => {
        if (!this.active || request !== this.requestId || this.currentModel !== model) {
          // The stale import must release its independent geometry/materials.
          const geometries = new Set(), materials = new Set();
          asset.scene.traverse(node => {
            if (!node.isMesh) return;
            if (node.geometry) geometries.add(node.geometry);
            for (const m of Array.isArray(node.material) ? node.material : [node.material]) {
              if (m) materials.add(m);
            }
          });
          geometries.forEach(g => g.dispose());
          materials.forEach(m => m.dispose());
          return;
        }
        this.pendingModel = null;
        this.avatar.applyExternal(asset, 'studio:' + model);
        this.onStatus('VRM / HAZIR');
      }).catch(() => {
        if (request === this.requestId && this.active) {
          this.pendingModel = null;
          this.onStatus('VRM / ÖNİZLEME YÜKLENEMEDİ');
        }
      });
    }
  }

  close() {
    this.active = false;
    this.requestId++;
    this.currentModel = null;
    this.pendingModel = null;
    this.pointer = null;
    this.viewport.classList.remove('is-dragging');
    if (this.avatar) {
      this.avatar.dispose();
      this.avatar = null;
    }
  }

  render(renderer, dt) {
    if (!this.active || !this.avatar) return false;
    const bounds = studioFrameBounds(
      this.viewport.getBoundingClientRect(),
      renderer.domElement.getBoundingClientRect(),
      renderer.domElement.width,
      renderer.domElement.height,
    );
    // Clear the world canvas once, then only draw inside the transparent UI
    // stage: the 3D scene visually belongs to the editor, not the hotel.
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
    renderer.setClearColor(0x0b0e14, 1);
    renderer.clear();
    if (bounds.width < 2 || bounds.height < 2) return true;

    const amount = 1 - Math.exp(-Math.min(dt, .06) * 13);
    this.yaw += wrap(this.targetYaw - this.yaw) * amount;
    this.distance += (this.targetDistance - this.distance) * amount;
    this.avatar.update(Math.min(dt, .035), 0, 'stand');
    const height = this.avatar.profile.height;
    const targetY = height * this.focusRatio;
    const orbit = new THREE.Vector3(
      Math.sin(this.yaw) * this.distance,
      targetY + Math.sin(this.pitch) * this.distance,
      -Math.cos(this.yaw) * this.distance,
    );
    this.camera.position.copy(orbit);
    this.camera.lookAt(0, targetY, 0);
    this.camera.aspect = bounds.width / bounds.height;
    this.camera.updateProjectionMatrix();

    renderer.setViewport(bounds.x, bounds.y, bounds.width, bounds.height);
    renderer.setScissor(bounds.x, bounds.y, bounds.width, bounds.height);
    renderer.setScissorTest(true);
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
    return true;
  }

  dispose() {
    this.close();
    this.viewport.removeEventListener('pointerdown', this.onPointerDown);
    this.viewport.removeEventListener('pointermove', this.onPointerMove);
    this.viewport.removeEventListener('pointerup', this.onPointerUp);
    this.viewport.removeEventListener('pointercancel', this.onPointerUp);
    this.viewport.removeEventListener('lostpointercapture', this.onPointerUp);
    this.viewport.removeEventListener('wheel', this.onWheel);
    this.viewport.removeEventListener('keydown', this.onKeyDown);
    this.decor.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.decor = [];
  }
}
