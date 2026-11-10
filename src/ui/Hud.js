import { AVATAR_DEFAULTS, AVATAR_FIELDS, AVATAR_RANGES, normalizeAvatar } from '../avatar/AvatarConfig.js';

const $ = (selector) => document.querySelector(selector);
const FIELDS = {
  outfit: [['neon', 'Neon Runner'], ['stealth', 'Stealth / Blackout'], ['chrome', 'Chrome / Streetwear']],
  hair: [['short', 'Kısa'], ['mohawk', 'Mohawk'], ['none', 'Saçsız']],
};

export class Hud {
  constructor(canvas, options) {
    this.canvas = canvas; this.options = options;
    this.customizer = $('#customizer');
    this.elevator = $('#elevator');
    this.startScreen = $('#start-screen');
    this.toastNode = $('#toast');
    this.prompt = $('#interact-prompt');
    this.lastToastTimeout = 0;
    this.profile = normalizeAvatar(options.getProfile());
    this.bind();
    this.buildAvatarFields();
  }
  bind() {
    $('#start-button').addEventListener('click', () => this.canvas.requestPointerLock());
    this.canvas.addEventListener('click', () => {
      if (!this.isModalOpen()) this.canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.startScreen.classList.toggle('hidden', !!document.pointerLockElement || this.isModalOpen());
    });
    $('#avatar-toggle').addEventListener('click', () => this.toggleCustomizer());
    $('#close-customizer').addEventListener('click', () => this.closeCustomizer());
    $('#avatar-reset').addEventListener('click', () => { this.profile = normalizeAvatar(AVATAR_DEFAULTS); this.syncAvatarControls(); this.preview(); });
    $('#avatar-save').addEventListener('click', () => {
      this.options.saveProfile(this.profile); $('#save-message').textContent = 'Karakter ayarları tarayıcıda kaydedildi.'; this.toast('Karakter profili kaydedildi');
    });
    $('#close-elevator').addEventListener('click', () => this.closeElevator());
    document.querySelectorAll('[data-floor]').forEach(btn => btn.addEventListener('click', () => {
      const floor = Number(btn.dataset.floor);
      this.options.selectFloor(floor);
      this.closeElevator();
      this.canvas.requestPointerLock();
    }));
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.isElevatorOpen()) this.closeElevator();
        else if (this.isCustomizerOpen()) this.closeCustomizer();
      }
    });
  }
  buildAvatarFields() {
    const parent = $('#avatar-fields'); parent.replaceChildren();
    for (const [key, label, unit, step] of AVATAR_FIELDS) {
      const wrap = document.createElement('div'); wrap.className = 'field';
      const head = document.createElement('div');
      const caption = document.createElement('label'); caption.textContent = label;
      const output = document.createElement('output');
      const input = document.createElement('input'); input.type = 'range'; input.id = `avatar-${key}`;
      input.min = String(AVATAR_RANGES[key][0]); input.max = String(AVATAR_RANGES[key][1]); input.step = String(step);
      caption.htmlFor = input.id;
      input.addEventListener('input', () => {
        this.profile[key] = Number(input.value);
        output.textContent = `${this.profile[key].toFixed(step === .005 ? 3 : 2)} ${unit}`;
        this.preview();
      });
      head.append(caption, output); wrap.append(head, input); parent.append(wrap);
    }
    for (const [key, label] of [['outfit', 'Kıyafet stili'], ['hair', 'Saç modeli']]) {
      const wrap = document.createElement('div'); wrap.className = 'field';
      const head = document.createElement('div');
      const caption = document.createElement('label'); caption.htmlFor = `avatar-${key}`; caption.textContent = label;
      head.append(caption);
      const sel = document.createElement('select'); sel.id = `avatar-${key}`;
      FIELDS[key].forEach(([value, name]) => {
        const opt = document.createElement('option'); opt.value = value; opt.textContent = name; sel.append(opt);
      });
      sel.addEventListener('change', () => { this.profile[key] = sel.value; this.preview(); });
      wrap.append(head, sel); parent.append(wrap);
    }
    const wrap = document.createElement('div'); wrap.className = 'field';
    const label = document.createElement('label'); label.textContent = 'Cyberpunk vizör'; label.htmlFor = 'avatar-visor';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = 'avatar-visor';
    checkbox.addEventListener('change', () => { this.profile.visor = checkbox.checked; this.preview(); });
    wrap.append(label, checkbox); parent.append(wrap);
    this.syncAvatarControls();
  }
  syncAvatarControls() {
    for (const [key,, unit, step] of AVATAR_FIELDS) {
      $(`#avatar-${key}`).value = String(this.profile[key]);
      $(`#avatar-${key}`).parentElement.querySelector('output').textContent = `${this.profile[key].toFixed(step === .005 ? 3 : 2)} ${unit}`;
    }
    $('#avatar-outfit').value = this.profile.outfit;
    $('#avatar-hair').value = this.profile.hair;
    $('#avatar-visor').checked = this.profile.visor;
  }
  preview() { this.profile = normalizeAvatar(this.profile); this.options.previewProfile(this.profile); }
  isCustomizerOpen() { return !this.customizer.classList.contains('hidden'); }
  isElevatorOpen() { return !this.elevator.classList.contains('hidden'); }
  isModalOpen() { return this.isCustomizerOpen() || this.isElevatorOpen(); }
  toggleCustomizer() { this.isCustomizerOpen() ? this.closeCustomizer() : this.openCustomizer(); }
  openCustomizer() { this.profile = normalizeAvatar(this.options.getProfile()); this.syncAvatarControls(); this.customizer.classList.remove('hidden'); $('#save-message').textContent = ''; document.exitPointerLock?.(); this.startScreen.classList.add('hidden'); }
  closeCustomizer() { this.customizer.classList.add('hidden'); this.startScreen.classList.toggle('hidden', !!document.pointerLockElement); }
  openElevator() { this.elevator.classList.remove('hidden'); document.exitPointerLock?.(); this.startScreen.classList.add('hidden'); }
  closeElevator() { this.elevator.classList.add('hidden'); this.startScreen.classList.toggle('hidden', !!document.pointerLockElement); }
  toast(text) {
    this.toastNode.textContent = text; this.toastNode.classList.remove('hidden');
    clearTimeout(this.lastToastTimeout);
    this.lastToastTimeout = setTimeout(() => this.toastNode.classList.add('hidden'), 2700);
  }
  update(target, player, speed, fps) {
    this.prompt.classList.toggle('hidden', !target || !player.active);
    if (target && player.active) this.prompt.innerHTML = `<kbd>E</kbd><span></span>`;
    if (target && player.active) this.prompt.querySelector('span').textContent = target.getLabel();
    $('#floor-status').textContent = `${player.floor + 47}. KAT`;
    const held = ['left', 'right'].filter(side => player.hands[side].grip);
    $('#hand-status').textContent = held.length ? `TUTUŞ: ${held.join(' + ').toUpperCase()}` : 'LMB / RMB · ELLER';
    $('#movement-status').textContent = player.posture === 'sit' || player.posture === 'floorSit' ? 'OTURUYOR' : player.posture === 'kneel' ? 'DİZ ÇÖKMÜŞ' : player.posture === 'rest' ? 'DİNLENİYOR' : speed > 5 ? 'KOŞUYOR' : speed > .1 ? 'YÜRÜYOR' : 'BEKLİYOR';
    $('#position-status').textContent = `${player.position.x.toFixed(1)} / ${player.position.z.toFixed(1)} m`;
    $('#fps').textContent = `${fps} FPS`;
  }
}
