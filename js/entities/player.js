// ============================================================
// PLAYER ENTITY
// ============================================================

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        // Base stats
        this.maxHp = 100;
        this.hp = 100;
        this.attack = 10;
        this.defense = 5;
        this.speed = 5.0;
        this.attackSpeed = 1.0;
        this.critChance = 0.05;
        this.critMultiplier = 1.5;
        this.lifesteal = 0;
        this.dodgeChance = 0;
        this.thorns = 0;
        this.regen = 0;
        this.xpMultiplier = 1.0;

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = 100;
        this.gold = 0;
        this.floor = 1;
        this.kills = 0;

        // Combat
        this.attackCooldown = 0;
        this.attackRange = 3.0;
        this.invulnTimer = 0;

        // Buffs
        this.buffs = [];

        // Position
        this.x = 0;
        this.z = 0;

        // Inventory
        this.inventory = new Inventory();

        // Stats tracking
        this.stats = {
            damageDealt: 0,
            damageTaken: 0,
            itemsCollected: 0,
            chestsOpened: 0,
            floorsCleared: 0,
            timePlayed: 0,
        };

        // Special flags
        this.hasRevive = false;
    }

    getEffectiveStats() {
        const bonuses = this.inventory.getEquipmentBonuses();
        const buffBonuses = this._getBuffBonuses();

        return {
            attack: this.attack + bonuses.atk + buffBonuses.atk,
            defense: this.defense + bonuses.def + buffBonuses.def,
            speed: (this.speed * (1 + bonuses.speed)) * (buffBonuses.speedMult || 1),
            critChance: this.critChance + bonuses.crit,
            dodgeChance: this.dodgeChance + bonuses.dodge,
            lifesteal: this.lifesteal + bonuses.lifesteal,
            regen: this.regen + bonuses.regen,
            xpMultiplier: this.xpMultiplier + bonuses.xp,
            maxHp: this.maxHp + bonuses.hp,
            attackSpeed: this.attackSpeed * (this.inventory.equipment.weapon?.speed || 1.0),
        };
    }

    _getBuffBonuses() {
        const b = { atk: 0, def: 0, speedMult: 1 };
        for (const buff of this.buffs) {
            if (buff.stat === 'attack') b.atk += buff.amount;
            if (buff.stat === 'defense') b.def += buff.amount;
            if (buff.stat === 'speed') b.speedMult *= buff.multiplier || 1;
        }
        return b;
    }

    takeDamage(amount) {
        if (this.invulnTimer > 0) return 0;

        const stats = this.getEffectiveStats();

        // Dodge check
        if (Utils.chance(stats.dodgeChance)) {
            return -1; // Dodged
        }

        // Calculate actual damage
        const mitigated = Math.max(1, amount - stats.defense * 0.5);
        const actual = Math.round(mitigated);

        this.hp -= actual;
        this.stats.damageTaken += actual;
        this.invulnTimer = 0.3;

        // Check for revive (phoenix robe)
        if (this.hp <= 0 && this.hasRevive) {
            this.hp = Math.floor(stats.maxHp * 0.3);
            this.hasRevive = false;
            return -2; // Revived
        }

        return actual;
    }

    dealDamage() {
        const stats = this.getEffectiveStats();
        let damage = stats.attack;
        let isCrit = false;

        // Critical hit
        if (Utils.chance(stats.critChance)) {
            damage = Math.floor(damage * this.critMultiplier);
            isCrit = true;
        }

        // Weapon special
        const weapon = this.inventory.equipment.weapon;
        let special = weapon?.special || null;

        this.stats.damageDealt += damage;

        return { damage, isCrit, special, lifesteal: stats.lifesteal };
    }

    heal(amount) {
        const stats = this.getEffectiveStats();
        const healed = Math.min(amount, stats.maxHp - this.hp);
        this.hp += healed;
        return healed;
    }

    addXP(amount) {
        const stats = this.getEffectiveStats();
        const gained = Math.floor(amount * stats.xpMultiplier);
        this.xp += gained;

        if (this.xp >= this.xpToLevel) {
            this.xp -= this.xpToLevel;
            this.level++;
            this.xpToLevel = Math.floor(this.xpToLevel * 1.4);
            // Small HP boost on level up
            this.maxHp += 5;
            this.hp = Math.min(this.hp + 20, this.getEffectiveStats().maxHp);
            return true; // Leveled up
        }
        return false;
    }

    useConsumable(slotIndex) {
        const item = this.inventory.consumableSlots[slotIndex];
        if (!item) return null;

        let result = null;

        if (item.heal) {
            const healed = this.heal(item.heal);
            result = { type: 'heal', amount: healed };
        } else if (item.fullHeal) {
            const healed = this.heal(99999);
            result = { type: 'heal', amount: healed };
        } else if (item.buff) {
            this.buffs.push({
                ...item.buff,
                timeLeft: item.buff.duration,
                name: item.name,
            });
            result = { type: 'buff', name: item.name };
        } else if (item.aoe) {
            result = { type: 'aoe', damage: item.aoe.damage, radius: item.aoe.radius };
        } else if (item.teleport) {
            result = { type: 'teleport' };
        }

        this.inventory.removeItem(item);

        // If item fully removed, clear slot
        if (!this.inventory.items.includes(item)) {
            this.inventory.consumableSlots[slotIndex] = null;
        }

        return result;
    }

    addBuff(buff) {
        this.buffs.push(buff);
    }

    update(dt) {
        // Update invuln timer
        if (this.invulnTimer > 0) this.invulnTimer -= dt;

        // Update buffs
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            this.buffs[i].timeLeft -= dt;
            if (this.buffs[i].timeLeft <= 0) {
                this.buffs.splice(i, 1);
            }
        }

        // Regeneration
        const stats = this.getEffectiveStats();
        if (stats.regen > 0 && this.hp < stats.maxHp) {
            this.hp = Math.min(stats.maxHp, this.hp + stats.regen * dt);
        }

        // Check phoenix robe
        if (this.inventory.equipment.armor?.special === 'revive') {
            this.hasRevive = true;
        }

        this.stats.timePlayed += dt;
    }
}
