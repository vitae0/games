import { TouchControls } from '../input/TouchControls.js';
import { isTouchCapable, clampTouchSensitivity } from '../input/TouchMath.js';
import { AVATAR_DEFAULTS, AVATAR_FIELDS, AVATAR_RANGES, SKIN_TONES, EYE_COLORS, normalizeAvatar } from '../avatar/AvatarConfig.js';

const $ = (selector) => document.querySelector(selector);
const FIELDS = {
  baseModel: [['quaternius', 'Quaternius • 3D Male (deneme)'], ['procedural', 'Önceki geometrik karakter']],
  outfit: [['none', 'Yok • sadece beden'], ['neon', 'Modern / taş ve keten'], ['stealth', 'Minimal / koyu'], ['chrome', 'Soft / gül tonları']],
  hair: [['bob', 'Bob / katlı'], ['short', 'Kısa'], ['long', 'Uzun'], ['ponytail', 'At kuyruğu'], ['mohawk', 'Dik'], ['none', 'Saçsız']],
  skinTone: Object.keys(SKIN_TONES).map((id,i) => [id, ['Açık', 'Sıcak ten', 'Buğday', 'Esmer', 'Koyu'][i]]),
  eyeColor: Object.keys(EYE_COLORS).map((id,i) => [id, ['Kahverengi', 'Ela', 'Mavi', 'Yeşil'][i]]),
};

