import * as THREE from 'three';
import './style.css';
import { Hotel } from './world/Hotel.js';
import { Player } from './player/Player.js';
import { Hud } from './ui/Hud.js';
import { normalizeAvatar } from './avatar/AvatarConfig.js';
import { importCharacterModel } from './avatar/ModelImporter.js';
import { isTouchCapable } from './input/TouchMath.js';

const PROFILE_KEY = 'vitaeworld.avatar.v1';
const canvas = document.querySelector('#world');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, .08, 650);
scene.add(camera);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
} catch (error) {
  document.querySelector('#start-button').disabled = true;
  document.querySelector('#start-hint').textContent = 'Bu cihazda WebGL başlatılamadı. Güncel bir tarayıcı, WebGL2 destekli ekran kartı ve yeterli bellek gerekiyor.';
  throw error;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;

const touchDevice = isTouchCapable(window);
const hardwareDpr = window.devicePixelRatio || 1;
let qualityMode = 'auto';
let maxDpr = Math.min(hardwareDpr, touchDevice ? 1.15 : 1.5);
let currentDpr = maxDpr;
let lowFpsSamples = 0;
let highFpsSamples = 0;
function setQuality(mode) {
  qualityMode = ['auto','low','medium','high'].includes(mode) ? mode : 'auto';
  const requested = { low: .7, medium: 1, high: touchDevice ? 1.35 : 1.65 }[qualityMode];
  maxDpr = Math.min(hardwareDpr, requested ?? (touchDevice ? 1.15 : 1.5));
  currentDpr = maxDpr;
  lowFpsSamples = 0; highFpsSamples = 0;
  resize();
}
function resize() {
  const w = Math.max(1, canvas.clientWidth || window.innerWidth);
  const h = Math.max(1, canvas.clientHeight || window.innerHeight);
  renderer.setPixelRatio(currentDpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = touchDevice && w < h ? 78 : 74;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

function loadProfile() {
  try { return normalizeAvatar(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')); }
  catch { return normalizeAvatar(); }
}
let hud;
let player;
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
  player,
  setQuality,
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
  selectFloor: (floor) => {
    player.teleport(floor);
    events.toast(`${floor + 47}. kat · Hoş geldin`);
  },
});

let prev = performance.now();
let frameCounter = 0;
let lastHudUpdate = 0;
let sampleStart = prev;
let displayedFps = 60;
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
      lowFpsSamples = displayedFps < (touchDevice ? 29 : 42) ? lowFpsSamples + 1 : 0;
      highFpsSamples = displayedFps > (touchDevice ? 52 : 58) ? highFpsSamples + 1 : 0;
      if (qualityMode !== 'auto') { lowFpsSamples = 0; highFpsSamples = 0; }
      const minDpr = touchDevice ? .55 : .7;
      if (qualityMode === 'auto' && lowFpsSamples >= 3 && currentDpr > minDpr) {
        currentDpr = Math.max(minDpr, +(currentDpr - .12).toFixed(2));
        lowFpsSamples = 0; highFpsSamples = 0; resize();
      } else if (qualityMode === 'auto' && highFpsSamples >= 8 && currentDpr < maxDpr) {
        currentDpr = Math.min(maxDpr, +(currentDpr + .1).toFixed(2));
        highFpsSamples = 0; lowFpsSamples = 0; resize();
      }
    }
  }
}
requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => {
  hud?.dispose(); player.dispose(); hotel.dispose(); renderer.dispose();
});
