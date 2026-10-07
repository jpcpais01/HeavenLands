// Companions in Heaven Lands: every little creature the old game had to wish
// for is simply there to choose, its homely ones first (a kitten, a corgi
// pup, a duckling, a cloud lamb, a red panda). The chosen one follows the
// wanderer everywhere, friends in a room see it, and it joins in with the
// wanderer's emotes (see Companion.react). Their powers stay asleep here.

import type Phaser from 'phaser';
import { collection } from '../game/collection';
import { PETS, type PetDef } from '../game/pets';
import { PET_ART, PET_FRAMES, PET_H, PET_W } from '../art/pets';
import { pixelCanvas } from '../art/canvas';
import { bakeLit } from './art/creatorArt';

/** Heaven Lands' own ones lead the list. */
const FIRST = ['kitten', 'pup', 'duckling', 'lamb', 'redpanda'];

export const COMPANIONS: PetDef[] = [...FIRST.map((id) => PETS.find((p) => p.id === id)!), ...PETS.filter((p) => !FIRST.includes(p.id))];

/** Everyone owns every companion here; the engine's companion code asks. */
export function ownCompanions(): void {
  for (const p of COMPANIONS) if (!collection.hasPet(p.id)) collection.unlockPet(p.id);
}

/** The companion chosen ('' for none). */
export const companion = {
  get id(): string {
    return collection.pet;
  },
  set id(id: string) {
    collection.pet = id;
  },
};

/**
 * Every companion's frames baked with light for the menus ('hl_pets_lit', anims
 * `hlpet_<id>`), which have no lights of their own. Small: a few dozen 24 px frames.
 */
export function litPets(scene: Phaser.Scene): string {
  const key = 'hl_pets_lit';
  if (scene.textures.exists(key)) return key;
  const ids = Object.keys(PET_ART);
  const w = PET_W * PET_FRAMES;
  const h = PET_H * ids.length;
  const px = new Uint8ClampedArray(w * h * 4);
  ids.forEach((id, row) => {
    for (let f = 0; f < PET_FRAMES; f++) {
      const r = PET_ART[id](f).render();
      const lit = bakeLit({ w: PET_W, h: PET_H, diffuse: r.diffuse, normal: r.normal, emissive: r.emissive });
      for (let y = 0; y < PET_H; y++) px.set(lit.subarray(y * PET_W * 4, (y + 1) * PET_W * 4), ((row * PET_H + y) * w + f * PET_W) * 4);
    }
  });
  const tex = scene.textures.addCanvas(key, pixelCanvas(w, h, px))!;
  ids.forEach((id, row) => {
    for (let f = 0; f < PET_FRAMES; f++) tex.add(`${id}_${f}`, 0, f * PET_W, row * PET_H, PET_W, PET_H);
    scene.anims.create({ key: `hlpet_${id}`, frames: Array.from({ length: PET_FRAMES }, (_, f) => ({ key, frame: `${id}_${f}` })), frameRate: 7, repeat: -1 });
  });
  return key;
}
