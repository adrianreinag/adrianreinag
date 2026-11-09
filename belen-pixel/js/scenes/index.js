// Registro de escenas: nombre → constructor(R, variante)
import { buildPortal } from './portal.js';
import { buildLineup } from './lineup.js';
import { buildCamino } from './camino.js';
import { buildNazaret } from './nazaret.js';
import { buildOriente } from './oriente.js';
import { buildBelen } from './belen.js';
import { buildPastores } from './pastores.js';
import { buildHerodes } from './herodes.js';
import { buildCampamento } from './campamento.js';

export const SCENES = {
  portal: buildPortal,
  lineup: buildLineup,
  camino: buildCamino,
  nazaret: buildNazaret,
  oriente: buildOriente,
  belen: buildBelen,
  pastores: buildPastores,
  herodes: buildHerodes,
  campamento: buildCampamento,
};
