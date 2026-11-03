#!/usr/bin/env bash
# Descarga los modelos originales (todos CC0) a ./raw para reconstruir ../models con build-models.mjs.
# Fuentes: packs de Quaternius (quaternius.com) a través de réplicas públicas en GitHub.
set -euo pipefail
cd "$(dirname "$0")"
SHOWCASE=https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb
get() { local dir=$1; shift; mkdir -p "raw/$dir"; for n in "$@"; do [ -s "raw/$dir/$n.glb" ] || curl -fsSL -o "raw/$dir/$n.glb" "$SHOWCASE/$dir/$n.glb"; done; }

get animals_pack Alpaca Bull Cow Deer Donkey Fox Horse Horse_White Husky ShibaInu Stag Wolf
get modular_men Farmer King Adventurer Casual Casual2 Worker
get modular_women Medieval Casual Formal Worker
get medieval_village_pack Bag Bags Barrel Bench_1 Bonfire Bonfire_Lit Cart Cauldron Crate Fence Hay MarketStand_1 MarketStand_2 Package_1 Smoke Well House_3 House_4 Stable Stairs Gazebo
get real_time_strategy_pack Houses_SecondAge_1_Level1 Houses_SecondAge_2_Level2 Houses_SecondAge_3_Level3 Market_FirstAge_Level2 Market_SecondAge_Level2 Mountain_Group_1 Mountain_Group_2 MountainLarge_Single Mountain_Single Wonder_SecondAge_Level3 Dock_FirstAge Wall_SecondAge WallTowers_SecondAge WallTowers_Door_SecondAge WatchTower_SecondAge_Level1 Farm_FirstAge_Level1_Wheat Logs
get nature_pack PalmTree_1 PalmTree_2 PalmTree_3 PalmTree_4 Bush_1 Bush_2 BushBerries_1 Cactus_1 Cactus_2 Cactus_3 CommonTree_1 CommonTree_2 CommonTree_3 CommonTree_4 CommonTree_5 Flowers Grass Grass_2 Grass_Short Lilypad Plant_1 Plant_3 Plant_4 Plant_5 Rock_1 Rock_2 Rock_3 Rock_4 Rock_5 Rock_6 Rock_7 TreeStump Wheat Willow_1 Willow_2 Willow_3 WoodLog
get crops_pack Orange_4 Pumpkin_Crop Lettuce_Crop Carrot_Crop Wheat_Crop
get rpg_items_pack Chest_Ingots Chest_Closed Chalice Potion3_Filled Pouch Crown2 Star Coin
get survival_pack Tent Pot WoodenTorch_Fire Bonfire_Fire
get ships_pack BoatWSail

# Animaciones humanas originales (Ultimate Modular Women, Quaternius) — se reutilizan para todos los personajes
mkdir -p raw/evyy
[ -s raw/evyy/Medieval.gltf ] || curl -fsSL -o raw/evyy/Medieval.gltf https://media.githubusercontent.com/media/evyy-hub/dungeons/main/assets/models/Medieval/Medieval.gltf

# Farm Animal Pack (Quaternius) en OBJ: oveja, cerdo y llama. Convertir a raw/farmglb/*.glb
# (por ejemplo abriéndolos en Blender o con three.js OBJLoader + GLTFExporter).
mkdir -p raw/farm
for n in Sheep Pig Llama; do for e in obj mtl; do
  [ -s "raw/farm/$n.$e" ] || curl -fsSL -o "raw/farm/$n.$e" "https://raw.githubusercontent.com/teonistor/ggj19/master/Assets/Animals/$n.$e"
done; done
echo "Modelos descargados en $(pwd)/raw"
