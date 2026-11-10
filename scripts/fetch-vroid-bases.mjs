/**
 * Fetch the explicitly CC0-licensed VRoid Studio beta base samples at build time.
 * Pin each source to an immutable git commit AND verify git blob SHA-1 to make
 * third-party asset changes visible rather than silently swapping character data.
 *
 * This is NOT a license for current VRoid Studio presets.
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const SOURCES = [
  {
    id: 'vroidMale',
    file: 'vroid-beta-base-male.vrm',
    url: 'https://raw.githubusercontent.com/zz85/midiviz/419ef25fd70465da066e4411f26f47f661411989/violinist/assets/models/vroid-base-male.vrm',
    blob: 'a7de1fd8e1e5787704d995cfddacd7b2e4f29bde',
    min: 17000000,
    max: 19000000,
  },
  {
    id: 'vroidFemale',
    file: 'vroid-beta-base-female.vrm',
    url: 'https://raw.githubusercontent.com/wmehobbs/Abbott-game/0796b0a859aded9629cd802a0c132993b0c6e091/content/meshes/raw/vroid_base_female/unzipped/Base_Female.vrm',
    blob: '1bdb2cafb3076523eed1890c66343a7e6a825bbc',
    min: 15000000,
    max: 18000000,
  },
];

export function gitBlobSha(bytes) {
  const hash = createHash('sha1');
  hash.update(`blob ${bytes.length}\0`);
  hash.update(bytes);
  return hash.digest('hex');
}

export function inspectVrm(bytes) {
  if (bytes.length < 32 || bytes.toString('utf8', 0, 4) !== 'glTF')
    throw new Error('Expected binary VRM (glTF/GLB magic)');
  const jsonLength = bytes.readUInt32LE(12);
  if (jsonLength > 1024 * 1024 * 8 || bytes.toString('utf8', 16, 20) !== 'JSON')
    throw new Error('Malformed GLB JSON header');
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const license = gltf.extensions?.VRM?.meta?.licenseName;
  const materials = (gltf.materials || []).map(m => m.name || '<unnamed>');
  return {
    license: license || 'not-present',
    meshCount: gltf.meshes?.length || 0,
    skinCount: gltf.skins?.length || 0,
    materialNames: materials,
    hasBody: materials.some(n => /body|skin/i.test(n)),
    garmentMaterialNames: materials.filter(n => /tops|bottom|shoes|cloth|pant|skirt|socks|uniform|vest/i.test(n)),
  };
}

async function fetchModel(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(source.url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`VRoid source ${source.id} HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < source.min || bytes.length > source.max)
      throw new Error(`Unexpected ${source.id} size: ${bytes.length}`);
    return bytes;
  } finally { clearTimeout(timer); }
}

async function main() {
  const dest = join(process.cwd(), 'public/assets/characters');
  await mkdir(dest, { recursive: true });
  for (const source of SOURCES) {
    const path = join(dest, source.file);
    let bytes;
    try {
      await stat(path);
      bytes = await readFile(path);
      if (gitBlobSha(bytes) !== source.blob) bytes = undefined;
    } catch { /* no cached model */ }
    if (!bytes) bytes = await fetchModel(source);
    const sha = gitBlobSha(bytes);
    if (sha !== source.blob)
      throw new Error(`Untrusted ${source.id} binary: expected ${source.blob}, got ${sha}`);
    const info = inspectVrm(bytes);
    if (info.skinCount < 1 || !info.hasBody || info.license !== 'CC0')
      throw new Error(`Unexpected ${source.id} rig/body/license: ${JSON.stringify(info)}`);
    await writeFile(path, bytes);
    console.log(`${source.id}: ${bytes.length} bytes, ${info.meshCount} meshes, ${info.skinCount} skins, ${info.license}`);
    console.log('  garment materials:', info.garmentMaterialNames.join(', ') || '(none)');
  }
}

if (process.argv[1]?.endsWith('fetch-vroid-bases.mjs')) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
