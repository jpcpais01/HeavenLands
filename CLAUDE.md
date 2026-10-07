# Heaven Lands

A cozy, mobile-first, top-down pixel-art game built with Phaser 3, TypeScript and Vite. No combat: the player makes one wanderer in a deep character creator, then wanders, builds, grows and cooks, alone or with friends online. All art and sound are generated in code: there are no image or audio files. It is a PWA and deploys to Vercel from `main`. From the Atlas (floating isles over a cloud sea) the wanderer goes Home (their own plot to build on), to the Everwood (the endless forest, without monsters), to the fixed places (Cloudrest, the Sunken Garden, Glimmerdeep, Starwatch: old arenas made peaceful) and to the endless lands (Glowtide Shore, Saltglass Flats, Hushfall, Lumen Meadow). See README.md for the player-facing overview.

The engine underneath (world, Home, Everwood, art, online) was the Myths and Legends game's (repo `jpcpais01/Pixel-Game`); Heaven Lands switches it into cozy mode through hooks, so a lot of engine code still has branches for heroes, monsters and fights that are never taken here. Leave them be unless a change needs otherwise.

## Working rules

- Don't test, playtest or visualize everything along the way. Write good, logical code, and only do a light verification at the end if it seems necessary.
- Don't build or publish a preview Artifact (João, 2026-09-26). Just work on the code: merge to main, and the Vercel site deploys from there.
- Match the existing style: plain-English comments that explain why, `const` tuning numbers at the top of a file, no new dependencies.

## Commands

- `npm run dev`: dev server. `npm run build`: `tsc --noEmit` then `vite build`. `npm run typecheck`: types only. `npm run preview`: serve the build.
- `npm run wanderer` (`npx tsx scripts/wanderer.ts [out.png] [scale] [count] [seed]`): renders wanderers, a row per look, a column per pose.
- `npm run lands -- <id> out.png 2 [x y w h]` (`npx tsx scripts/lands.ts`): paints a patch of an endless land (`NIGHT=1` by night).

## Map of the code

**Startup and app shell**
- `index.html`: the page, its inline loading screen (clouds, motes, the logo and the pixel-font status line, `window.bootLoader`) and the tap to start on phones. `src/heaven/entry.ts` moves storage first (`storage.ts`: every localStorage key under `pixel-battle.` is read and written as `heaven-lands.` instead, so the engine's keys stay this game's own; keep it), then imports `main.ts` only after the page's load event (so the browser's loading bar ends at once).
- `src/heaven/main.ts` wires cozy mode (`wire.ts`), makes the Phaser game with its scenes and pipelines, fits the canvas and drops the graphics level when the world runs slowly.
- `scripts/pwa.ts`: the Vite plugin that serves (dev) and emits (build) the manifest, the icons (`src/heaven/art/icon.ts`), the loading screen's logo (`src/heaven/art/logo.ts`, frames stacked in `loader/logo.png`) and the service worker `sw.js` (precaches the build, caches named `heaven-<hash>`, navigations network-first). Never set `orientation` in the manifest (some phones never open an installed app with one); `display: standalone`; landscape comes from the loading screen's tap, which goes fullscreen (`src/pwa.ts`, which also registers the service worker and shows the Install button and the rotate hint).
- `src/diagnostics.ts`: crash reports, switched off (`CRASH_REPORTS`).

