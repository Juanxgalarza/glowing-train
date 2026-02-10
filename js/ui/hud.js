// ============================================================
// HUD MANAGER
// ============================================================

class HUD {
    constructor() {
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.xpBar = document.getElementById('xp-bar');
        this.xpText = document.getElementById('xp-text');
        this.atkStat = document.getElementById('atk-stat');
        this.defStat = document.getElementById('def-stat');
        this.spdStat = document.getElementById('spd-stat');
        this.floorDisplay = document.getElementById('floor-display');
        this.goldDisplay = document.getElementById('gold-display');
        this.messageLog = document.getElementById('message-log');
        this.consumablesBar = document.getElementById('consumables-bar');
        this.interactionPrompt = document.getElementById('interaction-prompt');
        this.promptText = document.getElementById('prompt-text');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.messages = [];
        this.maxMessages = 8;

        this._initConsumableSlots();
    }

    _initConsumableSlots() {
        this.consumablesBar.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'consumable-slot';
            slot.innerHTML = `<span class="slot-key">${i + 1}</span><span class="slot-icon"></span><span class="slot-count"></span>`;
            slot.dataset.slot = i;
            this.consumablesBar.appendChild(slot);
        }
    }

    updateHealth(hp, maxHp) {
        const pct = Math.max(0, (hp / maxHp) * 100);
        this.healthBar.style.width = pct + '%';

        // Color changes at low HP
        if (pct <= 25) {
            this.healthBar.style.background = 'linear-gradient(90deg, #cc0000, #ff0000)';
        } else if (pct <= 50) {
            this.healthBar.style.background = 'linear-gradient(90deg, #cc6600, #ee8800)';
        } else {
            this.healthBar.style.background = 'linear-gradient(90deg, #cc2222, #ee4444)';
        }

        this.healthText.textContent = `${Math.ceil(hp)}/${maxHp}`;
    }

    updateXP(level, xp, xpToLevel) {
        const pct = (xp / xpToLevel) * 100;
        this.xpBar.style.width = pct + '%';
        this.xpText.textContent = `Lv.${level} ${xp}/${xpToLevel}`;
    }

    updateStats(stats) {
        this.atkStat.textContent = `ATK: ${stats.attack}`;
        this.defStat.textContent = `DEF: ${stats.defense}`;
        this.spdStat.textContent = `SPD: ${stats.speed.toFixed(1)}`;
    }

    updateFloor(floor) {
        this.floorDisplay.textContent = `Floor ${floor}`;
    }

    updateGold(gold) {
        this.goldDisplay.textContent = `Gold: ${gold}`;
    }

    updateConsumables(slots) {
        const slotElements = this.consumablesBar.children;
        for (let i = 0; i < 5; i++) {
            const item = slots[i];
            const iconEl = slotElements[i].querySelector('.slot-icon');
            const countEl = slotElements[i].querySelector('.slot-count');
            if (item) {
                iconEl.textContent = item.icon || '?';
                countEl.textContent = item.count > 1 ? `x${item.count}` : '';
            } else {
                iconEl.textContent = '';
                countEl.textContent = '';
            }
        }
    }

    showInteractionPrompt(text) {
        this.interactionPrompt.classList.remove('hidden');
        this.promptText.textContent = text;
    }

    hideInteractionPrompt() {
        this.interactionPrompt.classList.add('hidden');
    }

    addMessage(text, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `log-msg ${type}`;
        msg.textContent = text;
        this.messageLog.appendChild(msg);
        this.messages.push(msg);

        // Remove old messages
        while (this.messages.length > this.maxMessages) {
            const old = this.messages.shift();
            if (old.parentNode) old.parentNode.removeChild(old);
        }

        // Auto remove after animation
        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
            const idx = this.messages.indexOf(msg);
            if (idx >= 0) this.messages.splice(idx, 1);
        }, 4000);
    }

    showDamageFlash() {
        const flash = document.createElement('div');
        flash.className = 'damage-flash';
        document.getElementById('game-container').appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    showDamageNumber(x, y, damage, isCrit = false) {
        const num = document.createElement('div');
        num.className = 'damage-number';
        num.textContent = isCrit ? `${damage}!` : damage;
        num.style.left = x + 'px';
        num.style.top = y + 'px';
        num.style.color = isCrit ? '#ffcc00' : '#ff4444';
        num.style.fontSize = isCrit ? '1.6rem' : '1.2rem';
        document.getElementById('game-container').appendChild(num);
        setTimeout(() => num.remove(), 1000);
    }

    showHealNumber(x, y, amount) {
        const num = document.createElement('div');
        num.className = 'damage-number';
        num.textContent = `+${amount}`;
        num.style.left = x + 'px';
        num.style.top = y + 'px';
        num.style.color = '#44ff44';
        document.getElementById('game-container').appendChild(num);
        setTimeout(() => num.remove(), 1000);
    }

    drawMinimap(dungeon, playerGx, playerGz, enemies) {
        const ctx = this.minimapCtx;
        const cw = this.minimapCanvas.width;
        const ch = this.minimapCanvas.height;
        ctx.clearRect(0, 0, cw, ch);

        const scale = Math.min(cw / dungeon.width, ch / dungeon.height);
        const ox = (cw - dungeon.width * scale) / 2;
        const oy = (ch - dungeon.height * scale) / 2;

        // Draw tiles
        for (let z = 0; z < dungeon.height; z++) {
            for (let x = 0; x < dungeon.width; x++) {
                const tile = dungeon.grid[z][x];
                let color = null;

                switch (tile) {
                    case TILE.FLOOR: color = '#3a3a4a'; break;
                    case TILE.CORRIDOR: color = '#2e2e3e'; break;
                    case TILE.DOOR: color = '#8B6914'; break;
                    case TILE.STAIRS_DOWN: color = '#4488ff'; break;
                    case TILE.TRAP: color = '#4a3a2a'; break;
                    case TILE.CHEST: color = '#ccaa44'; break;
                }

                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(ox + x * scale, oy + z * scale, scale, scale);
                }
            }
        }

        // Draw enemies
        for (const e of enemies) {
            if (!e.alive) continue;
            const eg = Utils.worldToGrid(e.x, e.z);
            ctx.fillStyle = e.isBoss ? '#ff0000' : '#ff4444';
            ctx.fillRect(ox + eg.gx * scale - 1, oy + eg.gz * scale - 1, scale + 2, scale + 2);
        }

        // Draw player
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(ox + playerGx * scale - 2, oy + playerGz * scale - 2, scale + 4, scale + 4);

        // Border
        ctx.strokeStyle = '#444';
        ctx.strokeRect(ox, oy, dungeon.width * scale, dungeon.height * scale);
    }
}
