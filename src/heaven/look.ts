// Heaven Lands' wanderer: who the player made in the character creator and
// what they wear. An appearance is a row of small numbers, one per choice,
// each an index into the lists below. It packs into a short code (one
// character a choice) so it can be saved, and sent to friends online inside
// the room's hero and look fields (the relay keeps 24 characters of each).

export type Hex = string;

export interface Named {
  id: string;
  name: string;
}

/** Skin tones: ten earthly, three from the clouds. */
export const SKINS: (Named & { c: Hex })[] = [
  { id: 'porcelain', name: 'Porcelain', c: '#f8dfcf' },
  { id: 'peach', name: 'Peach', c: '#f2c7a8' },
  { id: 'rose', name: 'Rose', c: '#e9b39b' },
  { id: 'sand', name: 'Sand', c: '#ddb088' },
  { id: 'honey', name: 'Honey', c: '#cc9767' },
  { id: 'olive', name: 'Olive', c: '#b98b5d' },
  { id: 'amber', name: 'Amber', c: '#a6714a' },
  { id: 'cocoa', name: 'Cocoa', c: '#8b5a3b' },
  { id: 'umber', name: 'Umber', c: '#6f452d' },
  { id: 'ebony', name: 'Ebony', c: '#513224' },
  { id: 'moonstone', name: 'Moonstone', c: '#c9d5f2' },
  { id: 'sage', name: 'Sage', c: '#bcd9b1' },
  { id: 'lilac', name: 'Lilac', c: '#d9c2ee' },
];

export const HAIR_COLORS: (Named & { c: Hex })[] = [
  { id: 'ink', name: 'Ink', c: '#2c2433' },
  { id: 'espresso', name: 'Espresso', c: '#4c3122' },
  { id: 'chestnut', name: 'Chestnut', c: '#7c472a' },
  { id: 'auburn', name: 'Auburn', c: '#9c3d26' },
  { id: 'copper', name: 'Copper', c: '#cb6c32' },
  { id: 'honey', name: 'Honey', c: '#d9a252' },
  { id: 'flaxen', name: 'Flaxen', c: '#ecd38e' },
  { id: 'platinum', name: 'Platinum', c: '#f1ecdc' },
  { id: 'silver', name: 'Silver', c: '#c4c9d8' },
  { id: 'ash', name: 'Ash', c: '#8a8a93' },
  { id: 'rose', name: 'Rose', c: '#f2a2ba' },
  { id: 'cherry', name: 'Cherry', c: '#d94a63' },
  { id: 'lavender', name: 'Lavender', c: '#baa2ea' },
  { id: 'violet', name: 'Violet', c: '#7b52c2' },
  { id: 'sky', name: 'Sky', c: '#8ac2f2' },
  { id: 'ocean', name: 'Ocean', c: '#3b72c2' },
  { id: 'mint', name: 'Mint', c: '#8de2c2' },
  { id: 'moss', name: 'Moss', c: '#5d8c4c' },
];

export const EYE_COLORS: (Named & { c: Hex })[] = [
  { id: 'umber', name: 'Umber', c: '#5c3b25' },
  { id: 'hazel', name: 'Hazel', c: '#8c6c32' },
  { id: 'amber', name: 'Amber', c: '#cc8c2c' },
  { id: 'green', name: 'Green', c: '#4b9c5c' },
  { id: 'teal', name: 'Teal', c: '#2c9c9c' },
  { id: 'blue', name: 'Blue', c: '#3c72d2' },
  { id: 'grey', name: 'Grey', c: '#7c8ca2' },
  { id: 'violet', name: 'Violet', c: '#8c5cd2' },
  { id: 'rose', name: 'Rose', c: '#d2628c' },
  { id: 'gold', name: 'Gold', c: '#e2b232' },
];

