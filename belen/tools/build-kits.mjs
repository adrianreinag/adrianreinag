import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, dedup, weld, meshopt, quantize, textureCompress, resample } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const HERE = new URL('.', import.meta.url).pathname;
const OUT = process.env.OUT || HERE + '../models';
const PLAIN = !!process.env.PLAIN;
const finish = async (doc, out, anims) => {
  if (anims) {
    await doc.transform(dedup(), prune(), resample({ tolerance: 4e-4 }));
    if (!PLAIN) doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
    await io.write(out, doc); console.log(out.split('/').pop(), fs.statSync(out).size); return;
  }
  await doc.transform(dedup(), prune(), weld(),
    PLAIN ? quantize({ quantizationVolume: 'scene', quantizePosition: 14, quantizeNormal: 10 }) : meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizationVolume: 'scene', quantizePosition: 14, quantizeNormal: 10 }));
  await io.write(out, doc); console.log(out.split('/').pop(), fs.statSync(out).size);
};
// kits de personaje: atlas a WebP
for (const s of (process.env.SKIPKITS ? [] : ['m', 'f'])) {
  const doc = await io.read(HERE + `kits/kit_${s}.glb`);
  // el mapa de color con alfa (pelo) y los demás
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 84, effort: 5 }));
  for (const m of doc.getRoot().listMeshes()) if (/brows_eyebrows/.test(m.getName())) { /* duplicado de las cejas de la cabeza */ }
  await finish(doc, `${OUT}/kit_${s}.glb`, false);
}
// animaciones humanas: selección de las bibliotecas UAL1 y UAL2 (sin malla)
const KEEP = ['Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Fixing_Kneeling', 'Crouch_Idle_Loop', 'Interact', 'PickUp_Table', 'Idle_Torch_Loop', 'Spell_Simple_Idle_Loop', 'Push_Loop',
  'Farm_Harvest', 'Farm_Watering', 'Farm_PlantSeed', 'Idle_FoldArms_Loop', 'Idle_Lantern_Loop', 'Idle_Shield_Loop', 'Walk_Carry_Loop', 'TreeChopping_Loop', 'Consume', 'Yes', 'Idle_Rail_Loop'];
for (const [src, out] of [[HERE + 'raw/ex_anim/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb', 'anims_ual1'], [HERE + 'raw/ex_anim2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb', 'anims_ual2']]) {
  const doc = await io.read(src);
  for (const a of doc.getRoot().listAnimations()) {
    if (!KEEP.includes(a.getName())) { a.dispose(); continue; }
    for (const ch of a.listChannels()) { const t = ch.getTargetNode(); if (!t || /(index|middle|ring|pinky|thumb)_0[1-4]|leaf|ik_/i.test(t.getName()) || ch.getTargetPath() === 'scale' || (ch.getTargetPath() === 'translation' && !/^(pelvis|root)$/.test(t.getName()))) { ch.getSampler()?.dispose(); ch.dispose(); } }
  }
  for (const n of doc.getRoot().listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.setSkin(null); }
  for (const sk of doc.getRoot().listSkins()) sk.dispose();
  for (const m of doc.getRoot().listMaterials()) m.dispose();
  for (const t of doc.getRoot().listTextures()) t.dispose();
  await finish(doc, `${OUT}/${out}.glb`, true);
}
