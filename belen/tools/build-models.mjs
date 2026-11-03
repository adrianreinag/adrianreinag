// Optimiza los modelos descargados por fetch-models.sh y los guarda en ../models
// Uso:  npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer@0.21
//       node build-models.mjs            (GLB con compresión meshopt)
//       PLAIN=1 OUT=../models/plain node build-models.mjs   (sólo cuantización, sin WebAssembly)
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, quantize, meshopt, resample, mergeDocuments, unpartition, flatten } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const HERE = new URL('.', import.meta.url).pathname;
const RAW = HERE + 'raw', OUT = process.env.OUT || HERE + '../models';
const S = (dir, names, prefix) => names.split(' ').map(n => ({ file: `${RAW}/${dir}/${n}.glb`, name: `${prefix}_${n}` }));
const props = [
  ...S('medieval_village_pack', 'Bag Bags Barrel Bench_1 Bonfire Bonfire_Lit Cart Cauldron Crate Fence Hay MarketStand_1 MarketStand_2 Package_1 Smoke Well House_3 House_4 Stable Stairs Gazebo', 'v'),
  ...S('real_time_strategy_pack', 'Houses_SecondAge_1_Level1 Houses_SecondAge_2_Level2 Houses_SecondAge_3_Level3 Market_FirstAge_Level2 Market_SecondAge_Level2 Mountain_Group_1 Mountain_Group_2 MountainLarge_Single Mountain_Single Wonder_SecondAge_Level3 Dock_FirstAge Wall_SecondAge WallTowers_SecondAge WallTowers_Door_SecondAge WatchTower_SecondAge_Level1 Farm_FirstAge_Level1_Wheat Logs', 'r'),
  ...S('nature_pack', 'PalmTree_1 PalmTree_2 PalmTree_3 PalmTree_4 Bush_1 Bush_2 BushBerries_1 Cactus_1 Cactus_2 Cactus_3 CommonTree_1 CommonTree_2 CommonTree_3 CommonTree_4 CommonTree_5 Flowers Grass Grass_2 Grass_Short Lilypad Plant_1 Plant_3 Plant_4 Plant_5 Rock_1 Rock_2 Rock_3 Rock_4 Rock_5 Rock_6 Rock_7 TreeStump Wheat Willow_1 Willow_2 Willow_3 WoodLog', 'n'),
  ...S('crops_pack', 'Orange_4 Pumpkin_Crop Lettuce_Crop Carrot_Crop Wheat_Crop', 'c'),
  ...S('rpg_items_pack', 'Chest_Ingots Chest_Closed Chalice Potion3_Filled Pouch Crown2 Star Coin', 'i'),
  ...S('survival_pack', 'Tent Pot WoodenTorch_Fire Bonfire_Fire', 's'),
  ...S('ships_pack', 'BoatWSail', 'b'),
  ...S('farmglb', 'Sheep Pig Llama', 'f'),
];
async function finish(doc, out, { anims = false, skinned = false } = {}) {
  await doc.transform(
    dedup(), prune({ keepAttributes: false }), weld(),
    ...(anims ? [resample({ tolerance: 1e-4 })] : []),
    process.env.PLAIN ? quantize({ quantizationVolume: skinned ? 'scene' : 'mesh', quantizePosition: 14, quantizeNormal: 10 }) : meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizationVolume: skinned ? 'scene' : 'mesh', quantizePosition: 14, quantizeNormal: 10 }),
  );
  await io.write(out, doc);
  return fs.statSync(out).size;
}
// ---- props pack
{
  const doc = new Document(); doc.createBuffer();
  const scene = doc.createScene('props');
  for (const p of props) {
    const src = await io.read(p.file);
    const srcScene = src.getRoot().getDefaultScene() || src.getRoot().listScenes()[0];
    const wrap = src.createNode(p.name);
    for (const c of srcScene.listChildren()) { srcScene.removeChild(c); wrap.addChild(c); }
    srcScene.addChild(wrap);
    const map = mergeDocuments(doc, src);
    const merged = map.get(wrap);
    for (const s of doc.getRoot().listScenes()) if (s !== scene) { s.removeChild(merged); s.dispose(); }
    scene.addChild(merged);
  }
  doc.getRoot().setDefaultScene(scene);
  await doc.transform(unpartition());
  console.log('props.glb', await finish(doc, `${OUT}/props.glb`));
}
// ---- animals
const KEEP_A = ['Idle', 'Idle_Headlow', 'Idle_2_HeadLow', 'Eating', 'Walk'];
for (const n of 'Donkey Cow Bull Horse Horse_White Alpaca Husky ShibaInu Deer Stag Fox Wolf'.split(' ')) {
  const doc = await io.read(`${RAW}/animals_pack/${n}.glb`);
  for (const a of doc.getRoot().listAnimations()) {
    const nm = a.getName().replace('AnimalArmature|', '');
    if (!KEEP_A.includes(nm)) a.dispose(); else a.setName(nm === 'Idle_2_HeadLow' ? 'Idle_Headlow' : nm);
  }
  console.log(n, await finish(doc, `${OUT}/${n}.glb`, { anims: true, skinned: true }));
}
// ---- humans (static rigs)
for (const [dir, n, out] of [['modular_men','Farmer','M_Farmer'],['modular_men','King','M_King'],['modular_men','Adventurer','M_Adventurer'],['modular_men','Casual','M_Casual'],['modular_men','Casual2','M_Casual2'],['modular_men','Worker','M_Worker'],
  const doc = await io.read(`${RAW}/${dir}/${n}.glb`);
  console.log(out, await finish(doc, `${OUT}/${out}.glb`, { skinned: true }));
}
// ---- human animation library
{
  const doc = await io.read(`${RAW}/evyy/Medieval.gltf`);
  const KEEP = new Set(['Body','Hips','Abdomen','Torso','Chest','Neck','Head','Shoulder.L','UpperArm.L','LowerArm.L','Wrist.L','Shoulder.R','UpperArm.R','LowerArm.R','Wrist.R','UpperLeg.L','LowerLeg.L','Foot.L','UpperLeg.R','LowerLeg.R','Foot.R']);
  for (const a of doc.getRoot().listAnimations()) {
    if (!['Idle','Idle_Neutral','Walk','Run','Wave','Interact'].includes(a.getName())) { a.dispose(); continue; }
    for (const ch of a.listChannels()) { const t = ch.getTargetNode(); if (!t || !KEEP.has(t.getName()) || ch.getTargetPath() === 'scale') { ch.getSampler()?.dispose(); ch.dispose(); } }
  }
  for (const n of doc.getRoot().listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.dispose(); }
  console.log('anims_human', await finish(doc, `${OUT}/anims_human.glb`, { anims: true }));
}
