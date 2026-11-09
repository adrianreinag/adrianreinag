// Calendario del belén: qué se ve cada día (y desde qué puntos de vista).
// La historia empieza el 29 de noviembre y termina el 7 de enero, cuando los Reyes se marchan.
const D = (m, d) => `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const V = (scene, variant, label) => ({ scene, variant, label });

const ENTRIES = [];
const range = (m1, d1, m2, d2, e) => ENTRIES.push({ from: D(m1, d1), to: D(m2, d2), ...e });

range(11, 29, 12, 2, { title: 'La Anunciación', place: 'Nazaret, Galilea',
  text: 'Al caer la tarde, el ángel Gabriel visita a María en Nazaret: «No temas, María. Concebirás y darás a luz un hijo, y le pondrás por nombre Jesús».',
  views: [V('nazaret', 'anunciacion', 'Casa de María')] });
range(12, 3, 12, 5, { title: 'Una estrella nueva', place: 'Babilonia, junto al Éufrates',
  text: 'Muy lejos, en Oriente, tres sabios que estudian el cielo descubren una estrella que nadie había visto antes.',
  views: [V('oriente', 'estudio', 'El observatorio'), V('nazaret', 'taller', 'Nazaret')] });
range(12, 6, 12, 7, { title: 'El taller de José', place: 'Nazaret, Galilea',
  text: 'José trabaja la madera en su taller mientras María hila. Esperan al Niño con alegría.',
  views: [V('nazaret', 'taller', 'El taller'), V('oriente', 'estudio', 'Oriente')] });
range(12, 8, 12, 15, { title: 'El edicto de César Augusto', place: 'Nazaret, Galilea',
  text: 'Un heraldo lee el edicto del emperador: todos deben empadronarse en la ciudad de sus antepasados. José es de la casa de David; tendrán que ir a Belén.',
  views: [V('nazaret', 'edicto', 'La plaza'), V('oriente', 'estudio', 'Los Magos'), V('portal', 'espera', 'Belén')] });
range(12, 16, 12, 16, { title: 'La partida', place: 'Nazaret, al amanecer',
  text: 'Al alba, María y José salen de Nazaret con la mula. Les esperan casi 150 kilómetros de camino hasta Belén.',
  views: [V('nazaret', 'partida', 'Nazaret')] });
range(12, 17, 12, 17, { title: 'Por los campos de Galilea', place: 'Valle de Jezreel y monte Tabor',
  text: 'Primer día de viaje entre olivos y trigales. Al fondo se alza el monte Tabor.',
  views: [V('camino', 'galilea', 'El camino')] });
range(12, 18, 12, 18, { title: 'El valle del Jordán', place: 'Orillas del río Jordán',
  text: 'Para evitar Samaria, bajan al valle del Jordán y siguen el río hacia el sur entre cañaverales y palmeras.',
  views: [V('camino', 'jordan', 'El río')] });
range(12, 19, 12, 19, { title: 'Noche junto al río', place: 'Valle del Jordán',
  text: 'Acampan junto al Jordán. La luna se refleja en el agua como papel de plata.',
  views: [V('camino', 'jordanNoche', 'El campamento')] });
range(12, 20, 12, 20, { title: 'Jericó, la ciudad de las palmeras', place: 'Oasis de Jericó',
  text: 'Llegan a Jericó, el oasis más antiguo del mundo, rodeado de palmeras datileras.',
  views: [V('camino', 'jerico', 'Jericó')] });
range(12, 21, 12, 21, { title: 'Subida por el desierto', place: 'Desierto de Judea',
  text: 'El camino sube por el desierto de Judea, entre barrancos. Pasan la noche junto a la posada del Buen Samaritano.',
  views: [V('camino', 'desierto', 'El desierto')] });
range(12, 22, 12, 22, { title: 'Jerusalén a lo lejos', place: 'Monte de los Olivos',
  text: 'Desde lo alto ven Jerusalén y el Templo dorado por el sol de la tarde. Belén ya está cerca.',
  views: [V('camino', 'jerusalen', 'Jerusalén')] });
range(12, 23, 12, 23, { title: 'El censo en Belén', place: 'Belén de Judá',
  text: 'Belén está llena de gente que viene a empadronarse. Un escriba romano anota los nombres.',
  views: [V('belen', 'censo', 'El censo'), V('portal', 'espera', 'El establo')] });
range(12, 24, 12, 24, { title: 'Nochebuena', place: 'Belén de Judá', byHour: 20,
  text: 'No hay sitio en las posadas. En un establo, a las afueras, nace el Niño. Los ángeles lo anuncian a los pastores.',
  views: [V('belen', 'posadas', 'Las posadas'), V('portal', 'nacimiento', 'El Portal'), V('pastores', 'gloria', 'Los pastores')] });
range(12, 25, 12, 27, { title: 'La adoración de los pastores', place: 'Belén de Judá',
  text: 'Los pastores acuden al Portal con sus corderos y encuentran al Niño en el pesebre, con María y José. En Oriente, los Magos se ponen en camino.',
  views: [V('portal', 'pastores', 'El Portal'), V('pastores', 'vela', 'El campo'), V('camino', 'eufrates', 'Los Magos')] });
range(12, 28, 12, 30, { title: 'Los Magos cruzan el desierto', place: 'Desierto de Arabia',
  text: 'Melchor, Gaspar y Baltasar cruzan el desierto de noche, guiados por la estrella.',
  views: [V('camino', 'arabia', 'La caravana'), V('portal', 'nacimiento', 'El Portal')] });
range(12, 31, 1, 1, { title: 'Por la ruta del incienso', place: 'Petra',
  text: 'La caravana atraviesa Petra, la ciudad tallada en la roca rosa, en la ruta del incienso.',
  views: [V('camino', 'petra', 'Petra'), V('portal', 'nacimiento', 'El Portal')] });
range(1, 2, 1, 4, { title: 'Los Magos ante Herodes', place: 'Jerusalén, palacio de Herodes',
  text: '«¿Dónde está el rey de los judíos que ha nacido?». Herodes, inquieto, consulta a los sabios y les pide que vuelvan a contarle dónde está el Niño.',
  views: [V('herodes', 'audiencia', 'El palacio'), V('camino', 'reyesJerusalen', 'Jerusalén')] });
range(1, 5, 1, 5, { title: 'Llegan los Reyes', place: 'Belén de Judá',
  text: 'De noche, la estrella se detiene sobre Belén. Los Reyes entran con sus pajes, camellos y antorchas.',
  views: [V('belen', 'cabalgata', 'La llegada')] });
range(1, 6, 1, 6, { title: 'La adoración de los Reyes', place: 'Belén de Judá', byHour: 21,
  text: 'Los Reyes adoran al Niño y le ofrecen oro, incienso y mirra. Esa noche, en sueños, un ángel les avisa de que no vuelvan a ver a Herodes.',
  views: [V('portal', 'reyes', 'El Portal'), V('campamento', 'sueno', 'El sueño')] });
range(1, 7, 1, 7, { title: 'Por otro camino', place: 'Montes de Judea',
  text: 'Los Reyes regresan a su tierra por otro camino. La estrella se apaga: la historia ha terminado.',
  views: [V('camino', 'regreso', 'La partida'), V('portal', 'final', 'El Portal')] });

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const fmtDate = d => `${d.getDate()} de ${MONTHS[d.getMonth()]}`;

// orden dentro de la temporada (nov→ene)
const ord = k => { const [m, d] = k.split('-').map(Number); return (m < 6 ? m + 12 : m) * 100 + d; };
export function entryFor(date) {
  const k = D(date.getMonth() + 1, date.getDate()), o = ord(k);
  for (const e of ENTRIES) if (o >= ord(e.from) && o <= ord(e.to)) return { ...e, key: k };
  // belén dormido
  const y = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - (date.getMonth() === 0 ? 1 : 0);
  const next = new Date(date.getMonth() === 10 && date.getDate() >= 29 ? y + 1 : (date.getMonth() >= 6 ? y : date.getFullYear()), 10, 29);
  const days = Math.ceil((next - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
  return { key: k, dormant: true, title: 'El belén descansa', place: 'Nazaret, Galilea',
    text: `La historia terminó con la marcha de los Reyes. El belén volverá a montarse el 29 de noviembre: faltan ${days} ${days === 1 ? 'día' : 'días'}.`,
    views: [V('nazaret', 'noche', 'Nazaret'), V('portal', 'final', 'El Portal')] };
}
export function defaultView(entry, date) {
  if (entry.byHour != null && date.getHours() >= entry.byHour) return 1;
  return 0;
}
export const SEASON = ENTRIES;
