import { TouchControls } from '../input/TouchControls.js';
import { isTouchCapable, clampTouchSensitivity } from '../input/TouchMath.js';
import { AVATAR_DEFAULTS, AVATAR_RANGES, SOFT_AVATAR_FIELDS, normalizeAvatar, switchSoftModel, isSoftModel } from '../avatar/AvatarConfig.js';

const $ = (selector) => document.querySelector(selector);
const FIELDS = {
  baseModel: [['softMale', 'Vitae Soft • erkek'], ['softFemale', 'Vitae Soft • kadın'], ['vroidMale', 'VRoid erkek • eski asset'], ['vroidFemale', 'VRoid kadın • eski asset']],
  hair: [['sample', 'Hazır VRoid HairSample (CC0)'], ['none', 'Yok']],
  hairColor: Object.entries({
    original:'Orijinal saç dokusu', black:'Siyah', chestnut:'Kestane', brown:'Koyu kahve', blonde:'Sarı',
    copper:'Bakır', silver:'Gümüş', pink:'Pembe', blue:'Mavi',
  }),
  eyeColor: Object.entries({
    brown:'Kahverengi', hazel:'Ela', blue:'Mavi', green:'Yeşil', gray:'Gri', violet:'Mor',
  }),
  skinTone: Object.entries({
    porcelain:'Açık', warm:'Doğal', honey:'Buğday', umber:'Esmer', deep:'Koyu',
  }),
  underwear: [['none', 'Düz ten / kıyafetsiz'], ['original', 'VRoid hazır beden dokusu (iç giyim çizimi)']],
  outfit: [['none', 'Yok'], ['neon', 'VRoid orijinal hazır kıyafetleri']],
  shirtVisible: [['true', 'VRoid hazır üst'], ['false', 'Yok']],
  pantsVisible: [['true', 'VRoid hazır pantolon'], ['false', 'Yok']],
  shoesVisible: [['true', 'VRoid hazır ayakkabı'], ['false', 'Yok']],
};
export const CHARACTER_CONTROL_IDS = Object.freeze(Object.keys(FIELDS));


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
    this.refreshModelStatus();
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
  refreshModelStatus() {
    const status = $('#avatar-load-status');
    if (!status) return;
    const key = this.profile.baseModel;
    if (isSoftModel(key)) {
      status.textContent = 'Vitae Soft • ' + (key === 'softFemale' ? 'kadın' : 'erkek') + ' · hazır · harici model yüklenmiyor';
      return;
    }
    const label = key === 'vroidFemale' ? 'Kadın' : 'Erkek';
    const loaded = this.options.isBaseReady?.(key);
    const hair = this.options.getHairStatus?.() || 'unknown';
    const hairText = this.profile.hair === 'none' ? 'saçsız' :
      hair === 'ready' ? 'hazır saç yüklendi' : hair === 'error' ?
      'hazır saç yüklenemedi' : 'hazır saç yükleniyor';
    status.textContent = 'VRoid CC0 • ' + label + (loaded ? ' yüklendi' : ' yükleniyor') + ' · ' + hairText;
  }
  buildAvatarFields() {
    const parent = $('#avatar-fields');
    parent.replaceChildren();

    const heading = (title, cssClass = '') => {
      const el = document.createElement('h3');
      el.className = 'character-section-title ' + cssClass;
      el.textContent = title;
      parent.append(el);
    };
    const wrapField = (key, label, cssClass = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'field ' + cssClass;
      const caption = document.createElement('label');
      caption.htmlFor = 'avatar-' + key;
      caption.textContent = label;
      wrap.append(caption);
      parent.append(wrap);
      return wrap;
    };
    const selectField = (key, label, legacy = false) => {
      const wrap = wrapField(key, label, legacy ? 'legacy-avatar-field' : '');
      const select = document.createElement('select');
      select.id = 'avatar-' + key;
      for (const [value, name] of FIELDS[key]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        select.append(option);
      }
      select.addEventListener('change', () => {
        if (key === 'baseModel') {
          // Selecting the other soft model starts from its own anatomy,
          // while retaining the chosen colour and legacy wardrobe settings.
          this.profile = switchSoftModel(this.profile, select.value);
          this.syncAvatarControls();
        } else {
          this.profile[key] = ['shirtVisible','pantsVisible','shoesVisible'].includes(key)
            ? select.value === 'true' : select.value;
        }
        this.preview();
        this.updateConditionalControls();
      });
      wrap.append(select);
    };
    heading('Karakter türü');
    selectField('baseModel', 'Model');

    const groupFields = (title, keys) => {
      heading(title, 'soft-avatar-field');
      for (const key of keys) {
        const [ , label, unit, step] = SOFT_AVATAR_FIELDS.find(field => field[0] === key);
        const wrap = wrapField(key, label, 'soft-avatar-field');
        const [min, max] = AVATAR_RANGES[key];
        const out = document.createElement('output');
        out.id = 'avatar-' + key + '-value';
        out.htmlFor = 'avatar-' + key;
        const range = document.createElement('input');
        range.id = 'avatar-' + key;
        range.type = 'range';
        range.min = String(min);
        range.max = String(max);
        range.step = String(step);
        range.addEventListener('input', () => {
          this.profile[key] = Number(range.value);
          out.textContent = Number(range.value).toFixed(step < .01 ? 3 : 2) + (unit ? ' ' + unit : '');
          this.preview();
        });
        wrap.append(out, range);
      }
    };

    heading('Renk', 'soft-avatar-field');
    const colorWrap = wrapField('bodyColor', 'Gövde, kafa ve uzuv rengi', 'soft-avatar-field');
    const color = document.createElement('input');
    color.id = 'avatar-bodyColor';
    color.type = 'color';
    color.addEventListener('input', () => {
      this.profile.bodyColor = color.value;
      this.preview();
    });
    colorWrap.append(color);

    groupFields('Baş ve yüz', ['height','headScale','eyeSpacing','eyeLength','neckSize']);
    groupFields('Genel vücut oranları', ['shoulders','waist','hips','torsoDepth']);
    groupFields('Göğüs (ayrı mesh)', ['chestWidth','chestDepth','chestFullness','chestRatio']);
    groupFields('Karın (ayrı mesh)', ['abdomenWidth','abdomenDepth','abdomenFullness']);
    groupFields('Kollar', ['armRatio','upperArmRatio','upperArmSize','forearmSize','handSize']);
    groupFields('Bacaklar ve ayaklar', ['legRatio','legSpacing','thighRatio','thighSize','calfSize','footSize','footLength']);

    const sections = [
      ['Yüz ve hazır saç', [
        ['hair', 'Saç modeli'], ['hairColor', 'Saç rengi'],
        ['eyeColor', 'Göz rengi'], ['skinTone', 'Ten tonu'],
      ]],
      ['İç giyim', [
        ['underwear', 'Orijinal iç giyim dokusu'],
      ]],
      ['Dış giyim (VRoid hazır mesh)', [
        ['outfit', 'Hazır dış kıyafetler'],
        ['shirtVisible', 'Üst parça'], ['pantsVisible', 'Alt parça'], ['shoesVisible', 'Ayakkabı'],
      ]],
    ];
    for (const [title, fields] of sections) {
      heading(title, 'legacy-avatar-field');
      for (const [key, label] of fields) selectField(key, label, true);
    }
    const note = document.createElement('p');
    note.className = 'small character-info legacy-avatar-field';
    note.textContent = 'Eski VRoid/HairSample CC0 varlıkları korunuyor. Sadece eski model seçildiğinde yüklenir.';
    parent.append(note);
    this.syncAvatarControls();
  }
  updateConditionalControls() {
    const soft = isSoftModel(this.profile.baseModel);
    for (const element of document.querySelectorAll('#avatar-fields .soft-avatar-field')) {
      element.classList.toggle('hidden', !soft);
    }
    for (const element of document.querySelectorAll('#avatar-fields .legacy-avatar-field')) {
      element.classList.toggle('hidden', soft);
    }
    if (!soft) {
      const showClothes = this.profile.outfit !== 'none';
      for (const field of ['shirtVisible','pantsVisible','shoesVisible']) {
        $('#avatar-' + field)?.closest('.field')?.classList.toggle('hidden', !showClothes);
      }
    }
  }
  syncAvatarControls() {
    for (const key of CHARACTER_CONTROL_IDS) {
      const input = $('#avatar-' + key);
      if (input) input.value = String(this.profile[key]);
    }
    for (const [key, , unit, step] of SOFT_AVATAR_FIELDS) {
      const input = $('#avatar-' + key);
      if (input) input.value = String(this.profile[key]);
      const output = $('#avatar-' + key + '-value');
      if (output) output.textContent = this.profile[key].toFixed(step < .01 ? 3 : 2) + (unit ? ' ' + unit : '');
    }
    const color = $('#avatar-bodyColor');
    if (color) color.value = this.profile.bodyColor;
    this.updateConditionalControls();
  }
  preview() {
    this.profile = normalizeAvatar(this.profile);
    this.options.previewProfile(this.profile);
    this.refreshModelStatus();
  }
  isCustomizerOpen() { return !this.customizer.classList.contains('hidden'); }
  isElevatorOpen() { return !this.elevator.classList.contains('hidden'); }
  isModalOpen() { return this.isCustomizerOpen() || this.isElevatorOpen() || this.isSettingsOpen(); }
  toggleCustomizer() { this.isCustomizerOpen() ? this.closeCustomizer() : this.openCustomizer(); }
  openCustomizer() {
    this.touchControls?.suspend();
    this.profile = normalizeAvatar(this.options.getProfile());
    this.syncAvatarControls();
    this.customizer.classList.remove('hidden');
    this.restoreFirstPerson = !this.options.player.thirdPerson;
    if (this.restoreFirstPerson) this.options.player.toggleCamera();
    this.refreshModelStatus();
    $('#save-message').textContent = '';
    document.exitPointerLock?.();
    this.startScreen.classList.add('hidden');
  }
  closeCustomizer() {
    this.customizer.classList.add('hidden');
    if (this.restoreFirstPerson && this.options.player.thirdPerson) this.options.player.toggleCamera();
    this.restoreFirstPerson = false;
    this.refreshStartScreen();
  }
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
