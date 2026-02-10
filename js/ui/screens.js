// ============================================================
// SCREEN MANAGER - Handles UI screens and inventory
// ============================================================

class ScreenManager {
    constructor() {
        this.screens = {
            title: document.getElementById('title-screen'),
            hud: document.getElementById('hud'),
            inventory: document.getElementById('inventory-screen'),
            levelup: document.getElementById('levelup-screen'),
            pause: document.getElementById('pause-screen'),
            gameover: document.getElementById('gameover-screen'),
        };

        this.inventoryGrid = document.getElementById('inventory-grid');
        this.itemDetails = document.getElementById('item-details');
        this.upgradeChoices = document.getElementById('upgrade-choices');
        this.selectedItem = null;
    }

    show(screenName) {
        // Hide all screens except HUD (which is toggled separately)
        for (const [name, el] of Object.entries(this.screens)) {
            if (name === 'hud') continue;
            if (name === screenName) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }

        if (screenName === 'title') {
            this.screens.hud.classList.add('hidden');
        }
    }

    showHUD() {
        this.screens.hud.classList.remove('hidden');
    }

    hideHUD() {
        this.screens.hud.classList.add('hidden');
    }

    showInventory(inventory, onEquip, onUseConsumable, onAssignSlot) {
        this.show('inventory');
        this.showHUD();
        this.selectedItem = null;

        // Equipment slots
        for (const slot of ['weapon', 'armor', 'accessory']) {
            const el = document.getElementById(`slot-${slot}`);
            const item = inventory.equipment[slot];
            if (item) {
                el.innerHTML = `<span style="color:${Utils.colorFromRarity(item.rarity)}">${item.icon || ''} ${item.name}</span>`;
            } else {
                el.textContent = 'Empty';
            }
        }

        // Inventory grid
        this.inventoryGrid.innerHTML = '';
        for (let i = 0; i < inventory.maxItems; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';

            const item = inventory.items[i];
            if (item) {
                slot.textContent = item.icon || '?';
                slot.title = item.name;

                // Rarity indicator
                const rarity = document.createElement('div');
                rarity.className = 'item-rarity';
                rarity.style.background = Utils.colorFromRarity(item.rarity);
                slot.appendChild(rarity);

                // Count for stackable
                if (item.count > 1) {
                    const count = document.createElement('span');
                    count.style.cssText = 'position:absolute;bottom:2px;right:4px;font-size:0.6rem;color:#ccc;';
                    count.textContent = `x${item.count}`;
                    slot.appendChild(count);
                }

                // Equipped indicator
                if (item._equipped) {
                    slot.style.borderColor = '#44ff44';
                }

                slot.addEventListener('click', () => {
                    this._selectItem(item, slot, inventory, onEquip, onUseConsumable, onAssignSlot);
                });
            }

            this.inventoryGrid.appendChild(slot);
        }
    }

