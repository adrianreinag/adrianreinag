// Puntos del recorrido: dónde se coloca la cámara y qué se cuenta en cada escena.
import * as THREE from 'three';
import { LOC, heightAt, riverX } from './terrain.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const at = (x, z, up = 0) => V(x, heightAt(x, z) + up, z);

export const TOURS = [
  {
    short: 'Vista general', title: 'La ciudad de Belén',
    text: 'Belén de Judá sobre su colina, rodeada de murallas. Abajo, junto al camino, la cueva donde ha nacido Jesús; a la derecha los campos de los pastores, a la izquierda el río y, al fondo, el palacio de Herodes.',
    pos: () => V(118, 78, 150), target: () => V(0, 6, -18),
  },
  {
    short: 'El Portal', title: 'El Nacimiento', marker: () => V(LOC.portal.x, LOC.portal.h + 11, LOC.portal.z),
    text: 'En un establo junto a la roca, María y José velan al Niño recostado en el pesebre. El buey y la mula le dan calor y un ángel anuncia: «Gloria a Dios en el cielo y en la tierra paz».',
    pos: () => { const p = LOC.portal; return V(p.x + 1.2, LOC.portal.h + 4.2, p.z + 15); }, target: () => { const p = LOC.portal; return V(p.x + 0.3, LOC.portal.h + 2.4, p.z + 0.5); },
  },
  {
    short: 'Reyes Magos', title: 'La adoración de los Reyes', marker: () => V(LOC.portal.x + 16, LOC.portal.h + 5, LOC.portal.z + 12),
    text: 'Melchor, Gaspar y Baltasar han seguido la estrella desde Oriente. Arrodillados, ofrecen oro, incienso y mirra mientras sus pajes cuidan de los camellos.',
    pos: () => { const p = LOC.portal; return V(p.x + 16, LOC.portal.h + 5, p.z + 20); }, target: () => { const p = LOC.portal; return V(p.x + 4, LOC.portal.h + 1.5, p.z + 5); },
  },
  {
    short: 'Pastores', title: 'La Anunciación a los pastores', marker: () => at(LOC.shepherds.x, LOC.shepherds.z, 14),
    text: 'Los pastores velan sus rebaños junto a la hoguera cuando un ángel se les aparece: «Os ha nacido un Salvador». Algunos ya caminan hacia el Portal con un cordero.',
    pos: () => { const s = LOC.shepherds; return V(s.x - 16, heightAt(s.x, s.z) + 9, s.z + 26); }, target: () => { const s = LOC.shepherds; return at(s.x + 2, s.z + 4, 3); },
  },
  {
    short: 'La ciudad', title: 'Las calles de Belén', marker: () => at(LOC.town.x + 22, LOC.town.z + 14, 14),
    text: 'Casas encaladas de azoteas planas, escaleras exteriores y vigas de madera. Por las calles van mujeres con cántaros, niños corriendo y vecinos que tienden la ropa en los terrados.',
    pos: () => { const t = LOC.town; return V(t.x + 38, heightAt(t.x, t.z) + 26, t.z + 52); }, target: () => { const t = LOC.town; return at(t.x + 2, t.z + 6, 3); },
  },
  {
    short: 'Mercado', title: 'El mercado y el pozo', marker: () => at(LOC.town.x, LOC.town.z, 10),
    text: 'En la plaza se venden frutas, verduras, telas y cacharros. Junto al pozo las mujeres sacan agua y la posada, junto a la calle mayor, ya no tiene sitio.',
    pos: () => { const t = LOC.town; return V(t.x + 13, heightAt(t.x, t.z) + 7.5, t.z + 16); }, target: () => { const t = LOC.town; return at(t.x, t.z, 1.4); },
  },
  {
    short: 'Oficios', title: 'Los oficios', marker: () => at(0, -14, 7),
    text: 'Fuera de la muralla trabajan el herrero en su fragua, la panadera junto al horno de barro, el alfarero con sus tinajas y el carpintero entre troncos.',
    pos: () => V(1, heightAt(1, 12) + 12, 14), target: () => at(0, -12, 0),
  },
  {
    short: 'Río y molino', title: 'El río, el molino y las lavanderas', marker: () => at(LOC.mill.x, LOC.mill.z, 10),
    text: 'El agua mueve la rueda del molino. Río abajo, las lavanderas frotan la ropa en la orilla, un pescador faena en su barca y los patos nadan entre nenúfares.',
    pos: () => { const z = 10; return V(riverX(z) + 26, heightAt(riverX(z) + 26, z) + 10, z + 22); }, target: () => { const z = -2; return at(riverX(z) + 3, z, 1); },
  },
  {
    short: 'Herodes', title: 'El palacio de Herodes', marker: () => at(LOC.palace.x, LOC.palace.z, 34),
    text: 'En lo alto de la colina se alza la fortaleza del rey Herodes, custodiada por soldados romanos con lanza y escudo.',
    pos: () => { const h = LOC.palace; return V(h.x + 50, heightAt(h.x, h.z) + 16, h.z + 40); }, target: () => { const h = LOC.palace; return at(h.x, h.z, 8); },
  },
  {
    short: 'Caravana', title: 'La caravana del desierto', marker: (w) => (w && w.caravanLead ? w.caravanLead.group.position.clone().add(V(0, 7, 0)) : V(150, 10, 130)),
    text: 'Por el camino del desierto avanza la caravana del séquito real, con camellos cargados de regalos. En el oasis descansan los beduinos bajo las palmeras.',
    pos: (w) => { const p = w && w.caravanLead ? w.caravanLead.group.position : V(150, 0, 130); return V(p.x + 22, p.y + 12, p.z + 18); }, target: (w) => { const p = w && w.caravanLead ? w.caravanLead.group.position : V(150, 0, 130); return V(p.x, p.y + 2, p.z); },
  },
  {
    short: 'Campos', title: 'Huertas, olivares y trigales', marker: () => at(LOC.farm.x, LOC.farm.z, 12),
    text: 'Al norte se extienden los trigales, la huerta, los naranjos y el olivar. Un labrador ara con su buey mientras las mujeres recogen la cosecha.',
    pos: () => { const f = LOC.farm; return V(f.x + 30, heightAt(f.x, f.z) + 20, f.z + 34); }, target: () => { const f = LOC.farm; return at(f.x + 6, f.z + 2, 1); },
  },
];
