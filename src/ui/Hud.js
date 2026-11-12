import { TouchControls } from '../input/TouchControls.js';
import { isTouchCapable, clampTouchSensitivity } from '../input/TouchMath.js';
import { AVATAR_DEFAULTS, AVATAR_RANGES, SOFT_AVATAR_FIELDS, SOFT_MODEL_PRESETS, normalizeAvatar, switchSoftModel, isSoftModel } from '../avatar/AvatarConfig.js';
import { CharacterStage } from './CharacterStage.js';

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

export const STUDIO_TABS = Object.freeze({
  model: { title:'Karakter modeli', subtitle:'İki Vitae Soft gövdesi veya klasik hazır VRoid modelleri.', index:'01' },
  face: { title:'Yüz & baş', subtitle:'Bakışın, başın ve boyun oranların. Küçük detaylar büyük fark yaratır.', index:'02' },
  body: { title:'Vücut mimarisi', subtitle:'Silüetini oluştur. Bel, karın, kalça ve temel oranlar.', index:'03' },
  chest: { title:'Göğüs & klavikula', subtitle:'Göğüs hacmi, köprücük kemikleri ve boyun bağlantısını şekillendir.', index:'04' },
  arms: { title:'Kollar & eller', subtitle:'Üst kol, ön kol ve el formunu hassas biçimde ayarla.', index:'05' },
  legs: { title:'Bacaklar & ayaklar', subtitle:'Duruş, bacak oranları ve ayak boyutları.', index:'06' },
  style: { title:'Görünüm & stil', subtitle:'Renk paletini seç, hazır modellerde saç ve kıyafeti düzenle.', index:'07' },
});
const STUDIO_SWATCHES = Object.freeze([
  '#a9c4fb','#e4bda3','#f2d6c6','#c99065','#9b614a','#683f36','#ced2cb',
  '#cab6db','#a8d5c7','#a4acc6','#dfada8','#8e9cb0','#282f3d','#dbcec0',
]);
const STUDIO_MODEL_CARDS = Object.freeze([
  ['softMale','01 / VITAE SOFT','ERKEK'],
  ['softFemale','02 / VITAE SOFT','KADIN'],
  ['vroidMale','03 / CLASSIC','VRM ERKEK'],
  ['vroidFemale','04 / CLASSIC','VRM KADIN'],
]);


