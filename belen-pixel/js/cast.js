// Reparto del belén: configuración de cada personaje para el generador de personas.
import { M } from './engine.js';

export const CAST = {
  jose: { tunic: M.green, mantle: { m: M.ochre, style: 'back' }, head: { type: 'hair' }, hair: M.beard, hairV: -0.06, beard: { len: 1, m: M.beard }, belt: M.rope, item: { type: 'staff' }, armN: 'staff' },
  joseWalk: { tunic: M.green, mantle: { m: M.ochre, style: 'back' }, head: { type: 'hair' }, hair: M.beard, hairV: -0.06, beard: { len: 1, m: M.beard }, belt: M.rope, item: { type: 'staff' }, armN: 'staff', pose: 'walk' },
  maria: { tunic: M.rose, head: { type: 'hood', m: M.blue, m2: M.white, trim: M.brass }, mantle: { m: M.blue, style: 'back' }, faceV: 0.1, young: true },
  pastor: { tunic: M.burlap, short: true, legs: M.skin, mantle: { style: 'fleece' }, head: { type: 'cloth', m: M.cream, m2: M.ink }, beard: { len: 1, m: M.hair }, belt: M.rope, item: { type: 'crook' }, armN: 'staff', shortSleeve: true },
  pastorViejo: { tunic: M.brown, short: true, legs: M.skin, mantle: { m: M.burlap, style: 'sash' }, head: { type: 'cloth', m: M.white, m2: M.brown }, beard: { len: 2, m: M.beard }, faceV: -0.02, item: { type: 'staff' }, armN: 'staff', belt: M.rope },
  pastorCordero: { tunic: M.cream, short: true, legs: M.skin, head: { type: 'cloth', m: M.teal, m2: M.ink }, beard: { len: 1, m: M.hair }, belt: M.rope, item: { type: 'lamb' }, armN: 'up', shortSleeve: true },
  zagal: { tunic: M.teal, short: true, legs: M.skin, head: { type: 'hair' }, young: true, belt: M.rope, item: { type: 'flute' }, armN: 'flute', armF: 'flute', shortSleeve: true },
  pastora: { tunic: M.ochre, head: { type: 'veil', m: M.red, m2: M.cream }, young: true, faceV: 0.08, item: { type: 'jar' }, armN: 'up', belt: M.brown },
  melchor: { tunic: M.cream, mantle: { m: M.brass, style: 'cape', trim: M.white }, head: { type: 'crown' }, hair: M.white, beard: { len: 2, m: M.white }, faceV: 0, belt: M.brass, cuff: M.brass, item: { type: 'gift', kind: 'chest' }, armN: 'offer' },
  gaspar: { tunic: M.teal, mantle: { m: M.green, style: 'cape', trim: M.brass }, head: { type: 'turban', m: M.cream, jewel: M.red, crown: true }, beard: { len: 1, m: M.hair }, belt: M.brass, cuff: M.brass, item: { type: 'gift', kind: 'censer' }, armN: 'offer' },
  baltasar: { skin: M.skind, tunic: M.ochre, mantle: { m: M.purple, style: 'cape', trim: M.brass }, head: { type: 'turban', m: M.white, jewel: M.teal, crown: true }, beard: { len: 1, m: M.ink }, belt: M.brass, cuff: M.brass, item: { type: 'gift', kind: 'jar' }, armN: 'offer', young: true },
  herodes: { tunic: M.purple, mantle: { m: M.red, style: 'cape', trim: M.brass }, head: { type: 'crown' }, hair: M.hair, beard: { len: 1, m: M.ink }, belt: M.brass, cuff: M.brass, armN: 'point' },
  soldado: { tunic: M.red, short: true, legs: M.skin, head: { type: 'helmet' }, belt: M.brass, item: { type: 'spear' }, armN: 'staff', mantle: { m: M.red, style: 'back' }, shortSleeve: true },
  posadero: { tunic: M.cream, head: { type: 'cap', m: M.red }, beard: { len: 1, m: M.hair }, belt: M.brown, item: { type: 'lantern' }, armN: 'forward', mantle: { m: M.brown, style: 'sash' } },
  aldeana: { tunic: M.teal, head: { type: 'veil', m: M.cream, m2: M.white }, young: true, belt: M.ochre, item: { type: 'bowl' }, armN: 'hold' },
  heraldo: { tunic: M.red, head: { type: 'cap', m: M.brass }, belt: M.brass, item: { type: 'scroll' }, armN: 'open', mantle: { m: M.cream, style: 'sash' } },
  paje: { tunic: M.purple, short: true, legs: M.cream, head: { type: 'turban', m: M.ochre, jewel: M.red }, young: true, belt: M.brass, item: { type: 'torch' }, armN: 'torch', skin: M.skind },
  gabriel: { angel: true, o: { arm: 'up' } },
};