/** What clothes, hats and things carried can be dyed. */
export const CLOTH: (Named & { c: Hex })[] = [
  { id: 'white', name: 'White', c: '#f3efe6' },
  { id: 'cream', name: 'Cream', c: '#e9ddc2' },
  { id: 'oat', name: 'Oat', c: '#cab68e' },
  { id: 'sand', name: 'Sand', c: '#dab97a' },
  { id: 'butter', name: 'Butter', c: '#f1da72' },
  { id: 'marigold', name: 'Marigold', c: '#e9aa3a' },
  { id: 'rust', name: 'Rust', c: '#c2622e' },
  { id: 'tomato', name: 'Tomato', c: '#d94c3c' },
  { id: 'cherry', name: 'Cherry', c: '#aa2c3c' },
  { id: 'rose', name: 'Rose', c: '#e98ca2' },
  { id: 'blush', name: 'Blush', c: '#f2c2ca' },
  { id: 'plum', name: 'Plum', c: '#7c3c6c' },
  { id: 'lilac', name: 'Lilac', c: '#ba9cda' },
  { id: 'violet', name: 'Violet', c: '#6c4caa' },
  { id: 'navy', name: 'Navy', c: '#2c3c6c' },
  { id: 'denim', name: 'Denim', c: '#4c6ca2' },
  { id: 'sky', name: 'Sky', c: '#8cc2ea' },
  { id: 'teal', name: 'Teal', c: '#2c8c8c' },
  { id: 'mint', name: 'Mint', c: '#9cdaba' },
  { id: 'sage', name: 'Sage', c: '#8caa7a' },
  { id: 'forest', name: 'Forest', c: '#3c6c3c' },
  { id: 'olive', name: 'Olive', c: '#7c7c3c' },
  { id: 'brown', name: 'Brown', c: '#6c4c32' },
  { id: 'cocoa', name: 'Cocoa', c: '#4c342a' },
  { id: 'charcoal', name: 'Charcoal', c: '#3c3c46' },
  { id: 'slate', name: 'Slate', c: '#6c7282' },
  { id: 'silver', name: 'Silver', c: '#babeca' },
  { id: 'black', name: 'Black', c: '#201e26' },
];

