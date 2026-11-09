// Paleta limitada del belén: 11 rampas maestras con desplazamiento de tono (sombras frías hacia el
// violeta, luces cálidas hacia el ámbar). Cada material usa un tramo de una rampa compartida, de modo que
// toda la imagen comparte los mismos colores, como en el pixel art hecho a mano.
import { defMat } from './engine.js';

export const RAMPS = {
  night: ['#0b0a1c', '#141433', '#1d2150', '#25336e', '#2c4a92', '#3a66b4', '#5288d0', '#78ace4', '#a8d0f4'],
  stone: ['#120f18', '#1e1824', '#2c2330', '#3c303c', '#4e4048', '#625352', '#7a6a60', '#968470', '#b4a088', '#d2c0a4'],
  earth: ['#160e10', '#271916', '#3b261c', '#523424', '#6a462e', '#84593a', '#9e6e48', '#b88658', '#d0a06c', '#e4bc88'],
  wood: ['#130a0c', '#241210', '#391c14', '#51281a', '#6b3620', '#874628', '#a35a32', '#bd7240', '#d48e54', '#e8ac70'],
  gold: ['#2a1608', '#4a2a0c', '#6e4210', '#945c16', '#b87a1e', '#d69a2a', '#ecbc40', '#f8d862', '#fff09a', '#fffbe0'],
  green: ['#0a110f', '#122019', '#1b3022', '#26422a', '#335532', '#43683a', '#577c42', '#6e924c', '#8aa85c', '#a8c070'],
  red: ['#1a0a12', '#30101c', '#4a1624', '#661c2a', '#842630', '#a03438', '#ba4840', '#d06250', '#e28266', '#f0a684'],
  skin: ['#2a1418', '#47201f', '#6a3028', '#8e4836', '#b2644c', '#c88064', '#dc9c80', '#ecb89c', '#f8d2b8', '#ffe8d6'],
  white: ['#1c1a26', '#302c3a', '#46404e', '#5e5664', '#78707a', '#958b92', '#b2a8ac', '#ccc2c0', '#e2d8d2', '#f2ece4', '#fffaf2'],
  purple: ['#100818', '#1e0e2a', '#30163e', '#442054', '#5a2c6a', '#723a80', '#8c4e96', '#a868ac', '#c488c4'],
  teal: ['#06100f', '#0a1c1c', '#10292a', '#173838', '#204a48', '#2a5e5a', '#38746c', '#4a8c80', '#62a494'],
};
const R = RAMPS;
const S = (r, a, b) => r.slice(a, b);
const dusk = [R.night[0], R.purple[1], R.purple[2], R.purple[3], R.red[3], R.red[4], R.red[5], R.red[7], R.wood[7], R.gold[5], R.gold[6], R.gold[7]];

