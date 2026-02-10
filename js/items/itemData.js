// ============================================================
// ITEM DATABASE
// ============================================================

const WEAPONS = [
    { id: 'rusty_sword', name: 'Rusty Sword', icon: '🗡', rarity: 'COMMON', atk: 3, desc: 'A weathered but functional blade.', speed: 1.0 },
    { id: 'iron_sword', name: 'Iron Sword', icon: '⚔', rarity: 'COMMON', atk: 6, desc: 'Standard-issue iron sword.', speed: 1.0 },
    { id: 'war_axe', name: 'War Axe', icon: '🪓', rarity: 'UNCOMMON', atk: 10, desc: 'A heavy axe that hits hard.', speed: 0.8 },
    { id: 'elven_blade', name: 'Elven Blade', icon: '⚔', rarity: 'UNCOMMON', atk: 8, desc: 'Light and swift elven craftsmanship.', speed: 1.3 },
    { id: 'flame_sword', name: 'Flame Sword', icon: '🔥', rarity: 'RARE', atk: 14, desc: 'Burns with an eternal flame.', speed: 1.0, special: 'burn' },
    { id: 'frost_blade', name: 'Frost Blade', icon: '❄', rarity: 'RARE', atk: 12, desc: 'Chills enemies to the bone.', speed: 1.1, special: 'slow' },
    { id: 'shadow_dagger', name: 'Shadow Dagger', icon: '🗡', rarity: 'RARE', atk: 9, desc: 'Strikes from the shadows. +15% crit.', speed: 1.5, critBonus: 0.15 },
    { id: 'thunder_hammer', name: 'Thunder Hammer', icon: '🔨', rarity: 'EPIC', atk: 20, desc: 'Unleashes lightning on impact.', speed: 0.7, special: 'chain_lightning' },
    { id: 'vampiric_blade', name: 'Vampiric Blade', icon: '🩸', rarity: 'EPIC', atk: 16, desc: 'Drains life from foes. +10% lifesteal.', speed: 1.0, lifesteal: 0.1 },
    { id: 'doom_cleaver', name: 'Doom Cleaver', icon: '💀', rarity: 'LEGENDARY', atk: 28, desc: 'Forged in the abyss. Chance to instant kill.', speed: 0.9, special: 'execute' },
    { id: 'celestial_sword', name: 'Celestial Sword', icon: '✨', rarity: 'LEGENDARY', atk: 24, desc: 'A blade of pure light. +25% crit, heals on kill.', speed: 1.2, critBonus: 0.25, lifesteal: 0.05 },
];

const ARMORS = [
    { id: 'leather_vest', name: 'Leather Vest', icon: '🧥', rarity: 'COMMON', def: 3, desc: 'Basic leather protection.' },
    { id: 'chain_mail', name: 'Chain Mail', icon: '⛓', rarity: 'COMMON', def: 6, desc: 'Linked metal rings.' },
    { id: 'iron_plate', name: 'Iron Plate', icon: '🛡', rarity: 'UNCOMMON', def: 10, desc: 'Solid iron plating.' },
    { id: 'mithril_coat', name: 'Mithril Coat', icon: '✨', rarity: 'UNCOMMON', def: 8, desc: 'Light as silk, strong as steel. +10% speed.', speedBonus: 0.1 },
    { id: 'dragon_scale', name: 'Dragon Scale Armor', icon: '🐉', rarity: 'RARE', def: 15, desc: 'Forged from dragon scales. Fire resist.' },
    { id: 'shadow_cloak', name: 'Shadow Cloak', icon: '🌑', rarity: 'RARE', def: 10, desc: '+12% dodge chance.', dodgeBonus: 0.12 },
    { id: 'titan_armor', name: 'Titan Armor', icon: '🏔', rarity: 'EPIC', def: 22, desc: 'Nearly impenetrable. -10% speed.', speedBonus: -0.1 },
    { id: 'phoenix_robe', name: 'Phoenix Robe', icon: '🔥', rarity: 'EPIC', def: 14, desc: 'Revive once with 30% HP.', special: 'revive' },
    { id: 'void_armor', name: 'Void Armor', icon: '🌀', rarity: 'LEGENDARY', def: 28, desc: 'Absorbs 15% damage as mana shield.', special: 'absorb' },
];

const ACCESSORIES = [
    { id: 'copper_ring', name: 'Copper Ring', icon: '💍', rarity: 'COMMON', desc: '+5 Max HP.', hpBonus: 5 },
    { id: 'lucky_charm', name: 'Lucky Charm', icon: '🍀', rarity: 'COMMON', desc: '+5% crit chance.', critBonus: 0.05 },
    { id: 'speed_boots', name: 'Speed Boots', icon: '👢', rarity: 'UNCOMMON', desc: '+20% movement speed.', speedBonus: 0.2 },
    { id: 'ruby_pendant', name: 'Ruby Pendant', icon: '📿', rarity: 'UNCOMMON', desc: '+3 ATK, +3 DEF.', atkBonus: 3, defBonus: 3 },
    { id: 'amulet_regen', name: 'Amulet of Regeneration', icon: '💚', rarity: 'RARE', desc: 'Regenerate 2 HP/sec.', regenBonus: 2 },
    { id: 'berserker_ring', name: 'Berserker Ring', icon: '💍', rarity: 'RARE', desc: '+8 ATK, -5 DEF.', atkBonus: 8, defBonus: -5 },
    { id: 'crown_wisdom', name: 'Crown of Wisdom', icon: '👑', rarity: 'EPIC', desc: '+40% XP gain.', xpBonus: 0.4 },
    { id: 'ring_void', name: 'Ring of the Void', icon: '⭕', rarity: 'LEGENDARY', desc: '+15 ATK, +15 DEF, +10% lifesteal.', atkBonus: 15, defBonus: 15, lifestealBonus: 0.1 },
];