export const HEIGHTS: Named[] = [
  { id: 'short', name: 'Short' },
  { id: 'tall', name: 'Tall' },
];
export const BUILDS: Named[] = [
  { id: 'slim', name: 'Slim' },
  { id: 'soft', name: 'Soft' },
  { id: 'broad', name: 'Broad' },
];
export const EYES: Named[] = [
  { id: 'round', name: 'Round' },
  { id: 'bright', name: 'Bright' },
  { id: 'gentle', name: 'Gentle' },
  { id: 'content', name: 'Content' },
  { id: 'wide', name: 'Wide' },
  { id: 'cat', name: 'Cat' },
  { id: 'dot', name: 'Dot' },
  { id: 'starry', name: 'Starry' },
];
export const BROWS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'soft', name: 'Soft' },
  { id: 'bold', name: 'Bold' },
  { id: 'arched', name: 'Arched' },
  { id: 'worried', name: 'Worried' },
];
export const MOUTHS: Named[] = [
  { id: 'smile', name: 'Smile' },
  { id: 'grin', name: 'Grin' },
  { id: 'calm', name: 'Calm' },
  { id: 'open', name: 'Oh' },
  { id: 'cat', name: 'Cat' },
  { id: 'smirk', name: 'Smirk' },
  { id: 'blep', name: 'Blep' },
];
export const CHEEKS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'blush', name: 'Blush' },
  { id: 'freckles', name: 'Freckles' },
  { id: 'both', name: 'Blush and freckles' },
];
export const HAIRS: Named[] = [
  { id: 'crop', name: 'Crop' },
  { id: 'tousled', name: 'Tousled' },
  { id: 'spiky', name: 'Spiky' },
  { id: 'pixie', name: 'Pixie' },
  { id: 'bob', name: 'Bob' },
  { id: 'long', name: 'Long' },
  { id: 'wavy', name: 'Wavy' },
  { id: 'ponytail', name: 'Ponytail' },
  { id: 'highpony', name: 'High pony' },
  { id: 'pigtails', name: 'Pigtails' },
  { id: 'bun', name: 'Bun' },
  { id: 'spacebuns', name: 'Space buns' },
  { id: 'braid', name: 'Braid' },
  { id: 'curls', name: 'Curls' },
  { id: 'afro', name: 'Afro' },
  { id: 'hime', name: 'Hime' },
  { id: 'swept', name: 'Swept' },
  { id: 'shaved', name: 'Shaved' },
  { id: 'sidepart', name: 'Side part' },
  { id: 'quiff', name: 'Quiff' },
  { id: 'undercut', name: 'Undercut' },
  { id: 'mohawk', name: 'Mohawk' },
  { id: 'mullet', name: 'Mullet' },
  { id: 'manbun', name: 'Man bun' },
  { id: 'curtains', name: 'Curtains' },
  { id: 'locs', name: 'Locs' },
  { id: 'slick', name: 'Slicked back' },
];
export const BEARDS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'stubble', name: 'Stubble' },
  { id: 'moustache', name: 'Moustache' },
  { id: 'goatee', name: 'Goatee' },
  { id: 'full', name: 'Full beard' },
  { id: 'handlebar', name: 'Handlebar' },
  { id: 'sideburns', name: 'Sideburns' },
  { id: 'chinstrap', name: 'Chinstrap' },
  { id: 'viking', name: 'Braided beard' },
];
export const TOPS: Named[] = [
  { id: 'tee', name: 'Tee' },
  { id: 'stripes', name: 'Striped tee' },
  { id: 'longsleeve', name: 'Long sleeve' },
  { id: 'hoodie', name: 'Hoodie' },
  { id: 'sweater', name: 'Knit sweater' },
  { id: 'cardigan', name: 'Cardigan' },
  { id: 'overshirt', name: 'Open shirt' },
  { id: 'tank', name: 'Tank top' },
  { id: 'blouse', name: 'Blouse' },
  { id: 'sailor', name: 'Sailor top' },
  { id: 'turtleneck', name: 'Turtleneck' },
  { id: 'kimono', name: 'Haori' },
  { id: 'tunic', name: 'Belted tunic' },
  { id: 'puffer', name: 'Puffer jacket' },
  { id: 'vest', name: 'Waistcoat' },
  { id: 'flannel', name: 'Flannel shirt' },
  { id: 'hawaiian', name: 'Hawaiian shirt' },
  { id: 'jersey', name: 'Football jersey' },
  { id: 'letterman', name: 'Varsity jacket' },
  { id: 'leather', name: 'Leather jacket' },
  { id: 'denim', name: 'Denim jacket' },
  { id: 'polo', name: 'Polo shirt' },
  { id: 'blazer', name: 'Blazer and tie' },
  { id: 'tracksuit', name: 'Track jacket' },
  { id: 'raglan', name: 'Baseball tee' },
  { id: 'poncho', name: 'Poncho' },
  { id: 'armor', name: 'Breastplate' },
  { id: 'gi', name: 'Gi' },
];
export const BOTTOMS: Named[] = [
  { id: 'trousers', name: 'Trousers' },
  { id: 'shorts', name: 'Shorts' },
  { id: 'skirt', name: 'Skirt' },
  { id: 'longskirt', name: 'Long skirt' },
  { id: 'overalls', name: 'Overalls' },
  { id: 'leggings', name: 'Leggings' },
  { id: 'cargo', name: 'Cargo pants' },
  { id: 'pleated', name: 'Pleated skirt' },
  { id: 'rolled', name: 'Rolled jeans' },
  { id: 'bloomers', name: 'Puffy pants' },
  { id: 'joggers', name: 'Joggers' },
  { id: 'boardshorts', name: 'Board shorts' },
  { id: 'kilt', name: 'Kilt' },
  { id: 'ripped', name: 'Ripped jeans' },
  { id: 'hakama', name: 'Hakama' },
];
export const DRESSES: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'sundress', name: 'Sundress' },
  { id: 'gown', name: 'Long gown' },
  { id: 'pinafore', name: 'Pinafore' },
  { id: 'robe', name: 'Robe' },
  { id: 'yukata', name: 'Yukata' },
  { id: 'smock', name: 'Smock dress' },
  { id: 'apron', name: 'Apron dress' },
  { id: 'knitdress', name: 'Sweater dress' },
  { id: 'starrobe', name: 'Starry robe' },
  { id: 'coveralls', name: 'Coveralls' },
  { id: 'spacesuit', name: 'Space suit' },
  { id: 'ninja', name: 'Ninja garb' },
  { id: 'knight', name: 'Knight armour' },
  { id: 'captain', name: "Captain's coat" },
  { id: 'wizard', name: 'Wizard robe' },
  { id: 'qipao', name: 'Qipao' },
  { id: 'ballgown', name: 'Ball gown' },
];
export const SHOES: Named[] = [
  { id: 'boots', name: 'Boots' },
  { id: 'sneakers', name: 'Sneakers' },
  { id: 'sandals', name: 'Sandals' },
  { id: 'slippers', name: 'Slippers' },
  { id: 'rainboots', name: 'Rain boots' },
  { id: 'maryjanes', name: 'Mary Janes' },
  { id: 'clogs', name: 'Clogs' },
  { id: 'bare', name: 'Barefoot' },
  { id: 'hightops', name: 'High-tops' },
  { id: 'cowboy', name: 'Cowboy boots' },
  { id: 'loafers', name: 'Loafers' },
];
export const HATS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'sunhat', name: 'Sun hat' },
  { id: 'witch', name: 'Witch hat' },
  { id: 'flowers', name: 'Flower crown' },
  { id: 'cap', name: 'Cap' },
  { id: 'beret', name: 'Beret' },
  { id: 'tophat', name: 'Top hat' },
  { id: 'catears', name: 'Cat ears' },
  { id: 'bunny', name: 'Bunny ears' },
  { id: 'bow', name: 'Bow' },
  { id: 'frog', name: 'Frog hat' },
  { id: 'mushroom', name: 'Mushroom cap' },
  { id: 'crown', name: 'Crown' },
  { id: 'halo', name: 'Halo' },
  { id: 'headphones', name: 'Headphones' },
  { id: 'bucket', name: 'Bucket hat' },
  { id: 'flatcap', name: 'Flat cap' },
  { id: 'hood', name: 'Hood' },
  { id: 'bandana', name: 'Bandana' },
  { id: 'foxmask', name: 'Fox mask' },
  { id: 'antlers', name: 'Antlers' },
  { id: 'cowboy', name: 'Cowboy hat' },
  { id: 'viking', name: 'Viking helm' },
  { id: 'helm', name: 'Knight helm' },
  { id: 'spacehelm', name: 'Space helmet' },
  { id: 'tricorn', name: 'Tricorn' },
  { id: 'wizard', name: 'Wizard hat' },
  { id: 'backcap', name: 'Cap backwards' },
  { id: 'headband', name: 'Headband' },
  { id: 'fedora', name: 'Fedora' },
  { id: 'toque', name: 'Chef hat' },
];
export const GLASSES: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'round', name: 'Round glasses' },
  { id: 'square', name: 'Square glasses' },
  { id: 'shades', name: 'Sunglasses' },
  { id: 'hearts', name: 'Heart shades' },
  { id: 'monocle', name: 'Monocle' },
  { id: 'patch', name: 'Eyepatch' },
  { id: 'aviators', name: 'Aviators' },
  { id: 'goggles', name: 'Goggles' },
  { id: 'visor', name: 'Visor' },
  { id: 'facemask', name: 'Face mask' },
];
export const EARRINGS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'studs', name: 'Studs' },
  { id: 'hoops', name: 'Hoops' },
  { id: 'drops', name: 'Pearl drops' },
];
export const NECKS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'scarf', name: 'Scarf' },
  { id: 'bowtie', name: 'Bow tie' },
  { id: 'bandana', name: 'Neckerchief' },
  { id: 'pendant', name: 'Pendant' },
  { id: 'pearls', name: 'Pearls' },
  { id: 'lei', name: 'Flower lei' },
  { id: 'tie', name: 'Tie' },
  { id: 'chain', name: 'Gold chain' },
  { id: 'dogtags', name: 'Dog tags' },
];
export const BACKS: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'backpack', name: 'Backpack' },
  { id: 'angel', name: 'Angel wings' },
  { id: 'butterfly', name: 'Butterfly wings' },
  { id: 'fairy', name: 'Fairy wings' },
  { id: 'cape', name: 'Cape' },
  { id: 'satchel', name: 'Satchel' },
  { id: 'guitar', name: 'Guitar' },
  { id: 'cattail', name: 'Cat tail' },
  { id: 'foxtail', name: 'Fox tail' },
  { id: 'sword', name: 'Sword' },
  { id: 'shield', name: 'Shield' },
  { id: 'skateboard', name: 'Skateboard' },
  { id: 'quiver', name: 'Quiver' },
  { id: 'jetpack', name: 'Jetpack' },
  { id: 'dragonwings', name: 'Dragon wings' },
  { id: 'surfboard', name: 'Surfboard' },
];
export const HELD: Named[] = [
  { id: 'none', name: 'None' },
  { id: 'lantern', name: 'Lantern' },
  { id: 'bouquet', name: 'Bouquet' },
  { id: 'wateringcan', name: 'Watering can' },
  { id: 'book', name: 'Book' },
  { id: 'teacup', name: 'Teacup' },
  { id: 'balloon', name: 'Balloon' },
  { id: 'umbrella', name: 'Umbrella' },
  { id: 'sparkler', name: 'Sparkler' },
  { id: 'plush', name: 'Plush bunny' },
  { id: 'kitten', name: 'Kitten' },
  { id: 'plant', name: 'Potted plant' },
  { id: 'icecream', name: 'Ice cream' },
  { id: 'baguette', name: 'Baguette' },
  { id: 'fan', name: 'Paper fan' },
  { id: 'wand', name: 'Star wand' },
  { id: 'paperlantern', name: 'Paper lantern' },
  { id: 'mug', name: 'Cocoa mug' },
  { id: 'football', name: 'Football' },
  { id: 'basketball', name: 'Basketball' },
  { id: 'woodsword', name: 'Wooden sword' },
  { id: 'staff', name: 'Magic staff' },
  { id: 'torch', name: 'Torch' },
  { id: 'gamepad', name: 'Handheld game' },
  { id: 'map', name: 'Treasure map' },
  { id: 'puppy', name: 'Puppy' },
];

