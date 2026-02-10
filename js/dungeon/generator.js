// ============================================================
// PROCEDURAL DUNGEON GENERATOR (BSP + Corridors)
// ============================================================

class DungeonGenerator {
    constructor(width, height, floor) {
        this.width = width;
        this.height = height;
        this.floor = floor;
        this.grid = [];
        this.rooms = [];
        this.spawnPoint = null;
        this.exitPoint = null;
        this.enemySpawns = [];
        this.itemSpawns = [];
        this.trapPositions = [];
        this.chestPositions = [];
    }

    generate() {
        // Initialize grid with walls
        this.grid = Array.from({ length: this.height }, () =>
            Array(this.width).fill(TILE.WALL)
        );

        // Generate rooms using BSP
        this.rooms = [];
        this._bspSplit({ x: 1, y: 1, w: this.width - 2, h: this.height - 2 }, 0);

        // Ensure minimum rooms
        if (this.rooms.length < 4) {
            return this.generate();
        }

        // Carve rooms
        for (const room of this.rooms) {
            this._carveRoom(room);
        }

        // Connect rooms with corridors
        this._connectRooms();

        // Place doors at room entrances
        this._placeDoors();

        // Set spawn and exit
        this.spawnPoint = this._getRoomCenter(this.rooms[0]);
        this.exitPoint = this._getRoomCenter(this.rooms[this.rooms.length - 1]);
        this.grid[this.exitPoint.z][this.exitPoint.x] = TILE.STAIRS_DOWN;

        // Place enemies
        this._placeEnemies();

        // Place items and chests
        this._placeItems();

        // Place traps
        this._placeTraps();

        return {
            grid: this.grid,
            rooms: this.rooms,
            width: this.width,
            height: this.height,
            spawnPoint: this.spawnPoint,
            exitPoint: this.exitPoint,
            enemySpawns: this.enemySpawns,
            itemSpawns: this.itemSpawns,
            trapPositions: this.trapPositions,
            chestPositions: this.chestPositions,
        };
    }

    _bspSplit(node, depth) {
        const minSize = 6;
        const maxDepth = 5;

        if (depth >= maxDepth || (node.w <= minSize * 2 && node.h <= minSize * 2)) {
            this._createRoom(node);
            return;
        }

        const splitH = node.w < node.h ? true : node.h < node.w ? false : Utils.chance(0.5);

        if (splitH) {
            if (node.h < minSize * 2) {
                this._createRoom(node);
                return;
            }
            const split = Utils.rand(minSize, node.h - minSize);
            this._bspSplit({ x: node.x, y: node.y, w: node.w, h: split }, depth + 1);
            this._bspSplit({ x: node.x, y: node.y + split, w: node.w, h: node.h - split }, depth + 1);
        } else {
            if (node.w < minSize * 2) {
                this._createRoom(node);
                return;
            }
            const split = Utils.rand(minSize, node.w - minSize);
            this._bspSplit({ x: node.x, y: node.y, w: split, h: node.h }, depth + 1);
            this._bspSplit({ x: node.x + split, y: node.y, w: node.w - split, h: node.h }, depth + 1);
        }
    }

    _createRoom(node) {
        const margin = 1;
        const rw = Utils.rand(4, Math.max(4, node.w - margin * 2));
        const rh = Utils.rand(4, Math.max(4, node.h - margin * 2));
        const rx = node.x + Utils.rand(margin, Math.max(margin, node.w - rw - margin));
        const ry = node.y + Utils.rand(margin, Math.max(margin, node.h - rh - margin));

        this.rooms.push({ x: rx, y: ry, w: rw, h: rh });
    }