    _selectItem(item, slotEl, inventory, onEquip, onUseConsumable, onAssignSlot) {
        // Deselect previous
        const prev = this.inventoryGrid.querySelector('.selected');
        if (prev) prev.classList.remove('selected');
        slotEl.classList.add('selected');
        this.selectedItem = item;

        // Show details
        let html = `<div class="item-name" style="color:${Utils.colorFromRarity(item.rarity)}">${item.icon || ''} ${item.name}</div>`;
        html += `<div class="item-type">${item.type} - ${ITEM_RARITY[item.rarity]?.name || 'Common'}</div>`;

        // Stats
        const statsArr = [];
        if (item.atk) statsArr.push(`ATK +${item.atk}`);
        if (item.def) statsArr.push(`DEF +${item.def}`);
        if (item.speed) statsArr.push(`Speed: ${item.speed}x`);
        if (item.critBonus) statsArr.push(`Crit +${(item.critBonus * 100).toFixed(0)}%`);
        if (item.lifesteal) statsArr.push(`Lifesteal +${(item.lifesteal * 100).toFixed(0)}%`);
        if (item.atkBonus) statsArr.push(`ATK +${item.atkBonus}`);
        if (item.defBonus) statsArr.push(`DEF +${item.defBonus}`);
        if (item.speedBonus) statsArr.push(`Speed +${(item.speedBonus * 100).toFixed(0)}%`);
        if (item.dodgeBonus) statsArr.push(`Dodge +${(item.dodgeBonus * 100).toFixed(0)}%`);
        if (item.hpBonus) statsArr.push(`HP +${item.hpBonus}`);
        if (item.regenBonus) statsArr.push(`Regen +${item.regenBonus}/s`);
        if (item.xpBonus) statsArr.push(`XP +${(item.xpBonus * 100).toFixed(0)}%`);
        if (item.heal) statsArr.push(`Heals ${item.heal} HP`);
        if (item.fullHeal) statsArr.push('Full heal');

        if (statsArr.length) html += `<div class="item-stats">${statsArr.join(' | ')}</div>`;
        if (item.desc) html += `<div class="item-desc">${item.desc}</div>`;

        // Action buttons
        html += '<div style="margin-top:8px;display:flex;gap:6px;">';
        if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.ARMOR || item.type === ITEM_TYPE.ACCESSORY) {
            html += `<button class="menu-btn secondary" style="margin:0;padding:4px 12px;font-size:0.8rem;min-width:auto;" onclick="window._invAction('equip')">
                ${item._equipped ? 'Equipped' : 'Equip'}</button>`;
        }
        if (item.type === ITEM_TYPE.CONSUMABLE) {
            html += `<button class="menu-btn secondary" style="margin:0;padding:4px 12px;font-size:0.8rem;min-width:auto;" onclick="window._invAction('use')">Use</button>`;
            for (let i = 0; i < 5; i++) {
                html += `<button class="menu-btn secondary" style="margin:0;padding:4px 8px;font-size:0.7rem;min-width:auto;" onclick="window._invAction('assign',${i})">[${i + 1}]</button>`;
            }
        }
        html += '</div>';

        this.itemDetails.innerHTML = html;

        // Action handlers
        window._invAction = (action, slot) => {
            if (action === 'equip') {
                onEquip(item);
                this.showInventory(inventory, onEquip, onUseConsumable, onAssignSlot);
            } else if (action === 'use') {
                onUseConsumable(item);
                this.showInventory(inventory, onEquip, onUseConsumable, onAssignSlot);
            } else if (action === 'assign') {
                onAssignSlot(item, slot);
                this.showInventory(inventory, onEquip, onUseConsumable, onAssignSlot);
            }
        };
    }

    showLevelUp(upgrades, onChoose) {
        this.show('levelup');
        this.showHUD();
        this.upgradeChoices.innerHTML = '';

        for (const upgrade of upgrades) {
            const div = document.createElement('div');
            div.className = 'upgrade-choice';
            div.innerHTML = `
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-desc">${upgrade.desc}</div>
            `;
            div.addEventListener('click', () => {
                onChoose(upgrade);
            });
            this.upgradeChoices.appendChild(div);
        }
    }

    showGameOver(player, isVictory) {
        this.show('gameover');
        this.hideHUD();

        const title = document.getElementById('gameover-title');
        title.textContent = isVictory ? 'Victory!' : 'You Died';
        title.className = isVictory ? 'victory' : 'defeat';

        const statsDiv = document.getElementById('gameover-stats');
        const mins = Math.floor(player.stats.timePlayed / 60);
        const secs = Math.floor(player.stats.timePlayed % 60);
        statsDiv.innerHTML = `
            <div class="stat-line"><span class="stat-label">Floor Reached</span><span class="stat-value">${player.floor}</span></div>
            <div class="stat-line"><span class="stat-label">Level</span><span class="stat-value">${player.level}</span></div>
            <div class="stat-line"><span class="stat-label">Enemies Killed</span><span class="stat-value">${player.kills}</span></div>
            <div class="stat-line"><span class="stat-label">Gold Collected</span><span class="stat-value">${player.gold}</span></div>
            <div class="stat-line"><span class="stat-label">Damage Dealt</span><span class="stat-value">${player.stats.damageDealt}</span></div>
            <div class="stat-line"><span class="stat-label">Items Found</span><span class="stat-value">${player.stats.itemsCollected}</span></div>
            <div class="stat-line"><span class="stat-label">Chests Opened</span><span class="stat-value">${player.stats.chestsOpened}</span></div>
            <div class="stat-line"><span class="stat-label">Time</span><span class="stat-value">${mins}m ${secs}s</span></div>
        `;
    }
}