/** One choice of the appearance: its key, and the list its number indexes. */
export interface Field {
  key: keyof Appearance;
  list: readonly unknown[];
}

export interface Appearance {
  height: number;
  build: number;
  skin: number;
  eyes: number;
  eyeColor: number;
  brows: number;
  mouth: number;
  cheeks: number;
  hair: number;
  hairColor: number;
  beard: number;
  top: number;
  topColor: number;
  trim: number;
  bottom: number;
  bottomColor: number;
  dress: number;
  dressColor: number;
  shoes: number;
  shoesColor: number;
  hat: number;
  hatColor: number;
  glasses: number;
  earrings: number;
  neck: number;
  neckColor: number;
  back: number;
  backColor: number;
  held: number;
  heldColor: number;
}

/** Every choice in the order the code packs them. New choices only ever go on the end, so old codes still read. */
export const FIELDS: Field[] = [
  { key: 'height', list: HEIGHTS },
  { key: 'build', list: BUILDS },
  { key: 'skin', list: SKINS },
  { key: 'eyes', list: EYES },
  { key: 'eyeColor', list: EYE_COLORS },
  { key: 'brows', list: BROWS },
  { key: 'mouth', list: MOUTHS },
  { key: 'cheeks', list: CHEEKS },
  { key: 'hair', list: HAIRS },
  { key: 'hairColor', list: HAIR_COLORS },
  { key: 'beard', list: BEARDS },
  { key: 'top', list: TOPS },
  { key: 'topColor', list: CLOTH },
  { key: 'trim', list: CLOTH },
  { key: 'bottom', list: BOTTOMS },
  { key: 'bottomColor', list: CLOTH },
  { key: 'dress', list: DRESSES },
  { key: 'dressColor', list: CLOTH },
  { key: 'shoes', list: SHOES },
  { key: 'shoesColor', list: CLOTH },
  { key: 'hat', list: HATS },
  { key: 'hatColor', list: CLOTH },
  { key: 'glasses', list: GLASSES },
  { key: 'earrings', list: EARRINGS },
  { key: 'neck', list: NECKS },
  { key: 'neckColor', list: CLOTH },
  { key: 'back', list: BACKS },
  { key: 'backColor', list: CLOTH },
  { key: 'held', list: HELD },
  { key: 'heldColor', list: CLOTH },
];

