import { AVATAR_DEFAULTS, AVATAR_FIELDS, AVATAR_RANGES, SKIN_TONES, EYE_COLORS, normalizeAvatar } from '../avatar/AvatarConfig.js';

const $ = (selector) => document.querySelector(selector);
const FIELDS = {
  outfit: [['neon', 'Modern / taş ve keten'], ['stealth', 'Minimal / koyu'], ['chrome', 'Soft / gül tonları']],
  hair: [['bob', 'Bob / katlı'], ['short', 'Kısa'], ['long', 'Uzun'], ['ponytail', 'At kuyruğu'], ['mohawk', 'Dik'], ['none', 'Saçsız']],
  skinTone: Object.keys(SKIN_TONES).map((id,i) => [id, ['Açık', 'Sıcak ten', 'Buğday', 'Esmer', 'Koyu'][i]]),
  eyeColor: Object.keys(EYE_COLORS).map((id,i) => [id, ['Kahverengi', 'Ela', 'Mavi', 'Yeşil'][i]]),
};

export class Hud {
  constructor(canvas, options) {
    this.canvas = canvas; this.options = options;
    this.customizer = $('#customizer');
    this.elevator = $('#elevator');
    this.startScreen = $('#start-screen');
    this.settings = $('#mobile-settings');
    this.touchMode = !!options.touchMode;
    this.touchSensitivity = options.touchSensitivity || 1;
    this.playing = false;
    this.toastNode = $('#toast');
    this.prompt = $('#interact-prompt');
    this.lastToastTimeout = 0;
    this.profile = normalizeAvatar(options.getProfile());
    this.bind();
    this.buildAvatarFields();
    this.bindModelImport();
  }
  bind() {
    $('#start-button').addEventListener('click', () => this.start());
    this.canvas.addEventListener('click', () => {
      if (!this.touchMode && !this.isModalOpen()) this.requestLock();
    });
    document.addEventListener('pointerlockchange', () => this.updateOverlay());
    if (this.touchMode) {
      document.body.classList.add('touch-device');
      $('#touch-quality').value = this.options.quality || 'auto';
      $('#touch-sensitivity').value = String(this.touchSensitivity);
      $('#touch-sensitivity-value').textContent = `${this.touchSensitivity.toFixed(1)}×`;
      $('#touch-quality').addEventListener('change', e => this.options.onQualityChange(e.target.value));
      $('#touch-sensitivity').addEventListener('input', e => {
        this.touchSensitivity = Number(e.target.value);
        $('#touch-sensitivity-value').textContent = `${this.touchSensitivity.toFixed(1)}×`;
        this.options.onSensitivityChange(this.touchSensitivity);
      });
      $('#mobile-settings-toggle').addEventListener('click', () => this.openSettings());
      $('#close-mobile-settings').addEventListener('click', () => this.closeSettings());
      $('#mobile-settings-done').addEventListener('click', () => this.closeSettings());
    }

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
      if (!this.touchMode) this.requestLock();
    }));
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.isSettingsOpen()) this.closeSettings();
        else if (this.isElevatorOpen()) this.closeElevator();
        else if (this.isCustomizerOpen()) this.closeCustomizer();
      }
    });
  }
  bindModelImport() {
    const input = $('#avatar-model');
    const status = $('#avatar-model-status');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      input.disabled = true;
      status.textContent = 'Model işleniyor...';
      try {
        await this.options.loadModel(file);
        status.textContent = `${file.name} · geçici yerel model`;
        this.toast('İskeletli karakter yüklendi');
      } catch (error) {
        status.textContent = `Hata: ${error?.message || 'Bilinmeyen'}`;
        this.toast('Model yüklenemedi');
      } finally {
        input.disabled = false;
        input.value = '';
      }
    });
    $('#avatar-model-reset').addEventListener('click', () => {
      this.options.resetModel();
      status.textContent = 'Varsayılan: kemikli anime karakter';
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
    for (const [key, label] of [['outfit', 'Kıyafet stili'], ['hair', 'Saç modeli'], ['skinTone', 'Ten rengi'], ['eyeColor', 'Göz rengi']]) {
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
    const label = document.createElement('label'); label.textContent = 'İnce gözlük'; label.htmlFor = 'avatar-visor';
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
    $('#avatar-skinTone').value = this.profile.skinTone;
    $('#avatar-eyeColor').value = this.profile.eyeColor;
    $('#avatar-visor').checked = this.profile.visor;
  }
  preview() { this.profile = normalizeAvatar(this.profile); this.options.previewProfile(this.profile); }
  requestLock() { this.canvas.requestPointerLock?.()?.catch?.(() => this.toast('Fare kilidi desteklenmedi.')); }
  start() {
    if (this.touchMode) {
      this.playing = true;
      this.options.onTouchStart?.();
      this.updateOverlay();
    } else this.requestLock();
  }
  updateOverlay() {
    const gameActive = this.touchMode ? this.playing : !!document.pointerLockElement;
    this.startScreen.classList.toggle('hidden', gameActive || this.isModalOpen());
    document.body.classList.toggle('touch-active', this.touchMode && this.playing);
    document.body.classList.toggle('touch-menu', this.isModalOpen());
    if (this.isModalOpen()) this.options.onMenuOpen?.();
  }
  isCustomizerOpen() { return !this.customizer.classList.contains('hidden'); }
  isElevatorOpen() { return !this.elevator.classList.contains('hidden'); }
  isSettingsOpen() { return !this.settings.classList.contains('hidden'); }
  isModalOpen() { return this.isCustomizerOpen() || this.isElevatorOpen() || this.isSettingsOpen(); }
  toggleCustomizer() { this.isCustomizerOpen() ? this.closeCustomizer() : this.openCustomizer(); }
  openCustomizer() {
    this.profile = normalizeAvatar(this.options.getProfile()); this.syncAvatarControls();
    this.customizer.classList.remove('hidden'); $('#save-message').textContent = '';
    document.exitPointerLock?.(); this.updateOverlay();
  }
  closeCustomizer() { this.customizer.classList.add('hidden'); this.updateOverlay(); }
  openElevator() { this.elevator.classList.remove('hidden'); document.exitPointerLock?.(); this.updateOverlay(); }
  closeElevator() { this.elevator.classList.add('hidden'); this.updateOverlay(); }
  openSettings() { this.settings.classList.remove('hidden'); document.exitPointerLock?.(); this.updateOverlay(); }
  closeSettings() { this.settings.classList.add('hidden'); this.updateOverlay(); }
  toast(text) {
    this.toastNode.textContent = text; this.toastNode.classList.remove('hidden');
    clearTimeout(this.lastToastTimeout);
    this.lastToastTimeout = setTimeout(() => this.toastNode.classList.add('hidden'), 2700);
  }
  update(target, player, speed, fps) {
    this.prompt.classList.toggle('hidden', !target || !player.active || this.touchMode);
    if (target && player.active) this.prompt.innerHTML = `<kbd>E</kbd><span></span>`;
    if (target && player.active) this.prompt.querySelector('span').textContent = target.getLabel();
    if (this.touchMode) {
      const interact = $('#touch-interact');
      interact.disabled = !target || !player.active;
      interact.title = target?.getLabel() ?? 'Yakında kullanılabilir eşya yok';
    }
    $('#floor-status').textContent = `${player.floor + 47}. KAT`;
    const held = ['left', 'right'].filter(side => player.hands[side].grip);
    $('#hand-status').textContent = held.length ? `TUTUŞ: ${held.join(' + ').toUpperCase()}` : 'LMB / RMB · ELLER';
    $('#movement-status').textContent = player.posture === 'stand' && (player.postureControls.crouching || player.touch.crouch) ? 'ÇÖMELİYOR' : player.posture === 'sit' || player.posture === 'floorSit' ? 'OTURUYOR' : player.posture === 'kneel' ? 'DİZ ÇÖKMÜŞ' : player.posture === 'rest' ? 'DİNLENİYOR' : speed > 5 ? 'KOŞUYOR' : speed > .1 ? 'YÜRÜYOR' : 'BEKLİYOR';
    $('#position-status').textContent = `${player.position.x.toFixed(1)} / ${player.position.z.toFixed(1)} m`;
    $('#fps').textContent = `${fps} FPS`;
  }
}
