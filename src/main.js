import * as THREE from 'three';
import './style.css';
import { Hotel } from './world/Hotel.js';
import { Player } from './player/Player.js';
import { Hud } from './ui/Hud.js';
import { normalizeAvatar } from './avatar/AvatarConfig.js';
import { importCharacterModel } from './avatar/ModelImporter.js';
import { TouchControls } from './mobile/TouchControls.js';
import { resolutionCap } from './mobile/TouchMath.js';

const PROFILE_KEY = 'vitaeworld.avatar.v1';
const SETTINGS_KEY = 'vitaeworld.mobile.v1';
const touchMode = window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 || new URLSearchParams(location.search).has('touch');
function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const quality = ['auto', 'low', 'balanced', 'high'].includes(value.quality) ? value.quality : 'auto';
    const sensitivity = Math.max(.5, Math.min(2, Number(value.sensitivity) || 1));
    return { quality, sensitivity };
  } catch { return { quality: 'auto', sensitivity: 1 }; }
}
const settings = readSettings();
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private browsing */ }
}

const canvas = document.querySelector('#world');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, .08, 650);
scene.add(camera);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: touchMode ? 'low-power' : 'high-performance', alpha: false }); }
catch (error) {
  const start = document.querySelector('#start-screen .hero');
  if (start) start.innerHTML = '<h2>3D görüntüleme açılamadı</h2><p>Bu cihazda WebGL2 desteklenmiyor veya tarayıcıda kapatılmış. Tarayıcıyı güncelleyip donanım hızlandırmasını etkinleştirin.</p>';
  throw error;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;

let maxDpr = resolutionCap(settings.quality, window.devicePixelRatio || 1, touchMode);
let currentDpr = maxDpr;
function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setPixelRatio(currentDpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();

function loadProfile() {
  try { return normalizeAvatar(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')); }
  catch { return normalizeAvatar(); }
}
let hud;
let player;
let touchControls;
const events = {
  toast: (message) => hud?.toast(message),
  openElevator: () => hud?.openElevator(),
  isElevatorOpen: () => hud?.isElevatorOpen() ?? false,
  isModalOpen: () => hud?.isModalOpen() ?? false,
  isCustomizerOpen: () => hud?.isCustomizerOpen() ?? false,
  toggleCustomizer: () => hud?.toggleCustomizer(),
  interact: () => {
    const target = hotel.closestInteraction(player, player.direction);
    if (target) target.activate(player);
  },
};

const hotel = new Hotel(scene, events);
player = new Player(canvas, camera, scene, hotel, loadProfile(), events);
hud = new Hud(canvas, {
  getProfile: () => player.avatar.profile,
  loadModel: async (file) => { const model = await importCharacterModel(file); player.avatar.applyExternal(model); },
  resetModel: () => player.avatar.clearExternal(),
  previewProfile: (profile) => { player.avatar.rebuild(profile); player.handRig.setProfile(profile); },
  saveProfile: (profile) => {
    player.avatar.rebuild(profile);
    player.handRig.setProfile(profile);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
    catch { events.toast('Tarayıcı yerel depolamaya erişemedi.'); }
  },
  touchMode,
  quality: settings.quality,
  touchSensitivity: settings.sensitivity,
  onTouchStart: () => player.setTouchEnabled(true),
  onMenuOpen: () => touchControls?.reset(),
  onQualityChange: quality => {
    settings.quality = quality;
    saveSettings();
    maxDpr = resolutionCap(quality, window.devicePixelRatio || 1, touchMode);
    currentDpr = Math.min(maxDpr, currentDpr);
    if (quality === 'high') currentDpr = maxDpr;
    lowFpsSamples = 0; highFpsSamples = 0;
    resize();
  },
  onSensitivityChange: sensitivity => { settings.sensitivity = sensitivity; saveSettings(); },
  selectFloor: (floor) => {
    player.teleport(floor);
    events.toast(`${floor + 47}. kat · Hoş geldin`);
  },
});
if (touchMode) touchControls = new TouchControls(canvas, player, hud);

let prev = performance.now();
let frameCounter = 0;
let lastHudUpdate = 0;
let sampleStart = prev;
let displayedFps = 60;
let lowFpsSamples = 0;
let highFpsSamples = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - prev) / 1000, .05);
  prev = now;
  hotel.update(dt);
  const speed = player.update(dt);
  const target = hotel.closestInteraction(player, player.direction);
  if (now - lastHudUpdate >= 100) {
    hud.update(target, player, speed, displayedFps);
    lastHudUpdate = now;
  }
  renderer.render(scene, camera);
  frameCounter++;
  if (now - sampleStart >= 1000) {
    displayedFps = Math.round(frameCounter * 1000 / (now - sampleStart));
    frameCounter = 0;
    sampleStart = now;
    if (document.visibilityState === 'visible') {
      lowFpsSamples = displayedFps < (touchMode ? 28 : 42) ? lowFpsSamples + 1 : 0;
      highFpsSamples = displayedFps > (touchMode ? 49 : 58) ? highFpsSamples + 1 : 0;
      const minimumDpr = touchMode ? .55 : .7;
      if (lowFpsSamples >= 3 && currentDpr > minimumDpr) {
        currentDpr = Math.max(minimumDpr, +(currentDpr - .12).toFixed(2));
        lowFpsSamples = 0; highFpsSamples = 0; resize();
      } else if (highFpsSamples >= 8 && currentDpr < maxDpr) {
        currentDpr = Math.min(maxDpr, +(currentDpr + .1).toFixed(2));
        highFpsSamples = 0; lowFpsSamples = 0; resize();
      }
    }
  }
}
requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => {
  touchControls?.dispose(); player.dispose(); hotel.dispose(); renderer.dispose();
});