**Heaven Lands** (`src/heaven/`)
- `src/game/cozy.ts` holds the hooks Heaven switches on in `wire.ts`, so the engine's WorldScene, UIScene, MapScene, Remote and online form run it unchanged: the hero (`cozy.character` → `Wanderer.ts`), `spawn`, the player's name and look (`me`), the HUD in place of the ability buttons (`hud` → `ui/emoteButtons.ts`: wave, cheer, dance, sit, heart, keys 4-8, sent online as `em`), chests (`treasure`: seeds), place names (`placeName`), extra arenas (`arena`), a land's living parts (`land`) and an endless land's map (`map`).
- Scenes: `HeavenBoot` (builds the textures a slice a frame behind the loading screen; the wanderer's sheet is built when first shown), `TitleScene` (key `home`, so the pause menu's Home and the world's way out land here: dawn sky, the player's wanderer on a little isle; to Home, the Atlas, the wardrobe or a friend's room), `CreatorScene` (key `creator`, started with `{ first }`: the dressing room, tabs Body, Face, Hair, Clothes, Accessories, Carry, Outfits; `ui/creatorPreview.ts`, `ui/creatorThumbs.ts`, `ui/nameField.ts`, art in `art/creatorArt.ts`, `art/creatorFont.ts`), `AtlasScene` (key `atlas`: floating isles over a cloud sea at golden hour, tap an isle for its card with Go and Together; art in `art/atlas.ts`, `art/atlasIsles.ts` (`ISLE_ART` by place id, `generic` otherwise), `art/atlasPaint.ts`), then the engine's world. Menu colours in `ui/style.ts`.
- The wanderer: `look.ts` is a 30-char code, one character a choice (online: `hero` = 'w' + 24 chars, `look` the rest, as the relay keeps 24 of each); `art/rig.ts` (body, face, clothes, poses; frame 32x42, body box 24x32) and `art/gear.ts` (hair, hats, worn and carried things) draw it on `art/kit.ts`, colours from `art/paint.ts`; `art/sheet.ts` builds a sheet per look (`wd_<code>`, anims `<key>_<anim>_<dir>`). `Wanderer.ts` is its `Hero`: walks, idles and emotes, never attacks.
- `places.ts`: `PLACES` (id, arena, name, blurb, lore), `placeById`. `travel.ts`: going into a place (behind its loading screen when it's painted) and the Together panel for rooms. `profile.ts`: the name, look and 8 saved outfits, on this device.
- Endless lands (`lands/`): every part a pure function of the land's fixed seed and the world position, so friends in a room see one land with nothing sent. Engine: `types.ts` (what a land is: a `LandGen` with no Phaser, and its `LandDef`), `paint.ts` (the shared ground painter, lit like the sprites), `landWorld.ts` (gen plus cached chunk layouts and feet), `LandRuntime.ts` (ground tiles round the view, painted by `landWorker.ts` workers when there are any; props as lit sprites with sun shadows; lanterns get a few of the 16 point lights; walkers and flyers), `arena.ts` (the land as an `ArenaDef`), `gens.ts` (`MAKERS`: the pure halves by id, used by the worker and the script), `index.ts` (`LANDS`, `landArena`, `buildLand`), `landMap.ts` (the minimap and big map: painted a chunk at a time round where the map looks, straight from the gen, kept as small canvases; like `world/trekMap.ts` without the fog). One folder per land, each with `gen.ts`, `art.ts`, `palette.ts`, `life.ts` (its `extra`: waves, sparkles, snow...) and `index.ts`: `shore/` Glowtide Shore, `saltflats/` Saltglass Flats, `hushfall/` Hushfall, `lumen/` Lumen Meadow.
- **Add a land:** a folder beside `shore/` with a pure `gen.ts` (no Phaser, no `Math.random`), an `art.ts` with its sheets, a `palette.ts`, a `life.ts` if it has living parts, and an `index.ts` with its `LandDef`; its gen and sheets in `MAKERS` (`gens.ts`); the `LandDef` in `LANDS` (`index.ts`); a `Place` in `places.ts` (and an isle painter in `ISLE_ART` if `generic` won't do). Check it with `npm run lands -- <id> out.png 2`.

**The world** (`src/scenes/WorldScene.ts`)
- Owns the hero, effects, pickups, lights, day/night, camera, and builds each arena's living parts by id (`cozy.land` for the endless lands). Input comes from `game/controls.ts` (written by `UIScene` and the keyboard): WASD or the joystick, E to act (talk, harvest, swing the critter net), 1-3 hotbar, N day/night.
- `UIScene`: joystick, hotbar, the cozy HUD in place of the ability buttons, timer badges. `PauseScene` (time-of-day picker `ui/dayPicker.ts`, menu art `ui/menuArt.ts`, widgets `ui/optionWidgets.ts`), `ShadeScene` (brightness), `SoundScene` (mute), `FpsScene`, `ArenaLoadScene` (key `arenaload`: painted places built behind a loading picture from `art/loadArt.ts`), `ForestLoadScene`.
- `MapScene` (key `map`): the round minimap top-left (rim `ringFrame` in `art/mapArt.ts`), tapped open into the big map in cozy mode (or Tab). Fixed places get their whole picture from `art/mapArt.ts`; what the player built is drawn by `art/mapBuilds.ts` `paintBuilds`; the Everwood shows the parchment explorer's map (`game/trek.ts`, `world/trekMap.ts`: walked fog squares, campfires, Stag secrets, wood names, where the hero last stood; saved as `trek`/`trekT`), with campfires and shrines as travel points (`WorldScene.travel`); an endless land's map comes from `cozy.map` (`lands/landMap.ts`).
- Mouse pointers (PC, `settings.pointer`): sprites in `art/pointers.ts`, trails in `ui/pointer.ts`.

**The Everwood** (`src/world/forest*.ts`, `Forest.ts`)
- An endless forest from one fixed seed (`EVERWOOD_SEED`, the same for everyone). `forestGen.ts` (`ForestGen`) is a pure function of seed and position: groves, streams, ponds, trails, seven woods (`BIOMES`) with names, terraced land with cliffs, stairs and lookouts, places (campfires, shrines, chests, ruins, standing stones, elder trees, fairy rings) and wild places (sunlit glades, misty bogs, glowcap groves, bramble patches, hunters' camps). `forestGround.ts` is the tile's ground spec; `forestWorker.ts` paints tiles off the main thread. `Forest.ts` streams tiles and chunks, casts shadows and runs the places; `forestArena.ts` is its arena.
- The White Stag (`world/WhiteStag.ts`, art `art/stag.ts`) leads the wanderer to a secret place (Moonwell, Veiled Grove, Moon Hare's Hollow). Living forest: `world/Wildlife.ts` (deer, fox, birds, owls), `world/ForestWind.ts` (gusts), `world/ForestSounds.ts` (brooks, frogs, woodpecker).
- Building and clearing (`world/ForestBuild.ts`, data `world/forestEdits.ts`, floors `world/ForestFloors.ts`): the Home's build tray over the forest on a 16 px grid, the eraser clears trees and undergrowth; saved as `wood`/`woodT`; online the host's forest is the room's.

**Home and building** (`world/Home.ts`, `homeLayout.ts`, `homeParts.ts`)
- The player's own plot on a grid: walls, floors, hipped roofs (`art/homeWalls.ts`), 100+ parts (`art/homeProps.ts` with the shared drawing helpers, `art/homeYard.ts`, `art/homeRoom.ts`, merged on the `home` sheet by `art/homeArt.ts`), build tray `ui/buildHud.ts` + `game/build.ts` (keys B, R, X eraser, Ctrl+Z, Esc), invites `ui/homeFriends.ts`. Walk-in houses and tents (`world/houses.ts`, `world/RoofView.ts`, `art/tentArt.ts`), turned furniture, house shadows (`world/houseShadow.ts`), bridges (`world/bridge.ts`, `world/BridgeView.ts`, `art/bridgeArt.ts`). Critters let out live round their spot (`world/HomeCritters.ts`). Saved as `home`/`homeT`; online the host owns it and sends it in pieces.
- Trees (`art/trees.ts`) are grown, not stamped, and sway (`game/treeSway.ts`).

**Farming, cooking, fishing, critters**
- Farming (`game/farm.ts`, `world/Farm.ts`): seeds sown on garden-bed floor, crops in 4 stages harvested with E; plots saved as `farm`/`farmT` keyed by place. Cooking (`game/recipes.ts`, `game/cooking.ts`, `ui/cookView.ts`): the stove or pot opens the kitchen; ingredients and dishes in `collection.pantry`. Art in `art/farm.ts`.
- Fishing (`world/Fishing.ts`, `scenes/FishScene.ts`, `game/fish.ts`, art `art/fish.ts`): the Home's rod part, within 3 cells of water.
- Critters (`game/critters.ts`, `game/CritterField.ts`, art `art/critters.ts`): caught with the net (E), counted in `collection.critters`.
- `game/collection.ts`: what the player owns, saved locally (and to the cloud through `cloud.ts` when signed in).

**Online play** (`src/net/`)
- `session.ts`: the connection and room. `NetPlay.ts`: sends hero state every 50 ms. `Remote.ts`: other players' wanderers. The relay is the shared one at https://myths-and-legends-server.onrender.com (`net/config.ts`): a WebSocket relay with 4-letter room codes that runs no game logic; its code lives in the Pixel-Game repo (`server/`).

**Art** (`src/art/`)
- `pixel.ts`: the engine. Shapes carry a material and a surface normal; `render()` gives diffuse, normal map and emissive layers. `textures.ts` packs and registers everything; every lit texture has `_e` (emissive) and `_s` (shadow) companions. Sheets and arena grounds are built in workers (`sheetWorker.ts`, `arenaWorker.ts`). `font.ts`/`glyphs.ts`: the pixel font.

**Rendering** (`src/game/`): `LitPipeline.ts` (sun or moon plus sky light on top of Light2D), `PixelPipeline.ts` (ground drawn at art resolution, then scaled up), `SkyPipeline.ts` (cloud shadows and vignette), `display.ts` (pixel ratio, zoom, `snap`), `settings.ts` (quality, zoom, volumes, brightness, screen shake).

**Audio** (`src/audio/`): everything synthesised with Web Audio: `music.ts`, `ambience.ts`, `sfx.ts`, through `mixer.ts`; `index.ts` exposes `sound`.