export class Hud {
  constructor(canvas, options) {
    this.canvas = canvas; this.options = options;
    this.customizer = $('#customizer');
    this.elevator = $('#elevator');
    this.settings = $('#settings');
    this.startScreen = $('#start-screen');
    this.toastNode = $('#toast');
    this.lastToastTimeout = 0;
    this.profile = normalizeAvatar(options.getProfile());
    this.studioTab = 'model';
    this.studioHistory = [];
    this.studioHistoryIndex = -1;
    this.studioLastEdit = { key: null, time: 0 };
    this.studioStage = new CharacterStage($('#studio-viewport'), {
      onStatus: text => { $('#studio-render-status').textContent = text; },
      onZoom: distance => {
        $('#studio-zoom-display').textContent = Math.round(345 / distance) + '%';
      },
    });
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
    $('#avatar-reset').addEventListener('click', () => {
      this.profile = switchSoftModel(this.profile, this.profile.baseModel);
      this.profile = normalizeAvatar({
        ...this.profile, ...(SOFT_MODEL_PRESETS[this.profile.baseModel] || {}),
      });
      this.commitStudioEdit('reset-all');
      this.syncAvatarControls();
      this.preview();
    });
    $('#avatar-save').addEventListener('click', () => {
      this.options.saveProfile(this.profile);
      $('#save-message').textContent = 'KAYDEDİLDİ / BU CİHAZ';
      this.studioOriginal = JSON.stringify(this.profile);
      this.updateStudioHistoryButtons();
      this.toast('Karakter profili kaydedildi');
    });
    $('#studio-undo').addEventListener('click', () => this.stepStudioHistory(-1));
    $('#studio-redo').addEventListener('click', () => this.stepStudioHistory(1));
    $('#studio-reset-group').addEventListener('click', () => this.resetStudioGroup());
    $('#studio-randomize').addEventListener('click', () => this.randomizeStudioGroup());
    $('#studio-search').addEventListener('input', () => this.refreshStudioSection());
    document.querySelectorAll('.studio-rail button[data-studio-tab]').forEach(button => {
      button.addEventListener('click', () => this.setStudioTab(button.dataset.studioTab));
    });
    document.querySelectorAll('[data-studio-view]').forEach(button => {
      button.addEventListener('click', () => {
        this.studioStage.setView(button.dataset.studioView);
        this.setStudioViewButton(button.dataset.studioView);
      });
    });
    $('#studio-zoom-in').addEventListener('click', () => this.studioStage.zoom(-1));
    $('#studio-zoom-out').addEventListener('click', () => this.studioStage.zoom(1));
    $('#close-elevator').addEventListener('click', () => this.closeElevator());
    document.querySelectorAll('[data-floor]').forEach(btn => btn.addEventListener('click', () => {
      const floor = Number(btn.dataset.floor);
      this.options.selectFloor(floor);
      this.closeElevator();
      if (!this.touchMode) this.canvas.requestPointerLock?.();
    }));
    document.addEventListener('keydown', (e) => {
      if (this.isCustomizerOpen() && (e.ctrlKey || e.metaKey)) {
        if (e.code === 'KeyZ') {
          e.preventDefault();
          this.stepStudioHistory(e.shiftKey ? 1 : -1);
          return;
        }
        if (e.code === 'KeyY') {
          e.preventDefault();
          this.stepStudioHistory(1);
          return;
        }
        if (e.code === 'KeyS') {
          e.preventDefault();
          $('#avatar-save').click();
          return;
        }
      }
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
    this.studioFieldsByTab = {};

    const group = (tab, title, kind = '') => {
      const section = document.createElement('section');
      section.className = 'studio-fields-group ' + kind;
      section.dataset.studioTab = tab;
      const h = document.createElement('h3');
      h.className = 'character-section-title';
      h.textContent = title;
      section.append(h);
      parent.append(section);
      return section;
    };
    const wrapField = (section, key, label, kind = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'field ' + kind;
      wrap.dataset.studioKey = key;
      const caption = document.createElement('label');
      caption.htmlFor = 'avatar-' + key;
      caption.textContent = label;
      wrap.append(caption);
      section.append(wrap);
      return wrap;
    };
    const selectField = (section, key, label) => {
      const wrap = wrapField(section, key, label);
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
          this.profile = switchSoftModel(this.profile, select.value);
          this.syncAvatarControls();
        } else {
          this.profile[key] = ['shirtVisible','pantsVisible','shoesVisible'].includes(key)
            ? select.value === 'true' : select.value;
        }
        this.preview();
        this.commitStudioEdit(key);
        this.refreshStudioSection();
      });
      wrap.append(select);
      return wrap;
    };
    const rangeGroup = (tab, title, keys) => {
      const section = group(tab, title, 'soft-avatar-field');
      this.studioFieldsByTab[tab] ||= [];
      this.studioFieldsByTab[tab].push(...keys);
      for (const key of keys) {
        const [, label, unit, step] = SOFT_AVATAR_FIELDS.find(field => field[0] === key);
        const wrap = wrapField(section, key, label);
        const [min, max] = AVATAR_RANGES[key];
        const out = document.createElement('output');
        out.id = 'avatar-' + key + '-value';
        out.htmlFor = 'avatar-' + key;
        const range = document.createElement('input');
        range.id = 'avatar-' + key;
        range.type = 'range';
        range.min = String(min); range.max = String(max);
        range.step = String(step);
        range.setAttribute('aria-label', label);
        range.addEventListener('input', () => {
          this.profile[key] = Number(range.value);
          out.textContent = Number(range.value).toFixed(step < .01 ? 3 : 2) + (unit ? ' ' + unit : '');
          range.style.setProperty('--fill', (100 * (Number(range.value) - min) / (max - min)) + '%');
          this.preview();
          this.commitStudioEdit(key);
        });
        wrap.append(out, range);
      }
    };

    // Model selection is card-first, but retains its accessible select for
    // keyboard users and to preserve the legacy control ID contract.
    const base = group('model', '01 / SYSTEM ARCHITECTURE');
    const models = document.createElement('div');
    models.className = 'studio-model-card-grid';
    for (const [value, eyebrow, label] of STUDIO_MODEL_CARDS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'studio-model-card';
      card.dataset.model = value;
      card.setAttribute('aria-label', label);
      card.setAttribute('aria-pressed', 'false');
      card.innerHTML = '<span class="studio-model-portrait" aria-hidden="true"></span>'
        + '<span class="studio-card-check" aria-hidden="true">✓</span>'
        + '<span class="studio-card-id">' + eyebrow + '</span>'
        + '<span class="studio-card-name">' + label + '</span>';
      card.addEventListener('click', () => {
        if (this.profile.baseModel === value) return;
        this.profile = switchSoftModel(this.profile, value);
        this.preview();
        this.commitStudioEdit('baseModel');
        this.syncAvatarControls();
      });
      models.append(card);
    }
    base.append(models);
    const description = document.createElement('p');
    description.className = 'studio-model-caption';
    description.textContent = 'Vitae Soft: tamamen ayarlanabilir hafif geometri. VRM: hazır modeller ve giyim seçenekleri.';
    base.append(description);
    selectField(base, 'baseModel', 'Modeli listeden seç');

