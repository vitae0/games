import * as THREE from 'three';

const MAX_ACTIONS = 8;
const MAX_REACH = 2.75;
const overlaps = (a, b, gap = 8) =>
  a.left < b.right + gap && a.right > b.left - gap &&
  a.top < b.bottom + gap && a.bottom > b.top - gap;

/** Project nearby object actions into the visible camera area.
 * Prefer the item the player is looking at rather than whichever is physically closest.
 */
export function collectWorldActions(interactables, player, camera, limit = MAX_ACTIONS) {
  const result = [];
  if (!player || !camera) return result;
  for (const action of interactables) {
    if (action.floor !== player.floor || !action.position || action.isAvailable?.() === false) continue;
    const dx = action.position.x - player.position.x;
    const dz = action.position.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > MAX_REACH || dist < .01) continue;
    const pos = action.labelPosition ?? action.position;
    const world = new THREE.Vector3(pos.x, pos.y + .30, pos.z);
    const local = camera.worldToLocal(world.clone());
    if (local.z >= -.06) continue;
    const projected = world.project(camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) ||
        projected.z < -1 || projected.z > 1) continue;
    if (Math.abs(projected.x) > 1.04 || Math.abs(projected.y) > 1.04) continue;
    const score = .42 * dist + .7 * Math.hypot(projected.x, projected.y);
    result.push({
      action, distance: dist, score,
      x: (projected.x + 1) / 2, y: (1 - projected.y) / 2,
    });
  }
  return result.sort((a, b) => a.score - b.score || a.distance - b.distance).slice(0, limit);
}

/** Each in-world KULLAN button activates the action it actually labels.
 * DOM buttons keep their object identity across frames, so a moving camera cannot
 * silently turn a press on one object into a press on another one.
 */
export class WorldActionLabels {
  constructor({ hotel, player, camera, touch = false, root = document.querySelector('#app') ?? document.body }) {
    this.hotel = hotel;
    this.player = player;
    this.camera = camera;
    this.touch = touch;
    this.pressed = new Map();
    this.root = document.createElement('div');
    this.root.className = 'world-action-layer';
    this.root.setAttribute('aria-label', 'Nesne üzerindeki kullan düğmeleri');
    root.appendChild(this.root);
    this.buttons = Array.from({ length: MAX_ACTIONS }, () => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'world-action-button hidden';
      button.action = null;
      button.addEventListener('pointerdown', event => {
        event.stopPropagation();
        if (event.button !== 0 || !button.action || !this.player.active) return;
        event.preventDefault();
        this.pressed.set(event.pointerId, {
          button, action: button.action, x: event.clientX, y: event.clientY,
        });
        try { button.setPointerCapture?.(event.pointerId); } catch { /* pointer lock */ }
      });
      button.addEventListener('pointermove', event => event.stopPropagation());
      button.addEventListener('pointerup', event => {
        event.preventDefault();
        event.stopPropagation();
        const press = this.pressed.get(event.pointerId);
        if (!press || press.button !== button) return;
        this.pressed.delete(event.pointerId);
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 45) {
          this.activate(press.action);
        }
      });
      button.addEventListener('pointercancel', event => {
        this.pressed.delete(event.pointerId);
        event.stopPropagation();
      });
      // Keyboard focus/Enter/Space remains usable. Pointer activation is handled above.
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (event.detail === 0) this.activate(button.action);
      });
      this.root.appendChild(button);
      return button;
    });
  }

  activate(action) {
    if (action && this.player.active && !this.player.events.isModalOpen() &&
        action.isAvailable?.() !== false) action.activate(this.player);
  }

  position(button, item, placed, reserved, viewportWidth, viewportHeight) {
    button.textContent = 'KULLAN · ' + item.action.getLabel();
    button.setAttribute('aria-label', button.textContent);
    button.classList.remove('hidden');
    const width = button.offsetWidth;
    const height = button.offsetHeight;
    const minTop = Math.max(66, height + 10);
    const minX = width / 2 + 10;
    const maxX = Math.max(minX, viewportWidth - minX);
    const clampX = x => Math.max(minX, Math.min(maxX, x));
    const clampTop = y => Math.max(minTop, Math.min(viewportHeight - 12, y));
    let left = clampX(item.x * viewportWidth);
    let top = clampTop(item.y * viewportHeight);
    for (let attempts = 0; attempts < 12; attempts++) {
      const rect = { left: left - width / 2, right: left + width / 2, top: top - height, bottom: top };
      const collision = [...reserved, ...placed].find(other => overlaps(rect, other));
      if (!collision) break;
      const above = collision.top - 9;
      const below = collision.bottom + height + 9;
      if (above >= minTop) top = clampTop(above);
      else if (below <= viewportHeight - 12) top = clampTop(below);
      else {
        const toLeft = collision.left - width / 2 - 10;
        const toRight = collision.right + width / 2 + 10;
        left = clampX(toLeft >= minX ? toLeft : toRight);
      }
    }
    button.style.left = left + 'px';
    button.style.top = top + 'px';
    placed.push({ left: left - width / 2, right: left + width / 2, top: top - height, bottom: top });
  }

  update() {
    const player = this.player;
    if (!player.active || player.events.isModalOpen()) {
      for (const button of this.buttons) button.classList.add('hidden');
      return;
    }
    // Don't move/remap the target while a finger is pressing its button.
    if (this.pressed.size) return;
    this.camera.updateMatrixWorld();

    // There is no permanent bottom KULLAN button: standing back up must also
    // be possible from the contextual action surface on touch devices.
    const actions = player.posture !== 'stand'
      ? [{ action: this.hotel.closestInteraction(player, player.direction), x: .5, y: .65, distance: 0, score: 0 }]
      : collectWorldActions(this.hotel.interactables, player, this.camera, this.buttons.length);

    const visible = new Set(actions.map(item => item.action));
    for (const button of this.buttons) {
      if (!visible.has(button.action)) {
        button.action = null;
        button.classList.add('hidden');
      }
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const reserved = [];
    const touchActions = this.touch ? document.querySelector('.touch-actions') : null;
    if (touchActions && !touchActions.closest('.hidden')) {
      reserved.push(touchActions.getBoundingClientRect());
    }
    const placed = [];
    for (const item of actions) {
      if (!item.action) continue;
      let button = this.buttons.find(candidate => candidate.action === item.action);
      if (!button) button = this.buttons.find(candidate => !candidate.action);
      if (!button) continue;
      button.action = item.action;
      this.position(button, item, placed, reserved, viewportWidth, viewportHeight);
    }
  }

  dispose() {
    this.pressed.clear();
    this.root.remove();
    this.buttons.length = 0;
  }
}
