// ============================================================
// ENEMY SYSTEM
// ============================================================

const ENEMY_DEFS = {
    [ENEMY_TYPES.SLIME]: {
        name: 'Slime',
        hp: 20, atk: 5, def: 1, speed: 1.5, xp: 15, gold: 5,
        size: 0.5, color: 0x44cc44, behavior: 'chase',
        attackRange: 1.5, attackSpeed: 0.8, aggroRange: 8,
    },
    [ENEMY_TYPES.BAT]: {
        name: 'Bat',
        hp: 15, atk: 4, def: 0, speed: 3.5, xp: 12, gold: 3,
        size: 0.35, color: 0x8844aa, behavior: 'erratic',
        attackRange: 1.5, attackSpeed: 1.5, aggroRange: 10,
        flying: true,
    },
    [ENEMY_TYPES.SKELETON]: {
        name: 'Skeleton',
        hp: 35, atk: 8, def: 3, speed: 2.0, xp: 25, gold: 10,
        size: 0.5, color: 0xddddbb, behavior: 'chase',
        attackRange: 2.0, attackSpeed: 1.0, aggroRange: 10,
    },
    [ENEMY_TYPES.GOBLIN]: {
        name: 'Goblin',
        hp: 25, atk: 7, def: 2, speed: 2.8, xp: 20, gold: 15,
        size: 0.45, color: 0x44aa44, behavior: 'flanker',
        attackRange: 1.8, attackSpeed: 1.2, aggroRange: 12,
    },
    [ENEMY_TYPES.ORC]: {
        name: 'Orc',
        hp: 60, atk: 14, def: 6, speed: 1.8, xp: 40, gold: 20,
        size: 0.7, color: 0x448844, behavior: 'chase',
        attackRange: 2.5, attackSpeed: 0.7, aggroRange: 10,
    },
    [ENEMY_TYPES.WRAITH]: {
        name: 'Wraith',
        hp: 40, atk: 12, def: 2, speed: 2.5, xp: 35, gold: 18,
        size: 0.55, color: 0x6644aa, behavior: 'phaser',
        attackRange: 2.0, attackSpeed: 1.0, aggroRange: 14,
        transparent: true,
    },
    [ENEMY_TYPES.FIRE_MAGE]: {
        name: 'Fire Mage',
        hp: 30, atk: 16, def: 2, speed: 1.5, xp: 45, gold: 25,
        size: 0.5, color: 0xcc4422, behavior: 'ranged',
        attackRange: 10, attackSpeed: 0.6, aggroRange: 14,
        ranged: true,
    },
    [ENEMY_TYPES.GOLEM]: {
        name: 'Stone Golem',
        hp: 100, atk: 18, def: 15, speed: 1.0, xp: 60, gold: 30,
        size: 0.9, color: 0x777777, behavior: 'chase',
        attackRange: 2.5, attackSpeed: 0.5, aggroRange: 8,
    },
    [ENEMY_TYPES.MIMIC]: {
        name: 'Mimic',
        hp: 45, atk: 15, def: 5, speed: 2.5, xp: 40, gold: 50,
        size: 0.55, color: 0xccaa44, behavior: 'ambush',
        attackRange: 2.0, attackSpeed: 1.0, aggroRange: 4,
    },
    [ENEMY_TYPES.BOSS_LICH]: {
        name: 'The Lich King',
        hp: 300, atk: 22, def: 10, speed: 2.0, xp: 200, gold: 100,
        size: 1.0, color: 0x8844ff, behavior: 'boss_lich',
        attackRange: 12, attackSpeed: 0.8, aggroRange: 20,
        ranged: true, isBoss: true,
    },
    [ENEMY_TYPES.BOSS_DRAGON]: {
        name: 'Shadow Dragon',
        hp: 500, atk: 30, def: 15, speed: 2.5, xp: 500, gold: 300,
        size: 1.5, color: 0xaa2222, behavior: 'boss_dragon',
        attackRange: 4, attackSpeed: 1.0, aggroRange: 25,
        isBoss: true,
    },
};

