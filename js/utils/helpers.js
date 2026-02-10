// ============================================================
// UTILITY HELPERS
// ============================================================

const Utils = {
    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    chance(pct) {
        return Math.random() < pct;
    },

    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    weightedPick(items, weightKey = 'weight') {
        const total = items.reduce((s, i) => s + i[weightKey], 0);
        let r = Math.random() * total;
        for (const item of items) {
            r -= item[weightKey];
            if (r <= 0) return item;
        }
        return items[items.length - 1];
    },

    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    dist(x1, z1, x2, z2) {
        return Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    gridToWorld(gx, gz) {
        return {
            x: gx * CELL_SIZE + CELL_SIZE / 2,
            z: gz * CELL_SIZE + CELL_SIZE / 2,
        };
    },

    worldToGrid(wx, wz) {
        return {
            gx: Math.floor(wx / CELL_SIZE),
            gz: Math.floor(wz / CELL_SIZE),
        };
    },

    colorFromRarity(rarity) {
        return ITEM_RARITY[rarity]?.color || '#cccccc';
    },
};