const cloth = (id: string) => CLOTH.findIndex((c) => c.id === id);

/** Who the player is before they've made anyone: a wanderer in a cream sweater with a lantern. */
export const DEFAULT_LOOK: Appearance = {
  height: 0,
  build: 1,
  skin: 2,
  eyes: 1,
  eyeColor: 3,
  brows: 1,
  mouth: 0,
  cheeks: 1,
  hair: 4,
  hairColor: 2,
  beard: 0,
  top: 4,
  topColor: cloth('cream'),
  trim: cloth('rose'),
  bottom: 0,
  bottomColor: cloth('brown'),
  dress: 0,
  dressColor: cloth('sky'),
  shoes: 0,
  shoesColor: cloth('cocoa'),
  hat: 0,
  hatColor: cloth('marigold'),
  glasses: 0,
  earrings: 0,
  neck: 1,
  neckColor: cloth('sage'),
  back: 0,
  backColor: cloth('brown'),
  held: 1,
  heldColor: cloth('marigold'),
};

/** What a ready-made outfit sets: everything worn from the top down to the thing carried, but the earrings (those stay the wearer's own). */
export type PresetKey = Exclude<keyof Appearance, 'height' | 'build' | 'skin' | 'eyes' | 'eyeColor' | 'brows' | 'mouth' | 'cheeks' | 'hair' | 'hairColor' | 'beard' | 'earrings'>;

