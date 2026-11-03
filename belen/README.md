# Belén Monumental

Un belén navideño en 3D para la web: no sólo el Portal, sino **la ciudad entera de Belén** la noche del Nacimiento, con decenas de casas, animales, personas y escenas tradicionales del belén español.

## Qué hay en la escena

- **El Portal**: establo de madera con techo de paja junto a una cueva de roca y ruinas romanas. María, José, el Niño en el pesebre, el buey y la mula, el ángel con el estandarte *Gloria in excelsis Deo* y la Estrella de Belén con su cola y su haz de luz.
- **Los Reyes Magos** arrodillados con oro, incienso y mirra; sus pajes y camellos esperando, y una caravana que cruza el desierto.
- **La Anunciación a los pastores**: hoguera con chispas, rebaños de ovejas que pastan, perros pastores, tiendas, redil de piedra y el ángel en el cielo.
- **La ciudad de Belén**: unas 120 casas hebreas encaladas generadas por código (azoteas con pretil, vigas, escaleras exteriores, cúpulas, toldos), muralla con torres y dos puertas, sinagoga, posada, mercado con puestos, pozo, faroles y vecinos paseando, con cántaros o tendiendo la ropa.
- **Los oficios**: herrero en su fragua, panadera junto al horno de barro, alfarero, carpintero, hilandera.
- **El río**: molino con rueda que gira, puente de piedra, lavanderas, pescador en su barca, patos y nenúfares.
- **El palacio de Herodes** con soldados romanos, patrullas por el camino, campos de trigo, huerta, naranjos, olivar, un labrador arando, oasis con beduinos, bosque con ciervos, montañas nevadas.
- **Ciclo de día y noche**: cielo con estrellas y vía láctea, luna, ventanas que se encienden, faroles, hogueras y luciérnagas.
- **Recorrido** por 11 escenas con textos, marcadores sobre el mapa, modo cinematográfico automático y una caja de música que toca *Noche de paz*.

## Cómo verlo

Es una página estática. Sírvela con cualquier servidor web desde esta carpeta:

```bash
cd belen
python3 -m http.server 8000
# abre http://localhost:8000
```

También funciona en GitHub Pages. Three.js (r170) se carga desde jsDelivr.

**Controles**: arrastra para girar, rueda o pellizco para acercar, clic derecho o dos dedos para desplazar. Flechas ← → para cambiar de escena, `N` alterna día y noche y `L` muestra u oculta los rótulos.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `index.html`, `css/style.css` | Interfaz |
| `js/main.js` | Render (tonemapping ACES, bloom, gradación de color, viñeta), cámara, recorrido, calidad adaptativa |
| `js/terrain.js` | Terreno procedural: colina de la ciudad, río, desierto, cordillera |
| `js/sky.js` | Cielo, estrellas, luna, Estrella de Belén y ciclo día/noche |
| `js/builder.js` | Arquitectura procedural: casas hebreas, murallas, Portal, puente, molino, horno, fragua |
| `js/people.js` | Personajes realistas: kit de piezas, atlas, paleta por personaje y ropa generada enlazada al esqueleto |
| `js/actors.js` | Figuras animadas: recetas de personajes, posturas, camellos, jinetes, ángeles |
| `js/materials.js` | Detalle procedural en el sombreador: enlucido, sillares, madera, roca, tierra y pelaje |
| `js/world.js` | Composición de todas las escenas |
| `js/effects.js` | Fuego, humo, chispas, palomas, patos, nubes, luciérnagas |
| `models/` | Modelos GLB optimizados (meshopt) |
| `tools/` | Scripts para volver a descargar y optimizar los modelos |

## Créditos de los modelos 3D

Todos los modelos son de **[Quaternius](https://quaternius.com)** y tienen licencia **CC0 1.0** (dominio público):

- Ultimate Animated Animal Pack: burro, buey, toro, caballos (uno convertido en dromedario con joroba y cuello alargado), perros, ciervos, zorro y lobo.
- Universal Base Characters y Modular Character Outfits - Fantasy: cabezas, pelo, barbas y trajes de campesino y de pastor con capucha, con texturas. Se combinan en un atlas por sexo (`models/kit_m.glb`, `models/kit_f.glb`) y cada personaje es una sola malla.
- Universal Animation Library 1 y 2: andar, hablar, sentarse, arrodillarse, cosechar, regar, cortar leña, llevar un farol o un escudo, cargar en brazos…
- Las túnicas, mantos, velos, pañuelos con cordón, coronas y cascos romanos se generan por código y van enlazados al esqueleto, de modo que siguen las piernas al andar o arrodillarse.
- Farm Animal Pack: ovejas.
- Medieval Village Pack, Ultimate Fantasy RTS, Ultimate Nature Pack, Ultimate Crops Pack, Ultimate RPG Pack, Survival Pack y Ships Pack: puestos de mercado, pozo, carro, barriles, palmeras, olivos, sauces, rocas, montañas, palacio, cofres y regalos, tiendas, barca.

Los personajes y animaciones se descargan de la tienda de Quaternius en itch.io; el resto, de réplicas públicas en GitHub ([quaternius-showcase](https://github.com/trebeljahr/quaternius-showcase) y otras indicadas en `tools/fetch-models.sh`). La melodía de *Noche de paz* (Franz X. Gruber, 1818) es de dominio público y se sintetiza en el navegador.
