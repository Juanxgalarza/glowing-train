// ============================================================
// ITEM SYSTEM - Manages world items, pickups, inventory
// ============================================================

class ItemSystem {
    constructor(scene) {
        this.scene = scene;
        this.worldItems = []; // Items on the ground
        this.meshes = [];
    }

    clear() {
        for (const m of this.meshes) {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        }
        this.worldItems = [];
        this.meshes = [];
    }

    spawnItem(item, gx, gz) {
        const pos = Utils.gridToWorld(gx, gz);
        const worldItem = {
            ...item,
            worldX: pos.x,
            worldZ: pos.z,
            gx, gz,
            mesh: null,
            glowMesh: null,
            collected: false,
        };

        this._createItemMesh(worldItem);
        this.worldItems.push(worldItem);
        return worldItem;
    }

    _createItemMesh(item) {
        let geo, mat, color;

        if (item.type === ITEM_TYPE.GOLD) {
            geo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8);
            color = 0xffcc00;
            mat = new THREE.MeshLambertMaterial({ color, emissive: 0x886600, emissiveIntensity: 0.5 });
        } else {
            const rarityColor = Utils.colorFromRarity(item.rarity);
            color = parseInt(rarityColor.replace('#', '0x'));
            geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(item.worldX, 0.5, item.worldZ);
        mesh.userData = { isItem: true, itemRef: item };
        this.scene.add(mesh);
        this.meshes.push(mesh);
        item.mesh = mesh;

        // Glow ring
        const glowGeo = new THREE.RingGeometry(0.3, 0.5, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(item.worldX, 0.05, item.worldZ);
        this.scene.add(glow);
        this.meshes.push(glow);
        item.glowMesh = glow;
    }

    removeItem(item) {
        item.collected = true;
        if (item.mesh) {
            this.scene.remove(item.mesh);
        }
        if (item.glowMesh) {
            this.scene.remove(item.glowMesh);
        }
    }

    getNearbyItem(px, pz, radius = 2) {
        let closest = null;
        let closestDist = radius;

        for (const item of this.worldItems) {
            if (item.collected) continue;
            const d = Utils.dist(px, pz, item.worldX, item.worldZ);
            if (d < closestDist) {
                closestDist = d;
                closest = item;
            }
        }
        return closest;
    }

    update(time) {
        for (const item of this.worldItems) {
            if (item.collected) continue;
            if (item.mesh) {
                item.mesh.position.y = 0.5 + Math.sin(time * 3 + item.worldX) * 0.15;
                item.mesh.rotation.y += 0.02;
            }
            if (item.glowMesh) {
                item.glowMesh.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
            }
        }
    }
}

// ============================================================
// PLAYER INVENTORY
// ============================================================

class Inventory {
    constructor() {
        this.items = [];
        this.maxItems = 24;
        this.equipment = {
            weapon: null,
            armor: null,
            accessory: null,
        };
        this.consumableSlots = [null, null, null, null, null]; // Quick slots 1-5
    }

    addItem(item) {
        // If consumable and same type exists, stack
        if (item.type === ITEM_TYPE.CONSUMABLE) {
            const existing = this.items.find(i => i.id === item.id);
            if (existing) {
                existing.count = (existing.count || 1) + 1;
                return true;
            }
        }

        if (this.items.length >= this.maxItems) return false;

        item.count = item.count || 1;
        this.items.push(item);
        return true;
    }

    removeItem(item) {
        if (item.count > 1) {
            item.count--;
            return;
        }
        const idx = this.items.indexOf(item);
        if (idx >= 0) this.items.splice(idx, 1);

        // Remove from consumable slots
        for (let i = 0; i < this.consumableSlots.length; i++) {
            if (this.consumableSlots[i] === item) {
                this.consumableSlots[i] = null;
            }
        }
    }

    equip(item) {
        let slot = null;
        if (item.type === ITEM_TYPE.WEAPON) slot = 'weapon';
        else if (item.type === ITEM_TYPE.ARMOR) slot = 'armor';
        else if (item.type === ITEM_TYPE.ACCESSORY) slot = 'accessory';
        else return false;

        // Unequip current
        if (this.equipment[slot]) {
            this.equipment[slot]._equipped = false;
        }

        this.equipment[slot] = item;
        item._equipped = true;
        return true;
    }

    assignConsumable(item, slot) {
        if (item.type !== ITEM_TYPE.CONSUMABLE) return false;
        if (slot < 0 || slot >= this.consumableSlots.length) return false;
        this.consumableSlots[slot] = item;
        return true;
    }

    getEquipmentBonuses() {
        const bonuses = {
            atk: 0, def: 0, speed: 0, crit: 0, dodge: 0,
            lifesteal: 0, regen: 0, xp: 0, hp: 0,
        };

        for (const slot of Object.values(this.equipment)) {
            if (!slot) continue;
            bonuses.atk += (slot.atk || 0) + (slot.atkBonus || 0);
            bonuses.def += (slot.def || 0) + (slot.defBonus || 0);
            bonuses.speed += slot.speedBonus || 0;
            bonuses.crit += slot.critBonus || 0;
            bonuses.dodge += slot.dodgeBonus || 0;
            bonuses.lifesteal += slot.lifestealBonus || 0;
            bonuses.regen += slot.regenBonus || 0;
            bonuses.xp += slot.xpBonus || 0;
            bonuses.hp += slot.hpBonus || 0;
        }
        return bonuses;
    }
}