// cielo y lejanías (sin luz propia)
defMat('sky', [R.night[0], '#0e0d26', R.night[1], '#181a40', R.night[2], '#222a5e', R.night[3], R.purple[3], R.purple[4], R.purple[5]], { unlit: true, dither: 1, ol: 0 });
defMat('far1', S(R.night, 1, 6), { unlit: true, dither: 0.8, ol: 0 });
defMat('far2', S(R.night, 0, 5), { unlit: true, dither: 0.8, ol: 1 });
defMat('far1day', [R.night[5], R.night[6], R.night[7], R.night[8], R.white[8]], { unlit: true, dither: 0.8, ol: 0 });
defMat('far2day', [R.teal[4], R.teal[5], R.teal[6], R.teal[7], R.teal[8], R.night[7]], { unlit: true, dither: 0.8, ol: 1 });
defMat('far1dusk', S(R.purple, 2, 7), { unlit: true, dither: 0.8, ol: 0 });
defMat('far2dusk', S(R.purple, 1, 6), { unlit: true, dither: 0.8, ol: 1 });
defMat('far1dawn', [R.purple[4], R.purple[5], R.purple[6], R.purple[7], R.red[8]], { unlit: true, dither: 0.8, ol: 0 });
defMat('far2dawn', S(R.purple, 3, 8), { unlit: true, dither: 0.8, ol: 1 });
defMat('skyDusk', dusk, { unlit: true, dither: 1, ol: 0 });
defMat('skyDay', [R.night[4], R.night[5], R.night[6], R.night[7], R.night[8], R.white[8], R.white[9]], { unlit: true, dither: 1, ol: 0 });
defMat('cloud', S(R.white, 3, 11), { dither: 0.5, ol: 0, wrap: 0.5 });
defMat('clouddusk', [R.purple[3], R.purple[4], R.red[3], R.red[5], R.red[7], R.red[8], R.gold[6], R.gold[7]], { dither: 0.5, ol: 0, wrap: 0.5 });
// piedra, tierra, agua
defMat('rock', S(R.stone, 0, 10), { dither: 0.5, ol: 1 });
defMat('wall', S(R.stone, 0, 9), { dither: 0.5, ol: 1, albedo: 0.92 });
defMat('stone', S(R.stone, 0, 10), { dither: 0.4, ol: 1 });
defMat('plaster', [...S(R.stone, 0, 6), R.earth[7], R.earth[8], R.earth[9], R.white[8], R.white[9]], { dither: 0.4, ol: 1 });
defMat('town', S(R.stone, 0, 8), { dither: 0.3, ol: 1 });
defMat('marble', S(R.white, 0, 11), { dither: 0.3, ol: 1, spec: 0.3 });
defMat('rosestone', [R.stone[0], R.red[1], R.red[2], R.red[3], R.wood[4], R.wood[5], R.red[6], R.wood[7], R.red[8], R.wood[9], R.red[9]], { dither: 0.5, ol: 1 });
defMat('dirt', S(R.earth, 0, 10), { dither: 0.5, ol: 1 });
defMat('sand', [...S(R.earth, 0, 10), R.gold[8]], { dither: 0.5, ol: 1 });
defMat('water', S(R.night, 0, 9), { dither: 0.5, ol: 0 });
defMat('waterdusk', [R.night[0], R.night[1], R.purple[2], R.purple[3], R.night[3], R.purple[4], R.purple[5], R.red[5], R.wood[7], R.gold[6]], { dither: 0.5, ol: 0 });
defMat('waternight', S(R.night, 0, 7), { dither: 0.5, ol: 0 });
// vegetación
defMat('grass', S(R.green, 0, 8), { dither: 0.4, ol: 1 });
defMat('moss', S(R.green, 0, 10), { dither: 0.4, ol: 1 });
defMat('olive', [R.night[0], R.green[1], R.teal[2], R.green[3], R.teal[4], R.green[5], R.green[6], R.green[7]], { dither: 0.4, ol: 1 });
defMat('leaf', S(R.green, 0, 10), { dither: 0.4, ol: 1 });
defMat('palm', S(R.green, 0, 9), { dither: 0.3, ol: 1 });
defMat('trunk', [R.stone[0], R.stone[1], R.earth[2], R.stone[3], R.earth[4], R.stone[5], R.earth[6], R.stone[7]], { dither: 0.3, ol: 2 });
// paja, madera, barro
defMat('straw', S(R.gold, 0, 10), { dither: 0.2, ol: 1 });
defMat('thatch', [R.earth[0], R.earth[1], R.earth[2], R.earth[3], R.gold[2], R.gold[3], R.earth[6], R.gold[4], R.earth[8], R.gold[6]], { dither: 0.3, ol: 1 });
defMat('wood', S(R.wood, 0, 10), { dither: 0.2, ol: 2 });
defMat('rope', [R.earth[1], R.earth[2], R.earth[3], R.earth[5], R.earth[6], R.earth[7], R.earth[8]], { dither: 0, ol: 1 });
defMat('clay', S(R.wood, 0, 10), { dither: 0.2, ol: 2, spec: 0.15 });
defMat('burlap', S(R.earth, 0, 9), { dither: 0.2, ol: 2 });
defMat('brown', S(R.earth, 0, 9), { dither: 0.2, ol: 2 });
defMat('tile', S(R.wood, 0, 9), { dither: 0.2, ol: 1 });
// personas
defMat('skin', R.skin, { dither: 0, ol: 2, wrap: 0.45 });
defMat('skind', [R.skin[0], R.skin[1], R.wood[2], R.skin[2], R.wood[3], R.skin[3], R.wood[5], R.skin[4], R.wood[7]], { dither: 0, ol: 2, wrap: 0.45 });
defMat('ink', [R.night[0], R.stone[0], R.stone[1], R.wood[1], R.wood[2]], { dither: 0, ol: 0 });
defMat('lips', [R.red[1], R.red[2], R.red[4], R.red[5], R.red[7], R.red[8]], { dither: 0, ol: 0, wrap: 0.45 });
defMat('hair', [R.night[0], R.stone[0], R.wood[1], R.wood[2], R.wood[3], R.wood[4], R.wood[5]], { dither: 0, ol: 2 });
defMat('beard', S(R.white, 0, 10), { dither: 0, ol: 2 });
defMat('blue', [...S(R.night, 0, 9), R.white[10]], { dither: 0, ol: 2 });
defMat('white', S(R.white, 0, 11), { dither: 0, ol: 2, wrap: 0.3 });
defMat('cream', [R.stone[1], R.stone[2], R.stone[3], R.stone[4], R.stone[5], R.stone[6], R.earth[7], R.earth[8], R.earth[9], R.white[9]], { dither: 0, ol: 2 });
defMat('rose', S(R.red, 0, 10), { dither: 0, ol: 2 });
defMat('red', S(R.red, 0, 10), { dither: 0, ol: 2 });
defMat('weave', S(R.red, 0, 9), { dither: 0, ol: 2 });
defMat('green', S(R.green, 0, 10), { dither: 0, ol: 2 });
defMat('teal', S(R.teal, 0, 9), { dither: 0, ol: 2 });
defMat('ochre', [R.wood[0], R.wood[1], R.wood[2], R.gold[2], R.gold[3], R.gold[4], R.gold[5], R.gold[6], R.gold[7], R.gold[8]], { dither: 0, ol: 2 });
defMat('purple', S(R.purple, 0, 9), { dither: 0, ol: 2 });
defMat('brass', [R.wood[1], R.gold[1], R.gold[2], R.gold[3], R.gold[4], R.gold[5], R.gold[6], R.gold[7], R.gold[8]], { dither: 0, ol: 2, spec: 0.5 });
defMat('metal', S(R.stone, 0, 9), { dither: 0, ol: 2, spec: 0.4 });
defMat('feather', S(R.white, 2, 11), { dither: 0, ol: 2, wrap: 0.35 });
defMat('banner', S(R.white, 2, 10), { dither: 0, ol: 2 });
defMat('wool', S(R.white, 0, 11), { dither: 0.2, ol: 2, wrap: 0.3 });
// animales
defMat('ox', S(R.wood, 0, 10), { dither: 0.2, ol: 2, wrap: 0.25 });
defMat('muzzle', [...S(R.earth, 2, 10), R.white[8]], { dither: 0, ol: 2 });
defMat('horn', [R.stone[1], R.stone[3], R.earth[4], R.earth[6], R.earth[8], R.white[7], R.white[8]], { dither: 0, ol: 2 });
defMat('mule', S(R.stone, 0, 10), { dither: 0.2, ol: 2, wrap: 0.25 });
defMat('mulel', S(R.white, 2, 10), { dither: 0, ol: 2 });
defMat('mane', [R.night[0], R.stone[0], R.stone[1], R.stone[2], R.stone[3]], { dither: 0, ol: 2 });
defMat('sheepf', S(R.wood, 0, 7), { dither: 0, ol: 2 });
defMat('cat', S(R.wood, 0, 10), { dither: 0, ol: 2 });
defMat('dove', S(R.white, 0, 10), { dither: 0, ol: 2 });
defMat('camel', S(R.earth, 0, 10), { dither: 0.2, ol: 2, wrap: 0.25 });
// luz propia
defMat('gold', S(R.gold, 2, 10), { unlit: true, dither: 0.6, ol: 0 });
defMat('flame', [R.wood[6], R.gold[5], R.gold[6], R.gold[8], R.gold[9]], { unlit: true, dither: 0, ol: 0 });
defMat('window', [R.wood[3], R.wood[5], R.gold[4], R.gold[5], R.gold[6], R.gold[7], R.gold[9]], { unlit: true, dither: 0, ol: 0 });
defMat('ember', [R.red[2], R.red[4], R.wood[6], R.gold[5], R.gold[7], R.gold[8]], { unlit: true, dither: 0, ol: 0 });
defMat('fire', [R.red[3], R.red[6], R.wood[7], R.gold[5], R.gold[7], R.gold[8], R.gold[9]], { unlit: true, dither: 0, ol: 0 });