    _carveRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
                    this.grid[y][x] = TILE.FLOOR;
                }
            }
        }
    }

    _getRoomCenter(room) {
        return {
            x: Math.floor(room.x + room.w / 2),
            z: Math.floor(room.y + room.h / 2),
        };
    }

    _connectRooms() {
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const a = this._getRoomCenter(this.rooms[i]);
            const b = this._getRoomCenter(this.rooms[i + 1]);
            this._carveCorridor(a.x, a.z, b.x, b.z);
        }

        // Add extra connections for loops
        if (this.rooms.length > 4) {
            const extra = Utils.rand(1, Math.floor(this.rooms.length / 3));
            for (let i = 0; i < extra; i++) {
                const ri = Utils.rand(0, this.rooms.length - 1);
                const rj = Utils.rand(0, this.rooms.length - 1);
                if (ri !== rj) {
                    const a = this._getRoomCenter(this.rooms[ri]);
                    const b = this._getRoomCenter(this.rooms[rj]);
                    this._carveCorridor(a.x, a.z, b.x, b.z);
                }
            }
        }
    }

    _carveCorridor(x1, z1, x2, z2) {
        let x = x1, z = z1;

        // L-shaped corridor
        if (Utils.chance(0.5)) {
            // Horizontal first
            while (x !== x2) {
                if (x > 0 && x < this.width - 1 && z > 0 && z < this.height - 1) {
                    if (this.grid[z][x] === TILE.WALL) {
                        this.grid[z][x] = TILE.CORRIDOR;
                    }
                }
                x += x < x2 ? 1 : -1;
            }
            while (z !== z2) {
                if (x > 0 && x < this.width - 1 && z > 0 && z < this.height - 1) {
                    if (this.grid[z][x] === TILE.WALL) {
                        this.grid[z][x] = TILE.CORRIDOR;
                    }
                }
                z += z < z2 ? 1 : -1;
            }
        } else {
            // Vertical first
            while (z !== z2) {
                if (x > 0 && x < this.width - 1 && z > 0 && z < this.height - 1) {
                    if (this.grid[z][x] === TILE.WALL) {
                        this.grid[z][x] = TILE.CORRIDOR;
                    }
                }
                z += z < z2 ? 1 : -1;
            }
            while (x !== x2) {
                if (x > 0 && x < this.width - 1 && z > 0 && z < this.height - 1) {
                    if (this.grid[z][x] === TILE.WALL) {
                        this.grid[z][x] = TILE.CORRIDOR;
                    }
                }
                x += x < x2 ? 1 : -1;
            }
        }
    }

    _placeDoors() {
        for (const room of this.rooms) {
            // Check perimeter for corridors
            for (let x = room.x - 1; x <= room.x + room.w; x++) {
                this._tryPlaceDoor(x, room.y - 1);
                this._tryPlaceDoor(x, room.y + room.h);
            }
            for (let y = room.y - 1; y <= room.y + room.h; y++) {
                this._tryPlaceDoor(room.x - 1, y);
                this._tryPlaceDoor(room.x + room.w, y);
            }
        }
    }

    _tryPlaceDoor(x, y) {
        if (x <= 0 || x >= this.width - 1 || y <= 0 || y >= this.height - 1) return;
        if (this.grid[y][x] !== TILE.CORRIDOR && this.grid[y][x] !== TILE.FLOOR) return;

        // Check if this is a transition point between room and corridor
        const isHDoor = this.grid[y][x - 1] === TILE.WALL && this.grid[y][x + 1] === TILE.WALL;
        const isVDoor = this.grid[y - 1]?.[x] === TILE.WALL && this.grid[y + 1]?.[x] === TILE.WALL;

        if ((isHDoor || isVDoor) && Utils.chance(0.4)) {
            this.grid[y][x] = TILE.DOOR;
        }
    }

    _placeEnemies() {
        const baseCount = 3 + this.floor * 2;
        const count = Utils.rand(baseCount, baseCount + 4);

        for (let i = 0; i < count; i++) {
            // Don't place in first room
            const room = this.rooms[Utils.rand(1, this.rooms.length - 1)];
            const pos = this._getRandomFloorInRoom(room);
            if (pos) {
                this.enemySpawns.push({
                    x: pos.x,
                    z: pos.z,
                    type: this._getEnemyTypeForFloor(),
                });
            }
        }

        // Boss on boss floors
        if (BOSS_FLOORS.includes(this.floor)) {
            const bossRoom = this.rooms[this.rooms.length - 1];
            const center = this._getRoomCenter(bossRoom);
            // Remove regular enemies from boss room
            this.enemySpawns = this.enemySpawns.filter(
                e => Utils.dist(e.x, e.z, center.x, center.z) > 4
            );
            this.enemySpawns.push({
                x: center.x,
                z: center.z,
                type: this.floor === 5 ? ENEMY_TYPES.BOSS_LICH : ENEMY_TYPES.BOSS_DRAGON,
                isBoss: true,
            });
        }
    }

    _getEnemyTypeForFloor() {
        const pool = [];
        if (this.floor >= 1) pool.push(ENEMY_TYPES.SLIME, ENEMY_TYPES.BAT);
        if (this.floor >= 2) pool.push(ENEMY_TYPES.SKELETON, ENEMY_TYPES.GOBLIN);
        if (this.floor >= 3) pool.push(ENEMY_TYPES.ORC, ENEMY_TYPES.MIMIC);
        if (this.floor >= 5) pool.push(ENEMY_TYPES.WRAITH, ENEMY_TYPES.FIRE_MAGE);
        if (this.floor >= 7) pool.push(ENEMY_TYPES.GOLEM);
        return Utils.pick(pool);
    }

    _placeItems() {
        // Gold piles
        const goldCount = Utils.rand(3, 6 + this.floor);
        for (let i = 0; i < goldCount; i++) {
            const room = this.rooms[Utils.rand(0, this.rooms.length - 1)];
            const pos = this._getRandomFloorInRoom(room);
            if (pos) {
                this.itemSpawns.push({
                    x: pos.x,
                    z: pos.z,
                    type: ITEM_TYPE.GOLD,
                    amount: Utils.rand(10, 30) * this.floor,
                });
            }
        }

        // Chests
        const chestCount = Utils.rand(1, 2 + Math.floor(this.floor / 2));
        for (let i = 0; i < chestCount; i++) {
            const room = this.rooms[Utils.rand(1, this.rooms.length - 1)];
            const pos = this._getRandomFloorInRoom(room);
            if (pos) {
                this.chestPositions.push({ x: pos.x, z: pos.z });
                this.grid[pos.z][pos.x] = TILE.CHEST;
            }
        }

        // Random item drops on ground
        const dropCount = Utils.rand(1, 3);
        for (let i = 0; i < dropCount; i++) {
            const room = this.rooms[Utils.rand(0, this.rooms.length - 1)];
            const pos = this._getRandomFloorInRoom(room);
            if (pos) {
                this.itemSpawns.push({
                    x: pos.x,
                    z: pos.z,
                    type: 'random',
                });
            }
        }
    }

    _placeTraps() {
        const trapCount = Utils.rand(2, 3 + this.floor);
        for (let i = 0; i < trapCount; i++) {
            const room = this.rooms[Utils.rand(1, this.rooms.length - 1)];
            const pos = this._getRandomFloorInRoom(room);
            if (pos) {
                this.trapPositions.push({ x: pos.x, z: pos.z });
                this.grid[pos.z][pos.x] = TILE.TRAP;
            }
        }
    }

    _getRandomFloorInRoom(room) {
        for (let attempt = 0; attempt < 20; attempt++) {
            const x = Utils.rand(room.x + 1, room.x + room.w - 2);
            const z = Utils.rand(room.y + 1, room.y + room.h - 2);
            if (this.grid[z]?.[x] === TILE.FLOOR) {
                // Not too close to spawn
                if (!this.spawnPoint || Utils.dist(x, z, this.spawnPoint.x, this.spawnPoint.z) > 3) {
                    return { x, z };
                }
            }
        }
        return null;
    }
}
