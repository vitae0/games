import * as THREE from 'three';
import './style.css';
import { Hotel } from './world/Hotel.js';
import { Player } from './player/Player.js';
import { Hud } from './ui/Hud.js';
import { WorldActionLabels } from './ui/WorldActionLabels.js';
import { normalizeAvatar } from './avatar/AvatarConfig.js';
import { loadBundledCharacterModel } from './avatar/ModelImporter.js';
import { isTouchCapable } from './input/TouchMath.js';

const PROFILE_KEY = 'vitaeworld.avatar.v2';
const canvas = document.querySelector('#world');
const touchDevice = isTouchCapable(window);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, .08, 1250);
scene.add(camera);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: touchDevice ? 'low-power' : 'high-performance', alpha: false });
} catch (error) {
  document.querySelector('#start-button').disabled = true;
  document.querySelector('#start-hint').textContent = 'Bu cihazda WebGL başlatılamadı. Güncel bir tarayıcı, WebGL2 destekli ekran kartı ve yeterli bellek gerekiyor.';
  throw error;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;

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
let modelRequest = 0;
async function syncBaseModel({ force = false } = {}) {
  const request = ++modelRequest;
  if (player.avatar.profile.baseModel === 'procedural') {
    // Uploaded models remain until reset, unless the user explicitly changes bases.
    if (player.avatar.external && (force || player.avatar.external.source !== 'upload')) {
      player.avatar.clearExternal();
    }
    return;
  }
  const baseModel = player.avatar.profile.baseModel;
  const sourceName = `bundled:${baseModel}`;
  if (player.avatar.external?.source === sourceName && !force) return;
  if (player.avatar.external?.source === 'upload' && !force) return;
  try {
    const model = await loadBundledCharacterModel(baseModel);
    if (request !== modelRequest || player.avatar.profile.baseModel !== baseModel) {
      // The previous in-flight selection is stale: dispose its resources.
      const geometry = new Set(), materials = new Set();
      model.scene.traverse(obj => {
        if (!obj.isMesh) return;
        if (obj.geometry) geometry.add(obj.geometry);
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) if (mat) materials.add(mat);
      });
      geometry.forEach(g => g.dispose());
      materials.forEach(mat => mat.dispose());
      return;
    }
    player.avatar.applyExternal(model, sourceName);
    hud?.refreshModelStatus?.();
  } catch (error) {
    if (request !== modelRequest) return;
    events.toast('Seçilen VRoid modeli yüklenemedi; eski karakter korunuyor');
    console.warn('VRoid base load failed:', error);
  }
}
function updateAvatarProfile(profile) {
  const changedBase = player.avatar.profile.baseModel !== profile.baseModel;
  if (changedBase) player.avatar.rebuild(profile);
  else player.avatar.updateStyle(profile);
  player.handRig.setProfile(profile);
  if (changedBase) void syncBaseModel({ force: true });
}
void syncBaseModel();
player.avatar.onStyleLoad = () => hud?.refreshModelStatus?.();
hud = new Hud(canvas, {
  player,
  setQuality,
  getProfile: () => player.avatar.profile,
  isBaseReady: (baseModel) => player.avatar.external?.source === `bundled:${baseModel}`,
  getHairStatus: () => player.avatar.external?.style?.hairStatus || 'loading',
  previewProfile: (profile) => updateAvatarProfile(profile),
  saveProfile: (profile) => {
    updateAvatarProfile(profile);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
    catch { events.toast('Tarayıcı yerel depolamaya erişemedi.'); }
  },
  selectFloor: (floor) => {
    player.teleport(floor);
    events.toast(`${floor + 47}. kat · Hoş geldin`);
  },
});

const worldActions = new WorldActionLabels({hotel,player,camera,touch:touchDevice});
let prev = performance.now();
let frameCounter = 0;
let lastHudUpdate = 0;
let sampleStart = prev;
let displayedFps = 60;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - prev) / 1000, .05);
  prev = now;
  const speed = player.update(dt);
  hotel.update(dt,player);
  const target = hotel.closestInteraction(player, player.direction);
  if (now - lastHudUpdate >= 100) {
    hud.update(target,player,speed,displayedFps);
    worldActions.update();
    lastHudUpdate=now;
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
  worldActions.dispose();hud?.dispose();player.dispose();hotel.dispose();renderer.dispose();
});