const CONSUMABLES = [
    { id: 'health_potion', name: 'Health Potion', icon: '❤', rarity: 'COMMON', desc: 'Restore 40 HP.', heal: 40, weight: 40 },
    { id: 'greater_health', name: 'Greater Health Potion', icon: '💖', rarity: 'UNCOMMON', desc: 'Restore 80 HP.', heal: 80, weight: 20 },
    { id: 'strength_elixir', name: 'Strength Elixir', icon: '💪', rarity: 'UNCOMMON', desc: '+10 ATK for 30 seconds.', buff: { stat: 'attack', amount: 10, duration: 30 }, weight: 15 },
    { id: 'shield_potion', name: 'Shield Potion', icon: '🛡', rarity: 'UNCOMMON', desc: '+15 DEF for 30 seconds.', buff: { stat: 'defense', amount: 15, duration: 30 }, weight: 15 },
    { id: 'speed_potion', name: 'Speed Potion', icon: '⚡', rarity: 'COMMON', desc: '+50% speed for 20 seconds.', buff: { stat: 'speed', multiplier: 1.5, duration: 20 }, weight: 20 },
    { id: 'full_restore', name: 'Full Restore', icon: '🌟', rarity: 'RARE', desc: 'Fully restore HP.', fullHeal: true, weight: 5 },
    { id: 'scroll_lightning', name: 'Lightning Scroll', icon: '⚡', rarity: 'RARE', desc: 'Deal 50 damage to all nearby enemies.', aoe: { damage: 50, radius: 8 }, weight: 8 },
    { id: 'scroll_teleport', name: 'Teleport Scroll', icon: '🌀', rarity: 'RARE', desc: 'Teleport to a random room.', teleport: true, weight: 5 },
];

const ItemDatabase = {
    getRandomWeapon(floor) {
        return this._rollRarity(WEAPONS, floor);
    },

    getRandomArmor(floor) {
        return this._rollRarity(ARMORS, floor);
    },

    getRandomAccessory(floor) {
        return this._rollRarity(ACCESSORIES, floor);
    },

    getRandomConsumable(floor) {
        const items = CONSUMABLES.map(c => ({
            ...c,
            _weight: c.weight * (c.rarity === 'RARE' ? 0.5 + floor * 0.1 : 1),
        }));
        return { ...Utils.weightedPick(items, '_weight'), type: ITEM_TYPE.CONSUMABLE };
    },

    getRandomItem(floor) {
        const roll = Math.random();
        if (roll < 0.30) return { ...this.getRandomWeapon(floor), type: ITEM_TYPE.WEAPON };
        if (roll < 0.55) return { ...this.getRandomArmor(floor), type: ITEM_TYPE.ARMOR };
        if (roll < 0.70) return { ...this.getRandomAccessory(floor), type: ITEM_TYPE.ACCESSORY };
        return this.getRandomConsumable(floor);
    },

    _rollRarity(pool, floor) {
        // Higher floors increase chance of better items
        const rarityBonus = floor * 2;
        const weights = {
            COMMON: Math.max(5, 50 - rarityBonus),
            UNCOMMON: 30 + rarityBonus * 0.5,
            RARE: 14 + rarityBonus,
            EPIC: 5 + rarityBonus * 0.8,
            LEGENDARY: 1 + rarityBonus * 0.3,
        };

        // Pick rarity
        const rarityItems = Object.entries(weights).map(([k, v]) => ({ rarity: k, weight: v }));
        const chosenRarity = Utils.weightedPick(rarityItems).rarity;

        // Filter pool by chosen rarity
        const candidates = pool.filter(i => i.rarity === chosenRarity);
        if (candidates.length === 0) {
            // Fallback to any
            return { ...Utils.pick(pool) };
        }
        return { ...Utils.pick(candidates) };
    },

    getChestLoot(floor) {
        const items = [];
        // Always one equipment
        items.push(this.getRandomItem(floor));
        // Chance for extra item
        if (Utils.chance(0.4 + floor * 0.05)) {
            items.push(this.getRandomConsumable(floor));
        }
        // Gold
        items.push({
            type: ITEM_TYPE.GOLD,
            amount: Utils.rand(20, 50) * floor,
        });
        return items;
    },

    getBossLoot(floor) {
        const items = [];
        // Guaranteed rare+ item
        const pool = [...WEAPONS, ...ARMORS, ...ACCESSORIES].filter(
            i => i.rarity === 'RARE' || i.rarity === 'EPIC' || i.rarity === 'LEGENDARY'
        );
        const item = Utils.pick(pool);
        const type = WEAPONS.includes(item) ? ITEM_TYPE.WEAPON :
                     ARMORS.includes(item) ? ITEM_TYPE.ARMOR : ITEM_TYPE.ACCESSORY;
        items.push({ ...item, type });
        items.push({ type: ITEM_TYPE.GOLD, amount: Utils.rand(100, 200) * floor });
        return items;
    },
};
