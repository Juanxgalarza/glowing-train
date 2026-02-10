// ============================================================
// GAME CONSTANTS
// ============================================================

const TILE = {
    WALL: 0,
    FLOOR: 1,
    CORRIDOR: 2,
    DOOR: 3,
    STAIRS_DOWN: 4,
    STAIRS_UP: 5,
    TRAP: 6,
    CHEST: 7,
    WATER: 8,
};

const CELL_SIZE = 3;
const WALL_HEIGHT = 3.5;
const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.4;

const ENEMY_TYPES = {
    SKELETON: 'skeleton',
    SLIME: 'slime',
    BAT: 'bat',
    GOBLIN: 'goblin',
    ORC: 'orc',
    WRAITH: 'wraith',
    FIRE_MAGE: 'fire_mage',
    GOLEM: 'golem',
    MIMIC: 'mimic',
    BOSS_LICH: 'boss_lich',
    BOSS_DRAGON: 'boss_dragon',
};

const ITEM_RARITY = {
    COMMON: { name: 'Common', color: '#cccccc', weight: 50 },
    UNCOMMON: { name: 'Uncommon', color: '#44cc44', weight: 30 },
    RARE: { name: 'Rare', color: '#4488ff', weight: 14 },
    EPIC: { name: 'Epic', color: '#cc44ff', weight: 5 },
    LEGENDARY: { name: 'Legendary', color: '#ffaa22', weight: 1 },
};

const ITEM_TYPE = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory',
    CONSUMABLE: 'consumable',
    GOLD: 'gold',
};

const GAME_STATES = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused',
    INVENTORY: 'inventory',
    LEVEL_UP: 'level_up',
    GAME_OVER: 'game_over',
};

const MAX_FLOOR = 10;
const BOSS_FLOORS = [5, 10];

const UPGRADE_POOL = [
    { id: 'max_hp_up', name: 'Vitality Surge', desc: '+25 Max HP, heal 25 HP', apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp); } },
    { id: 'atk_up', name: 'Sharpened Edge', desc: '+5 Attack Power', apply: (p) => { p.attack += 5; } },
    { id: 'def_up', name: 'Iron Skin', desc: '+4 Defense', apply: (p) => { p.defense += 4; } },
    { id: 'spd_up', name: 'Swift Feet', desc: '+15% Move Speed', apply: (p) => { p.speed *= 1.15; } },
    { id: 'crit_up', name: 'Keen Eye', desc: '+8% Critical Chance', apply: (p) => { p.critChance += 0.08; } },
    { id: 'crit_dmg', name: 'Brutal Strikes', desc: '+30% Critical Damage', apply: (p) => { p.critMultiplier += 0.3; } },
    { id: 'lifesteal', name: 'Vampiric Touch', desc: '+5% Life Steal', apply: (p) => { p.lifesteal += 0.05; } },
    { id: 'dodge', name: 'Shadow Step', desc: '+6% Dodge Chance', apply: (p) => { p.dodgeChance += 0.06; } },
    { id: 'atk_spd', name: 'Flurry', desc: '+15% Attack Speed', apply: (p) => { p.attackSpeed *= 1.15; } },
    { id: 'thorns', name: 'Thorny Shield', desc: 'Reflect 20% melee damage', apply: (p) => { p.thorns += 0.2; } },
    { id: 'regen', name: 'Regeneration', desc: 'Heal 1 HP per second', apply: (p) => { p.regen += 1; } },
    { id: 'xp_boost', name: 'Wisdom', desc: '+20% XP gain', apply: (p) => { p.xpMultiplier += 0.2; } },
];