    rangeGroup('face', 'BAŞ & BOYUN', ['headScale','eyeSpacing','eyeLength','neckSize']);
    rangeGroup('body', 'VÜCUT ORANLARI', ['height','shoulders','waist','hips','torsoDepth']);
    rangeGroup('body', 'KARIN & KALÇA', ['abdomenWidth','abdomenDepth','abdomenFullness','hipSize','gluteSize']);
    rangeGroup('chest', 'GÖĞÜS YAPISI', ['chestWidth','chestDepth','chestFullness','chestRatio']);
    rangeGroup('chest', 'KLAVİKULA & BOYUN BAĞLANTISI', ['upperChestWidth','upperChestDepth','upperChestFullness','clavicleDefinition','trapeziusVolume','neckBaseWidth']);
    rangeGroup('arms', 'KOLLAR & ELLER', ['armSpread','armRatio','upperArmRatio','upperArmSize','forearmSize','handSize']);
    rangeGroup('legs', 'BACAK ORANLARI', ['legRatio','legSpacing','thighRatio','thighSize','calfSize','footSize','footLength']);

    const colorGroup = group('style', 'VITAE SOFT / MATERIAL', 'soft-avatar-field');
    const swatches = document.createElement('div');
    swatches.className = 'studio-swatch-grid';
    for (const hex of STUDIO_SWATCHES) {
      const button = document.createElement('button');
      button.className = 'studio-swatch';
      button.type = 'button';
      button.dataset.color = hex;
      button.style.backgroundColor = hex;
      button.setAttribute('aria-label', 'Ten rengi ' + hex);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        this.profile.bodyColor = hex;
        this.syncAvatarControls();
        this.preview();
        this.commitStudioEdit('bodyColor');
      });
      swatches.append(button);
    }
    colorGroup.append(swatches);
    const colorWrap = wrapField(colorGroup, 'bodyColor', 'Özel renk seç');
    const color = document.createElement('input');
    color.id = 'avatar-bodyColor';
    color.type = 'color';
    color.addEventListener('input', () => {
      this.profile.bodyColor = color.value;
      this.syncAvatarControls();
      this.preview();
      this.commitStudioEdit('bodyColor');
    });
    colorWrap.append(color);
    this.studioFieldsByTab.style = ['bodyColor'];

    const sections = [
      ['YÜZ & HAZIR SAÇ', [['hair','Saç modeli'],['hairColor','Saç rengi'],
        ['eyeColor','Göz rengi'],['skinTone','Ten tonu']]],
      ['İÇ GİYİM', [['underwear','Orijinal iç giyim dokusu']]],
      ['KIYAFETLER / VRM', [['outfit','Hazır dış kıyafet'],['shirtVisible','Üst parça'],
        ['pantsVisible','Alt parça'],['shoesVisible','Ayakkabı']]],
    ];
    for (const [title, fields] of sections) {
      const section = group('style', title, 'legacy-avatar-field');
      for (const [key, label] of fields) selectField(section, key, label);
    }
    this.syncAvatarControls();
    this.setStudioTab('model');
  }

  updateConditionalControls() {
    this.refreshStudioSection();
  }

  refreshStudioSection() {
    const tab = this.studioTab;
    const soft = isSoftModel(this.profile.baseModel);
    const search = ($('#studio-search').value || '').trim().toLocaleLowerCase('tr');
    let count = 0;
    for (const section of document.querySelectorAll('#avatar-fields .studio-fields-group')) {
      const allowed = section.dataset.studioTab === tab
        && (!section.classList.contains('soft-avatar-field') || soft)
        && (!section.classList.contains('legacy-avatar-field') || !soft);
      section.hidden = !allowed;
      if (!allowed) continue;
      let visible = 0;
      for (const field of section.querySelectorAll('.field')) {
        const matched = !search || field.textContent.toLocaleLowerCase('tr').includes(search);
        field.hidden = !matched;
        if (matched) visible++;
      }
      const cards = section.querySelector('.studio-model-card-grid');
      if (cards) {
        cards.hidden = !!search && !'model vitae soft erkek kadın vrm classic'.includes(search);
        if (!cards.hidden) visible += 4;
      }
      if (!visible) section.hidden = true;
      count += visible;
    }
    $('#studio-field-count').textContent = String(count).padStart(2, '0') + (tab === 'model' ? ' SEÇENEK' : ' PARAMETRE');
    $('#studio-empty').classList.toggle('hidden', count > 0);
    const tabInfo = STUDIO_TABS[tab];
    $('#studio-section-title').textContent = tabInfo.title;
    $('#studio-section-description').textContent = tabInfo.subtitle;
    $('#studio-category-index').textContent = tabInfo.index;
    document.querySelectorAll('.studio-rail button[data-studio-tab]').forEach(button => {
      const active = button.dataset.studioTab === tab;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    });
    $('#studio-reset-group').disabled = tab === 'model' || (!soft && tab !== 'style');
    $('#studio-randomize').disabled = !soft && tab !== 'model';
  }

  setStudioTab(tab) {
    if (!STUDIO_TABS[tab]) return;
    this.studioTab = tab;
    $('#studio-search').value = '';
    $('#avatar-fields').scrollTop = 0;
    if (tab === 'face') this.studioStage.setView('face');
    if (tab === 'body' || tab === 'legs' || tab === 'model') this.studioStage.setView('front');
    if (tab === 'chest' || tab === 'arms') this.studioStage.setView('front');
    this.setStudioViewButton(tab === 'face' ? 'face' : 'front');
    this.refreshStudioSection();
  }

  setStudioViewButton(view) {
    document.querySelectorAll('[data-studio-view]').forEach(button => {
      const active = button.dataset.studioView === view;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  syncAvatarControls() {
    for (const key of CHARACTER_CONTROL_IDS) {
      const input = $('#avatar-' + key);
      if (input) input.value = String(this.profile[key]);
    }
    for (const [key, , unit, step] of SOFT_AVATAR_FIELDS) {
      const input = $('#avatar-' + key);
      if (input) {
        input.value = String(this.profile[key]);
        const [min,max] = AVATAR_RANGES[key];
        input.style.setProperty('--fill', 100 * (this.profile[key] - min) / (max - min) + '%');
      }
      const out = $('#avatar-' + key + '-value');
      if (out) out.textContent = this.profile[key].toFixed(step < .01 ? 3 : 2) + (unit ? ' ' + unit : '');
    }
    const color = $('#avatar-bodyColor');
    if (color) color.value = this.profile.bodyColor;
    document.querySelectorAll('.studio-model-card').forEach(button => {
      const active = button.dataset.model === this.profile.baseModel;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.studio-swatch').forEach(button => {
      const active = button.dataset.color.toLowerCase() === this.profile.bodyColor.toLowerCase();
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.refreshStudioSection();
  }

  preview() {
    this.profile = normalizeAvatar(this.profile);
    this.options.previewProfile(this.profile);
    this.studioStage.setProfile(this.profile);
    this.refreshModelStatus();
  }

  commitStudioEdit(key) {
    if (!this.isCustomizerOpen()) return;
    const snapshot = JSON.stringify(this.profile);
    if (snapshot === this.studioHistory[this.studioHistoryIndex]) return;
    const now = performance.now();
    const merged = key === this.studioLastEdit.key
      && (now - this.studioLastEdit.time) < 620
      && this.studioHistoryIndex > 0
      && this.studioHistoryIndex === this.studioHistory.length - 1;
    if (merged) {
      this.studioHistory[this.studioHistoryIndex] = snapshot;
    } else {
      this.studioHistory = this.studioHistory.slice(0, this.studioHistoryIndex + 1);
      this.studioHistory.push(snapshot);
      if (this.studioHistory.length > 75) this.studioHistory.shift();
      this.studioHistoryIndex = this.studioHistory.length - 1;
    }
    this.studioLastEdit = { key, time: now };
    this.updateStudioHistoryButtons();
  }

  stepStudioHistory(direction) {
    const next = this.studioHistoryIndex + direction;
    if (next < 0 || next >= this.studioHistory.length) return;
    this.studioHistoryIndex = next;
    this.profile = normalizeAvatar(JSON.parse(this.studioHistory[next]));
    this.studioLastEdit = { key:null, time:0 };
    this.syncAvatarControls();
    this.preview();
    this.updateStudioHistoryButtons();
  }

  updateStudioHistoryButtons() {
    $('#studio-undo').disabled = this.studioHistoryIndex <= 0;
    $('#studio-redo').disabled = this.studioHistoryIndex >= this.studioHistory.length - 1;
    const dirty = this.studioOriginal !== JSON.stringify(this.profile);
    $('.studio-autosave-indicator')?.classList.toggle('is-dirty', dirty);
    $('#studio-unsaved-label').textContent = dirty ? 'KAYDEDİLMEMİŞ DEĞİŞİKLİK' : 'PROFİL HAZIR';
    $('#studio-model-name').textContent = this.profile.baseModel === 'softFemale'
      ? 'SOFT / FEMALE' : this.profile.baseModel === 'softMale'
        ? 'SOFT / MALE' : this.profile.baseModel === 'vroidFemale'
          ? 'VRM / FEMALE' : 'VRM / MALE';
  }

  resetStudioGroup() {
    const keys = this.studioFieldsByTab[this.studioTab] || [];
    if (!keys.length) return;
    const preset = SOFT_MODEL_PRESETS[this.profile.baseModel] || AVATAR_DEFAULTS;
    const updates = {};
    for (const key of keys) updates[key] = preset[key] ?? AVATAR_DEFAULTS[key];
    this.profile = normalizeAvatar({ ...this.profile, ...updates });
    this.syncAvatarControls();
    this.preview();
    this.commitStudioEdit('reset-' + this.studioTab);
  }

  randomizeStudioGroup() {
    if (this.studioTab === 'model') {
      this.profile = switchSoftModel(this.profile, Math.random() > .5 ? 'softFemale' : 'softMale');
    } else {
      if (!isSoftModel(this.profile.baseModel)) return;
      for (const key of (this.studioFieldsByTab[this.studioTab] || [])) {
        if (key === 'bodyColor') {
          this.profile.bodyColor = STUDIO_SWATCHES[Math.floor(Math.random() * STUDIO_SWATCHES.length)];
          continue;
        }
        const [min,max] = AVATAR_RANGES[key];
        const noise = (Math.random() * 2 - 1) * (max - min) * .095;
        const step = SOFT_AVATAR_FIELDS.find(field => field[0] === key)?.[3] || .01;
        const value = Math.max(min, Math.min(max, this.profile[key] + noise));
        this.profile[key] = Math.round(value / step) * step;
      }
    }
    this.syncAvatarControls();
    this.preview();
    this.commitStudioEdit('random-' + this.studioTab);
  }

  isCustomizerOpen() { return !this.customizer.classList.contains('hidden'); }
  isElevatorOpen() { return !this.elevator.classList.contains('hidden'); }
  isModalOpen() { return this.isCustomizerOpen() || this.isElevatorOpen() || this.isSettingsOpen(); }
  toggleCustomizer() { this.isCustomizerOpen() ? this.closeCustomizer() : this.openCustomizer(); }
  openCustomizer() {
    this.touchControls?.suspend();
    this.profile = normalizeAvatar(this.options.getProfile());
    this.customizer.classList.remove('hidden');
    this.studioHistory = [JSON.stringify(this.profile)];
    this.studioHistoryIndex = 0;
    this.studioOriginal = JSON.stringify(this.profile);
    this.studioLastEdit = { key:null, time:0 };
    this.studioStage.open(this.profile);
    this.syncAvatarControls();
    this.setStudioTab('model');
    this.updateStudioHistoryButtons();
    this.refreshModelStatus();
    $('#save-message').textContent = '';
    document.exitPointerLock?.();
    this.startScreen.classList.add('hidden');
  }
  closeCustomizer() {
    this.customizer.classList.add('hidden');
    this.studioStage.close();
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
    $('#floor-status').textContent = `${player.floor + 47}. KAT`;
    const held = ['left', 'right'].filter(side => player.hands[side].grip);
    $('#hand-status').textContent = held.length ? `TUTUŞ: ${held.join(' + ').toUpperCase()}` : 'LMB / RMB · ELLER';
    $('#movement-status').textContent = player.posture === 'stand' && (player.postureControls.crouching || player.touchCrouch) ? 'ÇÖMELİYOR' : player.posture === 'sit' || player.posture === 'floorSit' ? 'OTURUYOR' : player.posture === 'kneel' ? 'DİZ ÇÖKMÜŞ' : player.posture === 'rest' ? 'DİNLENİYOR' : speed > 5 ? 'KOŞUYOR' : speed > .1 ? 'YÜRÜYOR' : 'BEKLİYOR';
    $('#position-status').textContent = `${player.position.x.toFixed(1)} / ${player.position.z.toFixed(1)} m`;
    $('#fps').textContent = `${fps} FPS`;
  }
  dispose() { this.touchControls?.dispose(); this.studioStage.dispose(); clearTimeout(this.lastToastTimeout); }
}