/** A ready-made outfit in the wardrobe, each piece and colour named by its id. */
export interface Preset extends Named {
  wear: Partial<Record<PresetKey, string>>;
}

/** Ready-made outfits, tapped on in the wardrobe: a strong share of adventurers, sportsmen and rogues beside the gowns and wings. */
export const PRESETS: Preset[] = [
  { id: 'knight', name: 'Knight', wear: { top: 'armor', bottom: 'trousers', dress: 'knight', dressColor: 'silver', trim: 'cherry', shoes: 'boots', shoesColor: 'charcoal', hat: 'helm', hatColor: 'cherry', back: 'shield', backColor: 'navy' } },
  { id: 'astronaut', name: 'Astronaut', wear: { top: 'longsleeve', bottom: 'trousers', dress: 'spacesuit', dressColor: 'white', trim: 'tomato', shoes: 'boots', shoesColor: 'silver', hat: 'spacehelm', hatColor: 'white', back: 'jetpack', backColor: 'tomato' } },
  { id: 'pirate', name: 'Pirate', wear: { top: 'blouse', bottom: 'trousers', bottomColor: 'cream', dress: 'captain', dressColor: 'navy', trim: 'marigold', shoes: 'boots', shoesColor: 'black', hat: 'tricorn', hatColor: 'black', glasses: 'patch', held: 'map', heldColor: 'brown' } },
  { id: 'ninja', name: 'Ninja', wear: { top: 'longsleeve', bottom: 'trousers', dress: 'ninja', dressColor: 'charcoal', trim: 'cherry', shoes: 'slippers', shoesColor: 'black', hat: 'headband', hatColor: 'cherry', glasses: 'facemask', back: 'sword', backColor: 'black' } },
  { id: 'wizard', name: 'Wizard', wear: { top: 'longsleeve', bottom: 'trousers', dress: 'wizard', dressColor: 'violet', trim: 'marigold', shoes: 'boots', shoesColor: 'brown', hat: 'wizard', hatColor: 'violet', held: 'staff', heldColor: 'sky' } },
  { id: 'cowboy', name: 'Cowboy', wear: { top: 'flannel', topColor: 'rust', trim: 'cocoa', bottom: 'trousers', bottomColor: 'denim', shoes: 'cowboy', shoesColor: 'brown', hat: 'cowboy', hatColor: 'oat', neck: 'bandana', neckColor: 'tomato' } },
  { id: 'skater', name: 'Skater', wear: { top: 'raglan', topColor: 'white', trim: 'black', bottom: 'ripped', bottomColor: 'denim', shoes: 'hightops', shoesColor: 'cherry', hat: 'backcap', hatColor: 'black', back: 'skateboard', backColor: 'tomato' } },
  { id: 'footballer', name: 'Footballer', wear: { top: 'jersey', topColor: 'cherry', trim: 'white', bottom: 'shorts', bottomColor: 'white', shoes: 'sneakers', shoesColor: 'black', held: 'football', heldColor: 'black' } },
  { id: 'rockstar', name: 'Rock star', wear: { top: 'leather', topColor: 'black', trim: 'silver', bottom: 'ripped', bottomColor: 'charcoal', shoes: 'boots', shoesColor: 'black', glasses: 'shades', neck: 'chain', neckColor: 'black', back: 'guitar', backColor: 'cherry' } },
  { id: 'surfer', name: 'Surfer', wear: { top: 'hawaiian', topColor: 'sky', trim: 'butter', bottom: 'boardshorts', bottomColor: 'teal', shoes: 'sandals', shoesColor: 'brown', glasses: 'aviators', back: 'surfboard', backColor: 'marigold' } },
  { id: 'viking', name: 'Viking', wear: { top: 'tunic', topColor: 'forest', trim: 'marigold', bottom: 'trousers', bottomColor: 'brown', shoes: 'boots', shoesColor: 'cocoa', hat: 'viking', hatColor: 'silver', back: 'shield', backColor: 'rust' } },
  { id: 'gentleman', name: 'Gentleman', wear: { top: 'blazer', topColor: 'navy', trim: 'cherry', bottom: 'trousers', bottomColor: 'navy', shoes: 'loafers', shoesColor: 'brown', hat: 'fedora', hatColor: 'charcoal', held: 'book', heldColor: 'forest' } },
  { id: 'explorer', name: 'Explorer', wear: { top: 'overshirt', topColor: 'sage', trim: 'cream', bottom: 'cargo', bottomColor: 'sand', shoes: 'boots', shoesColor: 'brown', hat: 'bucket', hatColor: 'oat', neck: 'bandana', neckColor: 'rust', back: 'backpack', backColor: 'brown', held: 'map', heldColor: 'brown' } },
  { id: 'karate', name: 'Karate', wear: { top: 'gi', topColor: 'white', trim: 'black', bottom: 'trousers', bottomColor: 'white', shoes: 'bare', hat: 'headband', hatColor: 'tomato' } },
  { id: 'samurai', name: 'Samurai', wear: { top: 'kimono', topColor: 'navy', trim: 'white', bottom: 'hakama', bottomColor: 'charcoal', shoes: 'sandals', shoesColor: 'cocoa', back: 'sword', backColor: 'black' } },
  { id: 'mechanic', name: 'Mechanic', wear: { top: 'tee', bottom: 'trousers', dress: 'coveralls', dressColor: 'slate', trim: 'tomato', shoes: 'boots', shoesColor: 'black', hat: 'backcap', hatColor: 'tomato' } },
  { id: 'athlete', name: 'Athlete', wear: { top: 'tracksuit', topColor: 'navy', trim: 'white', bottom: 'joggers', bottomColor: 'navy', shoes: 'sneakers', shoesColor: 'white', neck: 'chain', neckColor: 'black', held: 'basketball' } },
  { id: 'highlander', name: 'Highlander', wear: { top: 'longsleeve', topColor: 'cream', trim: 'tomato', bottom: 'kilt', bottomColor: 'forest', shoes: 'boots', shoesColor: 'cocoa', back: 'sword', backColor: 'brown' } },
  { id: 'chef', name: 'Chef', wear: { top: 'longsleeve', topColor: 'white', trim: 'charcoal', bottom: 'trousers', bottomColor: 'charcoal', shoes: 'clogs', shoesColor: 'black', hat: 'toque', hatColor: 'white', neck: 'bandana', neckColor: 'tomato', held: 'baguette' } },
  { id: 'adventurer', name: 'Adventurer', wear: { top: 'leather', topColor: 'brown', trim: 'cream', bottom: 'cargo', bottomColor: 'olive', shoes: 'boots', shoesColor: 'cocoa', glasses: 'goggles', back: 'quiver', backColor: 'forest', held: 'torch' } },
  { id: 'princess', name: 'Princess', wear: { top: 'blouse', bottom: 'trousers', dress: 'ballgown', dressColor: 'blush', trim: 'rose', shoes: 'maryjanes', shoesColor: 'rose', hat: 'crown', hatColor: 'sky', neck: 'pearls' } },
  { id: 'festival', name: 'Festival', wear: { top: 'blouse', bottom: 'trousers', dress: 'qipao', dressColor: 'cherry', trim: 'marigold', shoes: 'maryjanes', shoesColor: 'black', held: 'paperlantern', heldColor: 'tomato' } },
  { id: 'fairy', name: 'Fairy', wear: { top: 'tank', bottom: 'skirt', dress: 'sundress', dressColor: 'mint', trim: 'lilac', shoes: 'slippers', shoesColor: 'mint', hat: 'flowers', hatColor: 'lilac', back: 'fairy', backColor: 'mint', held: 'wand' } },
  { id: 'angel', name: 'Angel', wear: { top: 'blouse', bottom: 'trousers', dress: 'gown', dressColor: 'white', trim: 'butter', shoes: 'sandals', shoesColor: 'cream', hat: 'halo', back: 'angel' } },
];

