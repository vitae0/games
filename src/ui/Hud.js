import { TouchControls } from '../input/TouchControls.js';
import { isTouchCapable, clampTouchSensitivity } from '../input/TouchMath.js';
import { AVATAR_DEFAULTS, normalizeAvatar } from '../avatar/AvatarConfig.js';

const $ = (selector) => document.querySelector(selector);
const FIELDS = {
  baseModel: [['vroidMale', 'Erkek • VRoid CC0'], ['vroidFemale', 'Kadın • VRoid CC0']],
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
    const key = this.profile.baseModel;
    const label = key === 'vroidFemale' ? 'Kadın' : 'Erkek';
    const loaded = this.options.isBaseReady?.(key);
    const hair = this.options.getHairStatus?.() || 'unknown';
    const hairText = this.profile.hair === 'none' ? 'saçsız' :
      hair === 'ready' ? 'hazır saç yüklendi' : hair === 'error' ?
      'hazır saç yüklenemedi' : 'hazır saç yükleniyor';
    const status = $('#avatar-load-status');
    if (status) status.textContent = `VRoid CC0 • ${label} ${loaded ? 'yüklendi' : 'yükleniyor'} · ${hairText}`;
  }
  buildAvatarFields() {
    const parent = $('#avatar-fields');
    parent.replaceChildren();
    const sections = [
      ['Temel karakter', [['baseModel', 'Karakter']]],
      ['Yüz ve saç', [
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
    for(const [title,fields] of sections) {
      const heading=document.createElement('h3');
      heading.className='character-section-title'; heading.textContent=title;
      parent.append(heading);
      for(const [key,label] of fields) {
        const wrap=document.createElement('div');wrap.className='field';
        const caption=document.createElement('label');
        caption.htmlFor=`avatar-${key}`;caption.textContent=label;
        const sel=document.createElement('select'); sel.id=`avatar-${key}`;
        for(const [value,name] of FIELDS[key]){
          const opt=document.createElement('option');opt.value=value;opt.textContent=name;sel.append(opt);
        }
        sel.addEventListener('change',()=>{
          this.profile[key]=['shirtVisible', 'pantsVisible', 'shoesVisible'].includes(key)
            ? sel.value === 'true' : sel.value;
          this.preview();
          this.updateConditionalControls();
        });
        wrap.append(caption,sel);parent.append(wrap);
      }
    }
    const layerNote=document.createElement('p');
    layerNote.className='small character-info';
    layerNote.textContent='Saçlar eski VRoid HairSample CC0 modellerinden hazır alınır. Dış giysiler VRoid’un kendi üst, pantolon ve ayakkabı mesh’leridir. İç giyim seçeneği orijinal beden dokusudur; ayrı bir iç giyim mesh’i değildir. Eksik gövde yüzeyleri otomatik oluşmaz.';
    parent.append(layerNote);
    this.syncAvatarControls();
  }
  updateConditionalControls() {
    const showClothes = this.profile.outfit !== 'none';
    for (const field of ['shirtVisible','pantsVisible','shoesVisible']) {
      $('#avatar-' + field)?.closest('.field')?.classList.toggle('hidden', !showClothes);
    }
  }
  syncAvatarControls() {
    for(const key of CHARACTER_CONTROL_IDS) {
      const input=$(`#avatar-${key}`);
      if(input)input.value=String(this.profile[key]);
    }
    this.updateConditionalControls();
  }
  preview() {
    this.profile=normalizeAvatar(this.profile);
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
