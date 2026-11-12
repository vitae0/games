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

/** Consolidate explicitly related actions without changing their exact targets. */
export function groupWorldActions(items, limit = MAX_ACTIONS) {
  const groups = [], keyed = new Map();
  for (const item of items) {
    const id = item.action.groupId;
    let group = id ? keyed.get(id) : null;
    if (group) {
      group.actions.push(item.action);
      if (item.score < group.score) {
        group.action = item.action;
        group.x = item.x;
        group.y = item.y;
        group.score = item.score;
        group.distance = item.distance;
      }
    } else {
      group = { ...item, actions: [item.action] };
      groups.push(group);
      if (id) keyed.set(id, group);
    }
  }
  return groups.sort((a,b)=>a.score-b.score).slice(0,limit);
}

/** Screen-space targeting for pointer-locked desktop clicks. Never infer a
 * target from world-space nearest distance when the cursor misses a badge. */
export function hitWorldAction(items, x, y, width, height, radius = 54) {
  const px = x * width, py = y * height;
  let best = null, bestDistance = radius;
  for (const item of items) {
    const d = Math.hypot(item.x * width - px, item.y * height - py);
    if (d < bestDistance) { best = item; bestDistance = d; }
  }
  return best;
}

/** Each in-world action badge opens the *clicked object*, never a nearby one.
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
    this.choiceActions = null;
    this.choicePanel = document.createElement('div');
    this.choicePanel.className = 'world-action-choices hidden';
    this.choicePanel.setAttribute('role','group');
    this.choicePanel.setAttribute('aria-label','Nesne işlemlerini seç');
    root.appendChild(this.choicePanel);
    this.onChoiceKey = event => {
      if (!this.choiceActions || !/^Digit[1-9]$/.test(event.code)) return;
      const index = Number(event.code.slice(5)) - 1;
      if (index >= this.choiceActions.length) return;
      event.preventDefault(); event.stopImmediatePropagation?.();
      this.choose(index);
    };
    window.addEventListener('keydown', this.onChoiceKey, true);
    this.onOutsideClick = event => {
      if (this.choiceActions && !this.choicePanel.contains(event.target) &&
          !event.target.closest?.('.world-action-button')) this.closeChoices();
    };
    window.addEventListener('pointerdown', this.onOutsideClick, true);
    // Pointer lock delivers mouse input to the canvas, not a projected HTML
    // badge. Test the crosshair against projected badges before Player grip.
    this.onCanvasClick = event => {
      if (event.button !== 0 || !this.player.active || this.player.posture !== 'stand' ||
          this.player.events.isModalOpen() || this.choiceActions) return;
      this.camera.updateMatrixWorld();
      const visible = groupWorldActions(collectWorldActions(
        this.hotel.interactables, this.player, this.camera, MAX_ACTIONS * 3));
      const rect = this.player.canvas.getBoundingClientRect();
      const locked = document.pointerLockElement === this.player.canvas;
      const x = locked ? .5 : (event.clientX - rect.left) / rect.width;
      const y = locked ? .5 : (event.clientY - rect.top) / rect.height;
      const item = hitWorldAction(visible,x,y,rect.width,rect.height);
      if (!item) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
      this.activate(item.action,item.actions);
    };
    this.player.canvas.addEventListener('mousedown',this.onCanvasClick,true);
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
          button, action: button.action, actions: button.actions, x: event.clientX, y: event.clientY,
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
          this.activate(press.action, press.actions, press.button);
        }
      });
      button.addEventListener('pointercancel', event => {
        this.pressed.delete(event.pointerId);
        event.stopPropagation();
      });
      button.addEventListener('lostpointercapture', event => {
        this.pressed.delete(event.pointerId);
      });
      // Keyboard focus/Enter/Space remains usable. Pointer activation is handled above.
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (event.detail === 0) this.activate(button.action, button.actions, button);
      });
      this.root.appendChild(button);
      return button;
    });
  }

  closeChoices() {
    this.choiceActions = null;
    this.choicePanel.classList.add('hidden');
    this.choicePanel.replaceChildren();
  }

  choose(index) {
    const choice = this.choiceActions?.[index];
    this.closeChoices();
    if (choice && this.player.active && !this.player.events.isModalOpen() &&
        choice.isAvailable?.() !== false) choice.activate(this.player);
  }

  activate(action, actions = null, anchor = null) {
    if (!action || !this.player.active || this.player.events.isModalOpen()) return;
    const available = (actions ?? (action.groupId
      ? this.hotel.interactables.filter(item => item.groupId === action.groupId &&
          item.floor === this.player.floor &&
          Math.hypot(item.position.x - this.player.position.x,
            item.position.z - this.player.position.z) <= MAX_REACH)
      : [action])).filter(item=>item?.isAvailable?.() !== false);
    if (available.length < 2) {
      this.closeChoices();
      available[0]?.activate(this.player);
      return;
    }
    this.choiceActions = available.slice(0,9);
    this.choicePanel.replaceChildren();
    for (let i = 0; i < this.choiceActions.length; i++) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'world-action-choice';
      option.textContent = (i + 1) + ' · ' + this.choiceActions[i].getLabel();
      option.addEventListener('pointerdown', event => event.stopPropagation());
      option.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation(); this.choose(i);
      });
      this.choicePanel.appendChild(option);
    }
    const x = anchor ? parseFloat(anchor.style.left) : window.innerWidth / 2;
    const y = anchor ? parseFloat(anchor.style.top) : window.innerHeight * .62;
    this.choicePanel.style.left = Math.max(110,Math.min(window.innerWidth-110,x)) + 'px';
    this.choicePanel.style.top = Math.max(105,Math.min(window.innerHeight-100,y-20)) + 'px';
    this.choicePanel.classList.remove('hidden');
  }

  position(button, item, placed, reserved, viewportWidth, viewportHeight) {
    const label = item.action.getLabel();
    const prefix = label.split(' · ')[0];
    button.textContent = item.actions.length > 1 ? prefix + ' · ' + item.actions.length + ' işlem'
      : label;
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
      this.closeChoices();
      for (const button of this.buttons) button.classList.add('hidden');
      return;
    }
    // Don't move/remap the target while a finger is pressing its button.
    if (this.pressed.size || this.choiceActions) return;
    this.camera.updateMatrixWorld();

    // There is no permanent bottom KULLAN button: standing back up must also
    // be possible from the contextual action surface on touch devices.
    const raw = player.posture !== 'stand'
      ? [{ action: this.hotel.closestInteraction(player, player.direction), x: .5, y: .65, distance: 0, score: 0 }]
      : collectWorldActions(this.hotel.interactables, player, this.camera, this.buttons.length * 3);
    const actions = groupWorldActions(raw.filter(item=>item.action),this.buttons.length);

    const visible = new Set(actions.map(item => item.action));
    for (const button of this.buttons) {
      if (!visible.has(button.action)) {
        button.action = null;
        button.actions = null;
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
      button.actions = item.actions;
      this.position(button, item, placed, reserved, viewportWidth, viewportHeight);
    }
  }

  dispose() {
    this.pressed.clear();
    this.closeChoices();
    window.removeEventListener('keydown', this.onChoiceKey, true);
    window.removeEventListener('pointerdown', this.onOutsideClick, true);
    this.player.canvas.removeEventListener('mousedown',this.onCanvasClick,true);
    this.choicePanel.remove();
    this.root.remove();
    this.buttons.length = 0;
  }
}
