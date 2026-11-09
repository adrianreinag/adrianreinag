# Belén de Judá · pixel art

Belén pintado y animado en pixel art que cambia según la fecha real. La historia empieza el 29 de noviembre
(Anunciación) y termina el 7 de enero, cuando los Reyes se marchan "por otro camino". El resto del año el belén descansa.

Todo se pinta con código, sin imágenes: cada escena se dibuja en un G-buffer 2D (material, normal, orden de dibujo),
se ilumina por píxel (luna, sol, candiles, hogueras, el halo del Niño) y se cuantiza a rampas de color con tramado
ordenado. Encima van contornos sel-out y efectos (estrellas, haces de luz, llamas, humo, brillo del agua).

## Escenas
- **Nazaret**: Anunciación, taller de José, edicto de César Augusto, partida y noche.
- **Oriente**: los Magos descubren la estrella desde un zigurat junto al Éufrates.
- **El camino** (con paralaje): Galilea y el Tabor, el Jordán, noche junto al río, Jericó, desierto y posada del Buen
  Samaritano, Jerusalén a lo lejos; y la caravana de los Reyes por el Éufrates, Arabia, Petra, Jerusalén y el regreso.
- **Belén**: el censo, las posadas en Nochebuena y la llegada de los Reyes.
- **El Portal**: el establo esperando, el nacimiento, la adoración de los pastores, la de los Reyes y el final.
- **Los pastores**: noche junto a la Torre del Rebaño y el Gloria de los ángeles.
- **Herodes**: los Magos en el salón del trono.
- **Campamento**: el sueño de los Reyes y el aviso del ángel.

## Uso
Abrir `index.html` con un servidor estático (usa módulos ES). Botones para ir a otros días y cambiar de punto de vista;
también por enlace: `index.html#12-24-1` (mes-día-vista). `?scene=portal&v=reyes` abre una escena concreta.

`tools/artifact.py` genera la versión sin `<html>/<head>/<body>` usada para publicarlo como artifact.