export class Hud {
  constructor(canvas, options) {
    this.canvas = canvas; this.options = options;
    this.customizer = $('#customizer');
    this.elevator = $('#elevator');
    this.settings = $('#settings');
    this.startScreen = $('#start-screen');
    this.toastNode = $('#toast');
    this.prompt = $('#interact-prompt');
    this.lastToastTimeout = 0;
    this.profile = normalizeAvatar(options.getProfile());
    this.touchMode = isTouchCapable(window);
    this.touchControls = this.touchMode ? new TouchControls($('#mobile-ui'), options.player, {
      toast: (message) => this.toast(message),
      onCustomizer: () => this.toggleCustomizer(),
    }) : null;
    this.initSettings();
    if (this.touchMode) {
      $('#start-button').textContent = 'DOKUN VE OYNA';
      $('#start-hint').textContent = 'Sol joystick hareket, sağ tarafta parmağını sürükle: kamera. Kontrolleri ekrandan kullan; yatay ekran daha geniş görüş sağlar.';
      document.documentElement.classList.add('touch-capable');
    }
    this.bind();
    this.buildAvatarFields();
    this.bindModelImport();
  }
  bind() {
    $('#start-button').addEventListener('click', () => {
      if (this.touchControls) {
        this.touchControls.setEnabled(true);
        this.startScreen.classList.add('hidden');
      } else {
        this.canvas.requestPointerLock?.();
      }
    });
    this.canvas.addEventListener('click', () => {
      if (!this.touchMode && !this.isModalOpen()) this.canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => this.refreshStartScreen());
    $('#settings-toggle').addEventListener('click', () => this.openSettings());
    $('#close-settings').addEventListener('click', () => this.closeSettings());
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
      if (!this.touchMode) this.canvas.requestPointerLock?.();
    }));
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.isElevatorOpen()) this.closeElevator();
        else if (this.isCustomizerOpen()) this.closeCustomizer();
        else if (this.isSettingsOpen()) this.closeSettings();
      }
    });
  }
  initSettings() {
    const read = (key, fallback) => {
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    };
    const sensitivity = clampTouchSensitivity(read('vitaeworld.touchSensitivity', '1.15'));
    $('#touch-sensitivity').value = String(sensitivity);
    $('#sensitivity-value').textContent = `${sensitivity.toFixed(2)}×`;
    this.touchControls?.setSensitivity(sensitivity);
    $('#touch-sensitivity').addEventListener('input', event => {
      const value = clampTouchSensitivity(event.target.value);
      $('#sensitivity-value').textContent = `${value.toFixed(2)}×`;
      this.touchControls?.setSensitivity(value);
      try { localStorage.setItem('vitaeworld.touchSensitivity', String(value)); } catch { /* private mode */ }
    });
    const mode = read('vitaeworld.quality', 'auto');
    $('#quality-mode').value = ['auto', 'low', 'medium', 'high'].includes(mode) ? mode : 'auto';
    this.options.setQuality?.($('#quality-mode').value);
    $('#quality-mode').addEventListener('change', event => {
      this.options.setQuality?.(event.target.value);
      try { localStorage.setItem('vitaeworld.quality', event.target.value); } catch { /* private mode */ }
      this.toast('Grafik ayarı güncellendi');
    });
  }
  refreshStartScreen() {
    this.startScreen.classList.toggle('hidden', !!document.pointerLockElement || !!this.touchControls?.enabled || this.isModalOpen());
  }
  isSettingsOpen() { return !this.settings.classList.contains('hidden'); }
  openSettings() {
    this.touchControls?.suspend();
    this.settings.classList.remove('hidden');
    document.exitPointerLock?.();
    this.startScreen.classList.add('hidden');
  }
  closeSettings() { this.settings.classList.add('hidden'); this.refreshStartScreen(); }
  bindModelImport() {
    const input = $('#avatar-model');
    const status = $('#avatar-model-status');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      input.disabled = true;
      status.textContent = 'Model işleniyor...';
      try {
        const parts = await this.options.loadModel(file);
        this.renderModelParts(parts);
        status.textContent = `${file.name} · ${parts.length} görünürlük parçası · yalnızca bu cihazda`;
        this.toast('3D karakter yüklendi; mesh katmanlarını inceleyebilirsiniz');
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
      this.renderModelParts([]);
      status.textContent = this.profile.baseModel === 'quaternius'
        ? 'Quaternius Superhero Male (CC0) • kıyafet uyumu henüz eklenmedi'
        : 'Geometrik karakter • kıyafet katmanları denenebilir';
    });
    this.renderModelParts(this.options.getModelParts?.() || []);
  }
  renderModelParts(parts = []) {
    const parent = $('#avatar-parts');
    parent.replaceChildren();
    parent.classList.toggle('hidden', !parts.length);
    if (!parts.length) return;
    const title = document.createElement('p');
    title.className = 'small';
    title.textContent = `Modelin ${parts.length} mesh parçası. Giysi olduğu kesin olmayan parçaları da burada kapatabilirsiniz.`;
    parent.append(title);
    const reset = document.createElement('button');
    reset.type = 'button'; reset.textContent = 'TÜM PARÇALARI GÖSTER';
    reset.addEventListener('click', () => {
      for (const part of parts) this.options.setModelPartVisible(part.index, true);
      this.renderModelParts(this.options.getModelParts?.() || []);
    });
    parent.append(reset);
    for (const part of parts) {
      const row = document.createElement('label');
      row.className = 'avatar-mesh-switch';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = part.visible;
      cb.addEventListener('change', () => this.options.setModelPartVisible(part.index, cb.checked));
      const name = document.createElement('span');
      name.textContent = `${part.index + 1}. ${part.name}`;
      row.append(cb, name);
      parent.append(row);
    }
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
    for (const [key, label] of [['baseModel', 'Temel karakter (test)'], ['outfit', 'Kıyafet stili'], ['hair', 'Saç modeli'], ['skinTone', 'Ten rengi'], ['eyeColor', 'Göz rengi']]) {
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
    const garmentNote = document.createElement('p');
    garmentNote.className = 'small';
    garmentNote.textContent = 'Katman testi şimdilik geometrik karakterde çalışır. Quaternius gerçek 3D gövdesine kıyafetler henüz uyarlanmadı.';
    parent.append(garmentNote);
    for (const [key, name] of [
      ['shirtVisible', 'Tişört katmanı'], ['jacketVisible', 'Ceket katmanı'],
      ['pantsVisible', 'Pantolon katmanı'], ['shoesVisible', 'Ayakkabı katmanı'],
    ]) {
      const layerWrap = document.createElement('div'); layerWrap.className = 'field';
      const layerLabel = document.createElement('label'); layerLabel.htmlFor = `avatar-${key}`; layerLabel.textContent = name;
      const layerCheck = document.createElement('input'); layerCheck.type = 'checkbox'; layerCheck.id = `avatar-${key}`;
      layerCheck.addEventListener('change', () => { this.profile[key] = layerCheck.checked; this.preview(); });
      layerWrap.append(layerLabel, layerCheck); parent.append(layerWrap);
    }
    this.syncAvatarControls();
  }
  syncAvatarControls() {
    for (const [key,, unit, step] of AVATAR_FIELDS) {
      $(`#avatar-${key}`).value = String(this.profile[key]);
      $(`#avatar-${key}`).parentElement.querySelector('output').textContent = `${this.profile[key].toFixed(step === .005 ? 3 : 2)} ${unit}`;
    }
    $('#avatar-baseModel').value = this.profile.baseModel;
    $('#avatar-outfit').value = this.profile.outfit;
    $('#avatar-hair').value = this.profile.hair;
    $('#avatar-skinTone').value = this.profile.skinTone;
    $('#avatar-eyeColor').value = this.profile.eyeColor;
    $('#avatar-visor').checked = this.profile.visor;
    for (const key of ['shirtVisible', 'jacketVisible', 'pantsVisible', 'shoesVisible']) {
      $(`#avatar-${key}`).checked = this.profile[key];
    }
  }
  preview() {
    this.profile = normalizeAvatar(this.profile);
    this.options.previewProfile(this.profile);
    const importedParts = this.options.getModelParts?.() || [];
    if (importedParts.length) {
      this.renderModelParts(importedParts);
      $('#avatar-model-status').textContent = `Yerel model aktif · ${importedParts.length} ayrı mesh görünürlük kontrolü`;
      return;
    }
    this.renderModelParts([]);
    $('#avatar-model-status').textContent = this.profile.baseModel === 'quaternius'
      ? 'Quaternius Superhero Male (CC0) • dış kıyafetler henüz uyarlanmadı'
      : 'Geometrik avatar • katmanları ayrı ayrı açıp kapatabilirsiniz';
  }
  isCustomizerOpen() { return !this.customizer.classList.contains('hidden'); }
  isElevatorOpen() { return !this.elevator.classList.contains('hidden'); }
  isModalOpen() { return this.isCustomizerOpen() || this.isElevatorOpen() || this.isSettingsOpen(); }
  toggleCustomizer() { this.isCustomizerOpen() ? this.closeCustomizer() : this.openCustomizer(); }
  openCustomizer() { this.touchControls?.suspend(); this.profile = normalizeAvatar(this.options.getProfile()); this.syncAvatarControls(); this.customizer.classList.remove('hidden'); $('#save-message').textContent = ''; document.exitPointerLock?.(); this.startScreen.classList.add('hidden'); }
  closeCustomizer() { this.customizer.classList.add('hidden'); this.refreshStartScreen(); }
  openElevator() { this.touchControls?.suspend(); this.elevator.classList.remove('hidden'); document.exitPointerLock?.(); this.startScreen.classList.add('hidden'); }
  closeElevator() { this.elevator.classList.add('hidden'); this.refreshStartScreen(); }
  toast(text) {
    this.toastNode.textContent = text; this.toastNode.classList.remove('hidden');
    clearTimeout(this.lastToastTimeout);
    this.lastToastTimeout = setTimeout(() => this.toastNode.classList.add('hidden'), 2700);
  }
  update(target, player, speed, fps) {
    this.prompt.classList.toggle('hidden', !target || !player.active);
    if (target && player.active) this.prompt.innerHTML = `<kbd>${this.touchMode ? 'KULLAN' : 'E'}</kbd><span></span>`;
    if (target && player.active) this.prompt.querySelector('span').textContent = target.getLabel();
    $('#floor-status').textContent = `${player.floor + 47}. KAT`;
    const held = ['left', 'right'].filter(side => player.hands[side].grip);
    $('#hand-status').textContent = held.length ? `TUTUŞ: ${held.join(' + ').toUpperCase()}` : 'LMB / RMB · ELLER';
    $('#movement-status').textContent = player.posture === 'stand' && (player.postureControls.crouching || player.touchCrouch) ? 'ÇÖMELİYOR' : player.posture === 'sit' || player.posture === 'floorSit' ? 'OTURUYOR' : player.posture === 'kneel' ? 'DİZ ÇÖKMÜŞ' : player.posture === 'rest' ? 'DİNLENİYOR' : speed > 5 ? 'KOŞUYOR' : speed > .1 ? 'YÜRÜYOR' : 'BEKLİYOR';
    $('#position-status').textContent = `${player.position.x.toFixed(1)} / ${player.position.z.toFixed(1)} m`;
    $('#fps').textContent = `${fps} FPS`;
  }
  dispose() { this.touchControls?.dispose(); clearTimeout(this.lastToastTimeout); }
}