/** A ready-made outfit as the choices it sets: anything worn it doesn't name comes off; colours it doesn't name stay as they are. */
export function presetWear(p: Preset): Partial<Appearance> {
  const out: Partial<Appearance> = {};
  const start = FIELDS.findIndex((f) => f.key === 'top');
  for (const f of FIELDS.slice(start)) {
    if (f.key === 'earrings') continue;
    const want = p.wear[f.key as PresetKey];
    const list = f.list as Named[];
    if (want !== undefined) {
      const i = list.findIndex((o) => o.id === want);
      if (i >= 0) out[f.key] = i;
    } else if (list[0]?.id === 'none') out[f.key] = 0;
  }
  return out;
}

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The appearance as a short code: one character per choice. */
export function encodeLook(a: Appearance): string {
  return FIELDS.map((f) => DIGITS[Math.max(0, Math.min(f.list.length - 1, a[f.key] | 0))]).join('');
}

/** A code back into an appearance; anything missing or out of range falls back to the default look. */
export function decodeLook(code: string | null | undefined): Appearance {
  const a = { ...DEFAULT_LOOK };
  if (!code) return a;
  FIELDS.forEach((f, i) => {
    const n = DIGITS.indexOf(code[i] ?? '');
    if (n >= 0 && n < f.list.length) a[f.key] = n;
  });
  return a;
}