class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.meshes = [];
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
        this.enemies = [];
        this.meshes = [];
    }

    spawn(type, gx, gz, floorNum, isBoss = false) {
        const def = ENEMY_DEFS[type];
        if (!def) return null;

        const pos = Utils.gridToWorld(gx, gz);
        const scaling = 1 + (floorNum - 1) * 0.15;

        const enemy = {
            type,
            name: def.name,
            maxHp: Math.floor(def.hp * scaling),
            hp: Math.floor(def.hp * scaling),
            atk: Math.floor(def.atk * scaling),
            def: def.def + Math.floor(floorNum * 0.5),
            speed: def.speed,
            xp: Math.floor(def.xp * scaling),
            gold: Math.floor(def.gold * scaling),
            size: def.size,
            behavior: def.behavior,
            attackRange: def.attackRange,
            attackSpeed: def.attackSpeed,
            aggroRange: def.aggroRange,
            ranged: def.ranged || false,
            flying: def.flying || false,
            transparent: def.transparent || false,
            isBoss: isBoss || def.isBoss || false,

            // State
            x: pos.x,
            z: pos.z,
            y: def.flying ? 1.5 : 0,
            vx: 0,
            vz: 0,
            rotation: 0,
            state: 'idle',
            attackCooldown: 0,
            stateTimer: 0,
            target: null,
            alive: true,
            deathTimer: 0,
            hitFlash: 0,
            pathTarget: null,

            // Boss specific
            phase: 1,
            specialCooldown: 0,

            // Mesh reference
            mesh: null,
            hpBarMesh: null,
        };

        this._createMesh(enemy, def);
        this.enemies.push(enemy);
        return enemy;
    }

    _createMesh(enemy, def) {
        const group = new THREE.Group();

        // Body
        let bodyGeo;
        if (enemy.type === ENEMY_TYPES.SLIME) {
            bodyGeo = new THREE.SphereGeometry(def.size, 8, 8);
        } else if (enemy.type === ENEMY_TYPES.BAT) {
            bodyGeo = new THREE.ConeGeometry(def.size, def.size * 0.6, 6);
        } else if (enemy.isBoss) {
            bodyGeo = new THREE.BoxGeometry(def.size * 1.5, def.size * 2, def.size * 1.2);
        } else {
            bodyGeo = new THREE.BoxGeometry(def.size, def.size * 1.6, def.size * 0.8);
        }

        const bodyMat = new THREE.MeshLambertMaterial({
            color: def.color,
            transparent: def.transparent || false,
            opacity: def.transparent ? 0.6 : 1.0,
            emissive: def.isBoss ? def.color : 0x000000,
            emissiveIntensity: def.isBoss ? 0.3 : 0,
        });

        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = def.size * 0.8 + (def.flying ? 1.0 : 0);
        body.castShadow = true;
        group.add(body);

        // Eyes (two small spheres)
        const eyeGeo = new THREE.SphereGeometry(def.size * 0.12, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: enemy.isBoss ? 0xff0000 : 0xff4444,
        });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        const eyeH = def.size * 1.1 + (def.flying ? 1.0 : 0);
        eyeL.position.set(-def.size * 0.2, eyeH, def.size * 0.4);
        eyeR.position.set(def.size * 0.2, eyeH, def.size * 0.4);
        group.add(eyeL, eyeR);

        // HP bar background
        const hpBgGeo = new THREE.PlaneGeometry(def.size * 1.5, 0.12);
        const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
        const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
        hpBg.position.y = def.size * 1.8 + (def.flying ? 1.0 : 0);
        group.add(hpBg);

        // HP bar fill
        const hpGeo = new THREE.PlaneGeometry(def.size * 1.5, 0.1);
        const hpMat = new THREE.MeshBasicMaterial({ color: enemy.isBoss ? 0xff4400 : 0xcc0000, side: THREE.DoubleSide });
        const hpBar = new THREE.Mesh(hpGeo, hpMat);
        hpBar.position.y = def.size * 1.8 + (def.flying ? 1.0 : 0);
        hpBar.position.z = 0.01;
        group.add(hpBar);
        enemy.hpBarMesh = hpBar;
        enemy.hpBarWidth = def.size * 1.5;

        group.position.set(enemy.x, enemy.y, enemy.z);
        group.userData = { isEnemy: true, enemyRef: enemy };
        this.scene.add(group);
        this.meshes.push(group);
        enemy.mesh = group;

        // Boss aura
        if (enemy.isBoss) {
            const auraGeo = new THREE.RingGeometry(1, 2, 20);
            const auraMat = new THREE.MeshBasicMaterial({
                color: def.color,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
            });
            const aura = new THREE.Mesh(auraGeo, auraMat);
            aura.rotation.x = -Math.PI / 2;
            aura.position.y = 0.05;
            group.add(aura);
            enemy.auraMesh = aura;
        }
    }

    update(dt, playerX, playerZ, dungeon) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) {
                enemy.deathTimer += dt;
                if (enemy.mesh) {
                    enemy.mesh.scale.multiplyScalar(0.95);
                    enemy.mesh.position.y -= dt * 2;
                    if (enemy.deathTimer > 1) {
                        this.scene.remove(enemy.mesh);
                        enemy.mesh = null;
                    }
                }
                continue;
            }

            enemy.attackCooldown -= dt;
            enemy.stateTimer -= dt;
            enemy.hitFlash -= dt;
            if (enemy.specialCooldown > 0) enemy.specialCooldown -= dt;

            // Hit flash
            if (enemy.mesh && enemy.hitFlash > 0) {
                enemy.mesh.children[0].material.emissive.setHex(0xffffff);
                enemy.mesh.children[0].material.emissiveIntensity = enemy.hitFlash;
            } else if (enemy.mesh && enemy.mesh.children[0]) {
                const def = ENEMY_DEFS[enemy.type];
                enemy.mesh.children[0].material.emissive.setHex(enemy.isBoss ? def.color : 0x000000);
                enemy.mesh.children[0].material.emissiveIntensity = enemy.isBoss ? 0.3 : 0;
            }

            const dist = Utils.dist(enemy.x, enemy.z, playerX, playerZ);

            // AI behavior
            this._updateAI(enemy, dt, playerX, playerZ, dist, dungeon);

            // Update mesh position
            if (enemy.mesh) {
                enemy.mesh.position.set(enemy.x, enemy.y, enemy.z);
                enemy.mesh.rotation.y = enemy.rotation;

                // Update HP bar
                if (enemy.hpBarMesh) {
                    const hpRatio = enemy.hp / enemy.maxHp;
                    enemy.hpBarMesh.scale.x = Math.max(0, hpRatio);
                    enemy.hpBarMesh.position.x = -(1 - hpRatio) * enemy.hpBarWidth * 0.5;
                }

                // Boss aura animation
                if (enemy.auraMesh) {
                    enemy.auraMesh.rotation.z += dt * 2;
                }

                // Slime bounce
                if (enemy.type === ENEMY_TYPES.SLIME) {
                    const bounce = Math.abs(Math.sin(Date.now() * 0.005)) * 0.2;
                    enemy.mesh.children[0].scale.set(1 + bounce * 0.3, 1 - bounce * 0.2, 1 + bounce * 0.3);
                }

                // Bat wing flap
                if (enemy.type === ENEMY_TYPES.BAT) {
                    enemy.mesh.position.y = 1.5 + Math.sin(Date.now() * 0.008) * 0.3;
                }
            }
        }
    }

    _updateAI(enemy, dt, px, pz, dist, dungeon) {
        const angle = Math.atan2(px - enemy.x, pz - enemy.z);

        switch (enemy.behavior) {
            case 'chase':
                if (dist < enemy.aggroRange) {
                    enemy.state = 'chase';
                    this._moveToward(enemy, px, pz, dt, dungeon);
                    enemy.rotation = angle;
                    if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                        enemy.state = 'attack';
                        enemy.attackCooldown = 1 / enemy.attackSpeed;
                        return { attack: true, damage: enemy.atk };
                    }
                } else {
                    this._wander(enemy, dt, dungeon);
                }
                break;

            case 'erratic':
                if (dist < enemy.aggroRange) {
                    // Bats move erratically
                    const offsetX = Math.sin(Date.now() * 0.003 + enemy.x) * 2;
                    const offsetZ = Math.cos(Date.now() * 0.004 + enemy.z) * 2;
                    this._moveToward(enemy, px + offsetX, pz + offsetZ, dt, dungeon);
                    enemy.rotation = angle;
                    if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / enemy.attackSpeed;
                        return { attack: true, damage: enemy.atk };
                    }
                } else {
                    this._wander(enemy, dt, dungeon);
                }
                break;

            case 'flanker':
                if (dist < enemy.aggroRange) {
                    // Goblins try to flank
                    const flankAngle = angle + Math.PI * 0.4 * (enemy.x > px ? 1 : -1);
                    const flankDist = Math.max(2, dist - 1);
                    const fx = px + Math.sin(flankAngle) * flankDist;
                    const fz = pz + Math.cos(flankAngle) * flankDist;
                    this._moveToward(enemy, dist < 3 ? px : fx, dist < 3 ? pz : fz, dt, dungeon);
                    enemy.rotation = angle;
                    if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / enemy.attackSpeed;
                        return { attack: true, damage: enemy.atk };
                    }
                } else {
                    this._wander(enemy, dt, dungeon);
                }
                break;

            case 'ranged':
                if (dist < enemy.aggroRange) {
                    enemy.rotation = angle;
                    if (dist < 4) {
                        // Too close, retreat
                        this._moveToward(enemy, enemy.x - Math.sin(angle) * 3, enemy.z - Math.cos(angle) * 3, dt, dungeon);
                    } else if (dist > enemy.attackRange * 0.8) {
                        this._moveToward(enemy, px, pz, dt, dungeon);
                    }
                    if (enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / enemy.attackSpeed;
                        return { attack: true, damage: enemy.atk, ranged: true, angle };
                    }
                }
                break;

            case 'phaser':
                if (dist < enemy.aggroRange) {
                    enemy.rotation = angle;
                    // Wraiths phase in and out
                    if (enemy.stateTimer <= 0) {
                        enemy.stateTimer = Utils.randFloat(2, 4);
                        if (enemy.mesh) {
                            enemy.mesh.visible = !enemy.mesh.visible;
                        }
                    }
                    if (enemy.mesh?.visible) {
                        this._moveToward(enemy, px, pz, dt * 1.5, dungeon);
                        if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                            enemy.attackCooldown = 1 / enemy.attackSpeed;
                            return { attack: true, damage: enemy.atk };
                        }
                    }
                }
                break;

            case 'ambush':
                // Mimics stay still until close
                if (dist < enemy.aggroRange) {
                    enemy.state = 'chase';
                    this._moveToward(enemy, px, pz, dt * 1.3, dungeon);
                    enemy.rotation = angle;
                    if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / enemy.attackSpeed;
                        return { attack: true, damage: enemy.atk };
                    }
                }
                break;

            case 'boss_lich':
                enemy.rotation = angle;
                if (dist < enemy.aggroRange) {
                    // Phase 2 at 50% HP
                    if (enemy.hp < enemy.maxHp * 0.5) enemy.phase = 2;

                    if (dist < 5) {
                        this._moveToward(enemy, enemy.x - Math.sin(angle) * 3, enemy.z - Math.cos(angle) * 3, dt, dungeon);
                    }

                    if (enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / (enemy.attackSpeed * (enemy.phase === 2 ? 1.5 : 1));
                        return { attack: true, damage: enemy.atk * (enemy.phase === 2 ? 1.3 : 1), ranged: true, angle };
                    }

                    // Special: summon
                    if (enemy.specialCooldown <= 0 && enemy.phase === 2) {
                        enemy.specialCooldown = 8;
                        return { special: 'summon', type: ENEMY_TYPES.SKELETON };
                    }
                }
                break;

            case 'boss_dragon':
                enemy.rotation = angle;
                if (dist < enemy.aggroRange) {
                    if (enemy.hp < enemy.maxHp * 0.5) enemy.phase = 2;

                    this._moveToward(enemy, px, pz, dt, dungeon);

                    if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                        enemy.attackCooldown = 1 / enemy.attackSpeed;
                        return { attack: true, damage: enemy.atk * 1.2 };
                    }

                    // Special: fire breath
                    if (enemy.specialCooldown <= 0) {
                        enemy.specialCooldown = enemy.phase === 2 ? 4 : 6;
                        return { special: 'fire_breath', angle, damage: enemy.atk * 0.8 };
                    }
                }
                break;

            default:
                this._wander(enemy, dt, dungeon);
        }

        return null;
    }

    _moveToward(enemy, tx, tz, dt, dungeon) {
        const angle = Math.atan2(tx - enemy.x, tz - enemy.z);
        const nx = enemy.x + Math.sin(angle) * enemy.speed * dt;
        const nz = enemy.z + Math.cos(angle) * enemy.speed * dt;

        // Collision check with walls
        if (this._canMoveTo(nx, nz, dungeon)) {
            enemy.x = nx;
            enemy.z = nz;
        } else if (this._canMoveTo(nx, enemy.z, dungeon)) {
            enemy.x = nx;
        } else if (this._canMoveTo(enemy.x, nz, dungeon)) {
            enemy.z = nz;
        }
    }

    _wander(enemy, dt, dungeon) {
        if (enemy.stateTimer <= 0) {
            enemy.stateTimer = Utils.randFloat(2, 5);
            enemy.wanderAngle = Utils.randFloat(0, Math.PI * 2);
        }
        if (enemy.wanderAngle !== undefined) {
            const nx = enemy.x + Math.sin(enemy.wanderAngle) * enemy.speed * 0.3 * dt;
            const nz = enemy.z + Math.cos(enemy.wanderAngle) * enemy.speed * 0.3 * dt;
            if (this._canMoveTo(nx, nz, dungeon)) {
                enemy.x = nx;
                enemy.z = nz;
                enemy.rotation = enemy.wanderAngle;
            } else {
                enemy.wanderAngle = Utils.randFloat(0, Math.PI * 2);
            }
        }
    }

    _canMoveTo(x, z, dungeon) {
        const margin = 0.4;
        const checks = [
            { x: x - margin, z: z - margin },
            { x: x + margin, z: z - margin },
            { x: x - margin, z: z + margin },
            { x: x + margin, z: z + margin },
        ];

        for (const p of checks) {
            const gx = Math.floor(p.x / CELL_SIZE);
            const gz = Math.floor(p.z / CELL_SIZE);
            if (gx < 0 || gx >= dungeon.width || gz < 0 || gz >= dungeon.height) return false;
            if (dungeon.grid[gz][gx] === TILE.WALL) return false;
        }
        return true;
    }

    takeDamage(enemy, damage) {
        const mitigated = Math.max(1, damage - enemy.def * 0.3);
        const actual = Math.round(mitigated);
        enemy.hp -= actual;
        enemy.hitFlash = 0.3;

        if (enemy.hp <= 0) {
            enemy.alive = false;
            enemy.state = 'dead';
        }

        return actual;
    }

    getEnemiesInRange(x, z, range) {
        return this.enemies.filter(e =>
            e.alive && Utils.dist(e.x, e.z, x, z) <= range
        );
    }

    getClosestEnemy(x, z, maxRange) {
        let closest = null;
        let closestDist = maxRange;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = Utils.dist(e.x, e.z, x, z);
            if (d < closestDist) {
                closestDist = d;
                closest = e;
            }
        }
        return closest;
    }

    getAliveCount() {
        return this.enemies.filter(e => e.alive).length;
    }
}
