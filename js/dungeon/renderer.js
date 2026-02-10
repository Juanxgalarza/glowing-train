// ============================================================
// DUNGEON 3D RENDERER - Builds Three.js meshes from dungeon grid
// ============================================================

class DungeonRenderer {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.doorMeshes = [];
        this.interactables = [];
        this.torchLights = [];
    }

    clear() {
        for (const m of this.meshes) {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                else m.material.dispose();
            }
        }
        for (const l of this.torchLights) {
            this.scene.remove(l);
        }
        this.meshes = [];
        this.doorMeshes = [];
        this.interactables = [];
        this.torchLights = [];
    }

    build(dungeon) {
        this.clear();
        const { grid, width, height } = dungeon;

        // Materials
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a3a4a });
        const corridorMat = new THREE.MeshLambertMaterial({ color: 0x2e2e3e });
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x555566 });
        const wallTopMat = new THREE.MeshLambertMaterial({ color: 0x444455 });
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
        const stairsMat = new THREE.MeshLambertMaterial({ color: 0x88aaff, emissive: 0x2244aa, emissiveIntensity: 0.5 });
        const trapMat = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
        const chestMat = new THREE.MeshLambertMaterial({ color: 0xccaa44, emissive: 0x554400, emissiveIntensity: 0.3 });
        const waterMat = new THREE.MeshLambertMaterial({ color: 0x2244aa, transparent: true, opacity: 0.6 });

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(width * CELL_SIZE, height * CELL_SIZE);
        const ceilMat = new THREE.MeshLambertMaterial({ color: 0x222233, side: THREE.BackSide });
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set((width * CELL_SIZE) / 2, WALL_HEIGHT, (height * CELL_SIZE) / 2);
        this.scene.add(ceiling);
        this.meshes.push(ceiling);

        // Build geometry per tile
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                const tile = grid[z][x];
                const wx = x * CELL_SIZE + CELL_SIZE / 2;
                const wz = z * CELL_SIZE + CELL_SIZE / 2;

                if (tile === TILE.WALL) {
                    this._addWall(wx, wz, wallMat, wallTopMat);
                } else {
                    // Floor
                    let mat = floorMat;
                    if (tile === TILE.CORRIDOR) mat = corridorMat;
                    if (tile === TILE.TRAP) mat = trapMat;
                    if (tile === TILE.WATER) mat = waterMat;

                    this._addFloor(wx, wz, mat);

                    if (tile === TILE.DOOR) {
                        this._addDoor(wx, wz, x, z, grid, doorMat);
                    }

                    if (tile === TILE.STAIRS_DOWN) {
                        this._addStairs(wx, wz, stairsMat);
                    }

                    if (tile === TILE.CHEST) {
                        this._addChest(wx, wz, chestMat);
                    }

                    // Add wall segments where adjacent to walls
                    this._addBorderWalls(x, z, wx, wz, grid, width, height, wallMat);
                }
            }
        }

        // Add torches in rooms
        this._addTorches(dungeon);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
        this.scene.add(ambientLight);
        this.meshes.push(ambientLight);

        // Fog
        this.scene.fog = new THREE.FogExp2(0x050510, 0.035);
    }

    _addFloor(wx, wz, mat) {
        const geo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(wx, 0, wz);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.meshes.push(mesh);
    }

    _addWall(wx, wz, wallMat, topMat) {
        const geo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
        const materials = [wallMat, wallMat, topMat, wallMat, wallMat, wallMat];
        const mesh = new THREE.Mesh(geo, materials);
        mesh.position.set(wx, WALL_HEIGHT / 2, wz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.meshes.push(mesh);
    }

    _addBorderWalls(gx, gz, wx, wz, grid, w, h, wallMat) {
        const dirs = [
            { dx: 0, dz: -1, rx: 0, rz: -CELL_SIZE / 2, ry: 0, rw: CELL_SIZE, rh: WALL_HEIGHT },
            { dx: 0, dz: 1, rx: 0, rz: CELL_SIZE / 2, ry: 0, rw: CELL_SIZE, rh: WALL_HEIGHT },
            { dx: -1, dz: 0, rx: -CELL_SIZE / 2, rz: 0, ry: Math.PI / 2, rw: CELL_SIZE, rh: WALL_HEIGHT },
            { dx: 1, dz: 0, rx: CELL_SIZE / 2, rz: 0, ry: Math.PI / 2, rw: CELL_SIZE, rh: WALL_HEIGHT },
        ];

        for (const dir of dirs) {
            const nx = gx + dir.dx;
            const nz = gz + dir.dz;
            if (nx < 0 || nx >= w || nz < 0 || nz >= h || grid[nz][nx] === TILE.WALL) {
                // No need - wall block already covers this
            }
        }
    }

    _addDoor(wx, wz, gx, gz, grid, doorMat) {
        // Determine door orientation
        const hDoor = (gz > 0 && grid[gz - 1]?.[gx] === TILE.WALL) &&
                       (gz < grid.length - 1 && grid[gz + 1]?.[gx] === TILE.WALL);

        const geo = new THREE.BoxGeometry(
            hDoor ? CELL_SIZE * 0.15 : CELL_SIZE * 0.8,
            WALL_HEIGHT * 0.8,
            hDoor ? CELL_SIZE * 0.8 : CELL_SIZE * 0.15
        );
        const mesh = new THREE.Mesh(geo, doorMat);
        mesh.position.set(wx, WALL_HEIGHT * 0.4, wz);
        mesh.userData = { type: 'door', gx, gz, open: false };
        this.scene.add(mesh);
        this.meshes.push(mesh);
        this.doorMeshes.push(mesh);
        this.interactables.push(mesh);
    }

    _addStairs(wx, wz, mat) {
        // Spiral stairs visual
        const group = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const stepGeo = new THREE.BoxGeometry(CELL_SIZE * 0.6, 0.2, CELL_SIZE * 0.3);
            const step = new THREE.Mesh(stepGeo, mat);
            const angle = (i / 6) * Math.PI * 2;
            step.position.set(
                Math.cos(angle) * 0.5,
                0.3 + i * 0.4,
                Math.sin(angle) * 0.5
            );
            step.rotation.y = angle;
            group.add(step);
        }
        group.position.set(wx, 0, wz);
        this.scene.add(group);
        this.meshes.push(group);

        // Glow effect
        const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.3,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(wx, 1.5, wz);
        this.scene.add(glow);
        this.meshes.push(glow);

        // Light for stairs
        const stairLight = new THREE.PointLight(0x4488ff, 1.5, 8);
        stairLight.position.set(wx, 2, wz);
        this.scene.add(stairLight);
        this.torchLights.push(stairLight);
    }

    _addChest(wx, wz, mat) {
        // Chest body
        const bodyGeo = new THREE.BoxGeometry(CELL_SIZE * 0.5, CELL_SIZE * 0.35, CELL_SIZE * 0.4);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.set(wx, CELL_SIZE * 0.175, wz);
        body.userData = { type: 'chest', gx: Math.floor(wx / CELL_SIZE), gz: Math.floor(wz / CELL_SIZE), opened: false };
        this.scene.add(body);
        this.meshes.push(body);
        this.interactables.push(body);

        // Lid
        const lidMat = new THREE.MeshLambertMaterial({ color: 0xddbb55 });
        const lidGeo = new THREE.BoxGeometry(CELL_SIZE * 0.52, CELL_SIZE * 0.1, CELL_SIZE * 0.42);
        const lid = new THREE.Mesh(lidGeo, lidMat);
        lid.position.set(wx, CELL_SIZE * 0.4, wz);
        this.scene.add(lid);
        this.meshes.push(lid);

        // Chest glow
        const light = new THREE.PointLight(0xffcc44, 0.5, 5);
        light.position.set(wx, 1, wz);
        this.scene.add(light);
        this.torchLights.push(light);
    }

    _addTorches(dungeon) {
        for (const room of dungeon.rooms) {
            // Place torches on walls of larger rooms
            if (room.w >= 5 && room.h >= 5) {
                const positions = [
                    { x: room.x, z: room.y + Math.floor(room.h / 2) },
                    { x: room.x + room.w - 1, z: room.y + Math.floor(room.h / 2) },
                    { x: room.x + Math.floor(room.w / 2), z: room.y },
                    { x: room.x + Math.floor(room.w / 2), z: room.y + room.h - 1 },
                ];

                for (const pos of positions) {
                    if (Utils.chance(0.6)) {
                        this._addTorch(pos.x, pos.z);
                    }
                }
            } else if (Utils.chance(0.5)) {
                // Small room - single torch
                const center = { x: room.x + Math.floor(room.w / 2), z: room.y + Math.floor(room.h / 2) };
                this._addTorch(center.x, center.z);
            }
        }
    }

    _addTorch(gx, gz) {
        const wx = gx * CELL_SIZE + CELL_SIZE / 2;
        const wz = gz * CELL_SIZE + CELL_SIZE / 2;

        // Torch flame (small glowing sphere)
        const flameGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6622 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(wx, WALL_HEIGHT * 0.7, wz);
        flame.userData = { isTorch: true, baseY: WALL_HEIGHT * 0.7 };
        this.scene.add(flame);
        this.meshes.push(flame);

        // Torch light
        const color = Utils.chance(0.3) ? 0xff8844 : Utils.chance(0.5) ? 0xff6622 : 0xffaa44;
        const light = new THREE.PointLight(color, 1.2, 12);
        light.position.set(wx, WALL_HEIGHT * 0.65, wz);
        light.userData = { isTorch: true, baseIntensity: 1.2 };
        this.scene.add(light);
        this.torchLights.push(light);
    }

    update(time) {
        // Animate torch lights (flickering)
        for (const light of this.torchLights) {
            if (light.userData?.isTorch) {
                light.intensity = light.userData.baseIntensity + Math.sin(time * 8 + light.id) * 0.3;
            }
        }

        // Animate torch flames
        for (const mesh of this.meshes) {
            if (mesh.userData?.isTorch) {
                mesh.position.y = mesh.userData.baseY + Math.sin(time * 6) * 0.05;
            }
        }
    }
}