/** The look split over a room's hero and look fields (24 characters each, the hero's first a 'w'). */
export function lookFields(a: Appearance): { hero: string; look: string } {
  const code = encodeLook(a);
  return { hero: `w${code.slice(0, 23)}`, look: code.slice(23) };
}

export function lookFromFields(hero: string | undefined, look: string | undefined): Appearance {
  if (!hero || hero[0] !== 'w') return { ...DEFAULT_LOOK };
  return decodeLook(hero.slice(1) + (look ?? ''));
}

/** A whole new person, for the dice in the creator: matched colours more often than not. */
export function randomLook(rand: () => number = Math.random): Appearance {
  const pick = (n: number) => Math.floor(rand() * n);
  const a = {} as Appearance;
  for (const f of FIELDS) a[f.key] = pick(f.list.length);
  // Most people are plainly dressed: fewer dresses, hats, things on their back and glasses.
  if (rand() < 0.65) a.dress = 0;
  if (rand() < 0.45) a.hat = 0;
  if (rand() < 0.6) a.back = 0;
  if (rand() < 0.7) a.glasses = 0;
  if (rand() < 0.7) a.beard = 0;
  if (rand() < 0.5) a.earrings = 0;
  if (rand() < 0.4) a.neck = 0;
  if (rand() < 0.35) a.held = 0;
  // The fantasy skins and hair colours a little rarer.
  if (a.skin >= 10 && rand() < 0.6) a.skin = pick(10);
  if (a.hairColor >= 10 && rand() < 0.4) a.hairColor = pick(10);
  return a;
}

/** The colour a choice shows on its swatch in the creator. */
export function colorOf(list: readonly unknown[], i: number): Hex | null {
  const item = list[i] as { c?: Hex } | undefined;
  return item?.c ?? null;
}
