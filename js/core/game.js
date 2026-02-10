// ============================================================
// MAIN GAME CLASS
// ============================================================

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.state = GAME_STATES.TITLE;

        // Three.js setup
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, PLAYER_HEIGHT, 0);

        // Pitch tracking
        this.cameraPitch = 0;
        this.cameraYaw = 0;

        // Subsystems
        this.input = new InputManager();
        this.hud = new HUD();
        this.screens = new ScreenManager();
        this.dungeonRenderer = new DungeonRenderer(this.scene);
        this.enemyManager = new EnemyManager(this.scene);
        this.projectileManager = new ProjectileManager(this.scene);
        this.itemSystem = new ItemSystem(this.scene);

        // Player
        this.player = new Player();

        // Dungeon
        this.dungeon = null;

        // Player light
        this.playerLight = new THREE.PointLight(0xffeedd, 1.5, 15);
        this.playerLight.position.set(0, PLAYER_HEIGHT, 0);
        this.scene.add(this.playerLight);

        // Weapon visual
        this.weaponMesh = null;
        this.weaponSwing = 0;
        this._createWeaponMesh();

        // Attack visual
        this.attackVisualTimer = 0;

        // Timing
        this.clock = new THREE.Clock();
        this.time = 0;

        // Resize handler
        window.addEventListener('resize', () => this._onResize());

        // Initial screen
        this.screens.show('title');
    }

    _onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    _createWeaponMesh() {
        // Simple sword mesh attached to camera
        const group = new THREE.Group();

        // Blade
        const bladeGeo = new THREE.BoxGeometry(0.05, 0.6, 0.05);
        const bladeMat = new THREE.MeshLambertMaterial({ color: 0xccccdd });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.3;
        group.add(blade);

        // Guard
        const guardGeo = new THREE.BoxGeometry(0.2, 0.04, 0.06);
        const guardMat = new THREE.MeshLambertMaterial({ color: 0x886622 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        group.add(guard);

        // Handle
        const handleGeo = new THREE.BoxGeometry(0.04, 0.15, 0.04);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x553311 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.1;
        group.add(handle);

        group.position.set(0.4, -0.3, -0.6);
        this.camera.add(group);
        this.scene.add(this.camera);
        this.weaponMesh = group;
    }

    startNewGame() {
        this.player.reset();
        this.state = GAME_STATES.PLAYING;
        this.screens.show(null);
        this.screens.showHUD();

        // Give starting items
        const startSword = { ...WEAPONS[0], type: ITEM_TYPE.WEAPON, count: 1 };
        this.player.inventory.addItem(startSword);
        this.player.inventory.equip(startSword);

        const startPotion = { ...CONSUMABLES[0], type: ITEM_TYPE.CONSUMABLE, count: 3 };
        this.player.inventory.addItem(startPotion);
        this.player.inventory.assignConsumable(startPotion, 0);

        this._generateFloor();
        this.input.requestPointerLock(this.canvas);
    }

    _generateFloor() {
        // Clear previous
        this.dungeonRenderer.clear();
        this.enemyManager.clear();
        this.projectileManager.clear();
        this.itemSystem.clear();

        // Generate dungeon
        const size = 35 + this.player.floor * 5;
        const gen = new DungeonGenerator(size, size, this.player.floor);
        this.dungeon = gen.generate();

        // Build 3D dungeon
        this.dungeonRenderer.build(this.dungeon);

        // Spawn enemies
        for (const spawn of this.dungeon.enemySpawns) {
            this.enemyManager.spawn(spawn.type, spawn.x, spawn.z, this.player.floor, spawn.isBoss);
        }

        // Spawn items
        for (const spawn of this.dungeon.itemSpawns) {
            if (spawn.type === ITEM_TYPE.GOLD) {
                this.itemSystem.spawnItem({ type: ITEM_TYPE.GOLD, amount: spawn.amount, icon: '🪙', name: `${spawn.amount} Gold` }, spawn.x, spawn.z);
            } else if (spawn.type === 'random') {
                const item = ItemDatabase.getRandomItem(this.player.floor);
                this.itemSystem.spawnItem(item, spawn.x, spawn.z);
            }
        }

        // Position player
        const spawnPos = Utils.gridToWorld(this.dungeon.spawnPoint.x, this.dungeon.spawnPoint.z);
        this.player.x = spawnPos.x;
        this.player.z = spawnPos.z;
        this.camera.position.set(spawnPos.x, PLAYER_HEIGHT, spawnPos.z);
        this.cameraYaw = 0;
        this.cameraPitch = 0;

        // Update HUD
        this.hud.updateFloor(this.player.floor);
        this.hud.addMessage(`Entering Floor ${this.player.floor}...`, 'info');

        if (BOSS_FLOORS.includes(this.player.floor)) {
            this.hud.addMessage('A powerful presence lurks ahead...', 'damage');
        }
    }

    update() {
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.time += dt;

        if (this.state === GAME_STATES.PLAYING) {
            this._updatePlaying(dt);
        }

        // Handle global input
        this._handleGlobalInput();

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    _updatePlaying(dt) {
        // Camera look
        const mouseDelta = this.input.consumeMouseDelta();
        const sensitivity = 0.002;
        this.cameraYaw -= mouseDelta.dx * sensitivity;
        this.cameraPitch -= mouseDelta.dy * sensitivity;
        this.cameraPitch = Utils.clamp(this.cameraPitch, -Math.PI / 2.5, Math.PI / 2.5);

        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.cameraYaw;
        this.camera.rotation.x = this.cameraPitch;

        // Player movement
        const { mx, mz } = this.input.getMovement();
        if (mx !== 0 || mz !== 0) {
            const stats = this.player.getEffectiveStats();
            const moveSpeed = stats.speed * dt;

            // Direction relative to camera
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.cameraYaw, 0))
            );
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.cameraYaw, 0))
            );

            let moveDir = new THREE.Vector3();
            moveDir.addScaledVector(forward, mz);
            moveDir.addScaledVector(right, mx);
            moveDir.normalize();

            const newX = this.player.x + moveDir.x * moveSpeed;
            const newZ = this.player.z + moveDir.z * moveSpeed;

            // Collision detection
            if (this._canPlayerMoveTo(newX, newZ)) {
                this.player.x = newX;
                this.player.z = newZ;
            } else if (this._canPlayerMoveTo(newX, this.player.z)) {
                this.player.x = newX;
            } else if (this._canPlayerMoveTo(this.player.x, newZ)) {
                this.player.z = newZ;
            }

            this.camera.position.set(this.player.x, PLAYER_HEIGHT, this.player.z);
            this.playerLight.position.set(this.player.x, PLAYER_HEIGHT, this.player.z);
        }

        // Player update
        this.player.update(dt);

        // Attack
        this.player.attackCooldown -= dt;
        if (this.input.mouseDown && this.player.attackCooldown <= 0) {
            this._playerAttack();
        }

        // Weapon animation
        this._updateWeaponAnim(dt);

        // Enemies
        this.enemyManager.update(dt, this.player.x, this.player.z, this.dungeon);

        // Check enemy attacks on player
        this._checkEnemyAttacks(dt);

        // Projectiles
        this.projectileManager.update(dt, this.dungeon);
        this._checkProjectileHits();

        // Items
        this.itemSystem.update(this.time);

        // Interaction check
        this._checkInteraction();

        // Pickup (E key)
        if (this.input.wasPressed('KeyE')) {
            this._interact();
        }

        // Consumables (1-5)
        for (let i = 0; i < 5; i++) {
            if (this.input.wasPressed(`Digit${i + 1}`)) {
                this._useConsumable(i);
            }
        }

        // Check stairs
        this._checkStairs();

        // Check traps
        this._checkTraps(dt);

        // Check player death
        if (this.player.hp <= 0) {
            this._gameOver(false);
        }

        // Dungeon animations
        this.dungeonRenderer.update(this.time);

        // Update HUD
        const stats = this.player.getEffectiveStats();
        this.hud.updateHealth(this.player.hp, stats.maxHp);
        this.hud.updateXP(this.player.level, this.player.xp, this.player.xpToLevel);
        this.hud.updateStats(stats);
        this.hud.updateGold(this.player.gold);
        this.hud.updateConsumables(this.player.inventory.consumableSlots);

        // Minimap
        const pg = Utils.worldToGrid(this.player.x, this.player.z);
        this.hud.drawMinimap(this.dungeon, pg.gx, pg.gz, this.enemyManager.enemies);
    }

    _canPlayerMoveTo(x, z) {
        const r = PLAYER_RADIUS;
        const checks = [
            { x: x - r, z: z - r },
            { x: x + r, z: z - r },
            { x: x - r, z: z + r },
            { x: x + r, z: z + r },
        ];

        for (const p of checks) {
            const gx = Math.floor(p.x / CELL_SIZE);
            const gz = Math.floor(p.z / CELL_SIZE);
            if (gx < 0 || gx >= this.dungeon.width || gz < 0 || gz >= this.dungeon.height) return false;
            const tile = this.dungeon.grid[gz][gx];
            if (tile === TILE.WALL) return false;
        }
        return true;
    }

    _playerAttack() {
        const stats = this.player.getEffectiveStats();
        this.player.attackCooldown = 1 / stats.attackSpeed;
        this.weaponSwing = 1.0;
        this.attackVisualTimer = 0.2;

        const result = this.player.dealDamage();

        // Find forward direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const attackPoint = new THREE.Vector3(
            this.player.x + forward.x * this.player.attackRange * 0.5,
            0,
            this.player.z + forward.z * this.player.attackRange * 0.5
        );

        // Find enemies in attack cone
        const enemies = this.enemyManager.getEnemiesInRange(
            attackPoint.x, attackPoint.z, this.player.attackRange
        );

        let hitAny = false;
        for (const enemy of enemies) {
            // Check angle
            const toEnemy = Math.atan2(enemy.x - this.player.x, enemy.z - this.player.z);
            const playerFacing = this.cameraYaw + Math.PI;
            let angleDiff = toEnemy - playerFacing;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) < Math.PI / 3) { // 60 degree cone
                const actualDmg = this.enemyManager.takeDamage(enemy, result.damage);
                hitAny = true;

                // Screen position for damage number
                const screenPos = this._worldToScreen(enemy.x, enemy.size * 1.5, enemy.z);
                if (screenPos) {
                    this.hud.showDamageNumber(screenPos.x, screenPos.y, actualDmg, result.isCrit);
                }

                // Lifesteal
                if (result.lifesteal > 0) {
                    const healed = this.player.heal(Math.floor(actualDmg * result.lifesteal));
                    if (healed > 0) {
                        this.hud.showHealNumber(window.innerWidth / 2, window.innerHeight / 2 - 30, healed);
                    }
                }

                // Weapon specials
                if (result.special === 'burn') {
                    // Burn DOT - simplified as extra damage
                    setTimeout(() => {
                        if (enemy.alive) {
                            this.enemyManager.takeDamage(enemy, Math.floor(result.damage * 0.3));
                        }
                    }, 1000);
                } else if (result.special === 'slow') {
                    enemy.speed *= 0.5;
                    setTimeout(() => { enemy.speed *= 2; }, 3000);
                } else if (result.special === 'chain_lightning') {
                    // Hit nearby enemies
                    const nearby = this.enemyManager.getEnemiesInRange(enemy.x, enemy.z, 5);
                    for (const ne of nearby) {
                        if (ne !== enemy && ne.alive) {
                            this.enemyManager.takeDamage(ne, Math.floor(result.damage * 0.5));
                        }
                    }
                } else if (result.special === 'execute') {
                    if (enemy.hp > 0 && enemy.hp < enemy.maxHp * 0.15) {
                        this.enemyManager.takeDamage(enemy, enemy.hp + 1);
                        this.hud.addMessage('Execute!', 'damage');
                    }
                }

                // Enemy killed
                if (!enemy.alive) {
                    this._onEnemyKilled(enemy);
                }

                // Only hit closest enemy
                break;
            }
        }
    }

    _onEnemyKilled(enemy) {
        this.player.kills++;

        // XP
        const leveled = this.player.addXP(enemy.xp);
        this.hud.addMessage(`${enemy.name} defeated! +${enemy.xp} XP`, 'info');

        // Gold
        if (enemy.gold > 0) {
            this.player.gold += enemy.gold;
            this.hud.addMessage(`+${enemy.gold} Gold`, 'item');
        }

        // Drop loot
        if (enemy.isBoss) {
            const loot = ItemDatabase.getBossLoot(this.player.floor);
            for (const item of loot) {
                const eg = Utils.worldToGrid(enemy.x, enemy.z);
                this.itemSystem.spawnItem(item, eg.gx, eg.gz);
            }
            this.hud.addMessage('Boss defeated! Rare loot dropped!', 'levelup');
        } else if (Utils.chance(0.3)) {
            const item = ItemDatabase.getRandomItem(this.player.floor);
            const eg = Utils.worldToGrid(enemy.x, enemy.z);
            this.itemSystem.spawnItem(item, eg.gx, eg.gz);
        }

        // Level up
        if (leveled) {
            this._showLevelUp();
        }
    }

    _showLevelUp() {
        this.state = GAME_STATES.LEVEL_UP;
        this.input.exitPointerLock();

        this.hud.addMessage(`Level Up! Now level ${this.player.level}!`, 'levelup');

        // Pick 3 random upgrades
        const upgrades = Utils.shuffle(UPGRADE_POOL).slice(0, 3);

        this.screens.showLevelUp(upgrades, (chosen) => {
            chosen.apply(this.player);
            this.hud.addMessage(`Gained: ${chosen.name}!`, 'levelup');
            this.state = GAME_STATES.PLAYING;
            this.screens.show(null);
            this.screens.showHUD();
            this.input.requestPointerLock(this.canvas);
        });
    }

    _checkEnemyAttacks(dt) {
        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.alive) continue;
            const dist = Utils.dist(enemy.x, enemy.z, this.player.x, this.player.z);

            if (enemy.ranged) {
                // Ranged enemies spawn projectiles (handled in AI return)
                if (enemy.attackCooldown <= 0 && dist < enemy.aggroRange && dist > 3) {
                    const angle = Math.atan2(this.player.x - enemy.x, this.player.z - enemy.z);
                    this.projectileManager.spawn(
                        enemy.x, enemy.z, angle, 8,
                        enemy.atk, 'enemy',
                        enemy.type === ENEMY_TYPES.FIRE_MAGE ? 'fireball' : 'shadow_bolt'
                    );
                    enemy.attackCooldown = 1 / enemy.attackSpeed;
                }
            } else {
                // Melee
                if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
                    const dmg = this.player.takeDamage(enemy.atk);
                    enemy.attackCooldown = 1 / enemy.attackSpeed;

                    if (dmg === -1) {
                        this.hud.addMessage('Dodged!', 'info');
                    } else if (dmg === -2) {
                        this.hud.addMessage('Phoenix Revive!', 'levelup');
                        this.hud.showDamageFlash();
                    } else if (dmg > 0) {
                        this.hud.showDamageFlash();
                        this.hud.addMessage(`${enemy.name} hits for ${dmg}!`, 'damage');

                        // Thorns
                        if (this.player.thorns > 0) {
                            const thornDmg = Math.floor(dmg * this.player.thorns);
                            this.enemyManager.takeDamage(enemy, thornDmg);
                            if (!enemy.alive) this._onEnemyKilled(enemy);
                        }
                    }
                }
            }
        }
    }

    _checkProjectileHits() {
        // Enemy projectiles hitting player
        const hits = this.projectileManager.getHittingPlayer(this.player.x, this.player.z);
        for (const proj of hits) {
            const dmg = this.player.takeDamage(proj.damage);
            if (dmg > 0) {
                this.hud.showDamageFlash();
                this.hud.addMessage(`Hit by projectile for ${dmg}!`, 'damage');
            } else if (dmg === -1) {
                this.hud.addMessage('Dodged projectile!', 'info');
            }
        }
    }

    _checkInteraction() {
        const nearItem = this.itemSystem.getNearbyItem(this.player.x, this.player.z, 2.5);

        // Check chests
        let nearChest = null;
        for (const inter of this.dungeonRenderer.interactables) {
            if (inter.userData?.type === 'chest' && !inter.userData.opened) {
                const dist = Utils.dist(this.player.x, this.player.z,
                    inter.position.x, inter.position.z);
                if (dist < 2.5) {
                    nearChest = inter;
                    break;
                }
            }
        }

        if (nearItem) {
            const name = nearItem.type === ITEM_TYPE.GOLD ? nearItem.name : `${nearItem.name} (${ITEM_RARITY[nearItem.rarity]?.name || ''})`;
            this.hud.showInteractionPrompt(`[E] Pick up ${name}`);
        } else if (nearChest) {
            this.hud.showInteractionPrompt('[E] Open Chest');
        } else {
            this.hud.hideInteractionPrompt();
        }
    }

    _interact() {
        // Pick up items
        const nearItem = this.itemSystem.getNearbyItem(this.player.x, this.player.z, 2.5);
        if (nearItem) {
            if (nearItem.type === ITEM_TYPE.GOLD) {
                this.player.gold += nearItem.amount;
                this.hud.addMessage(`+${nearItem.amount} Gold`, 'item');
                this.itemSystem.removeItem(nearItem);
            } else {
                const added = this.player.inventory.addItem({
                    ...nearItem,
                    worldX: undefined, worldZ: undefined, gx: undefined, gz: undefined,
                    mesh: undefined, glowMesh: undefined, collected: undefined,
                });
                if (added) {
                    this.hud.addMessage(`Picked up ${nearItem.name}!`, 'item');
                    this.itemSystem.removeItem(nearItem);
                    this.player.stats.itemsCollected++;

                    // Auto-assign consumables to empty slots
                    if (nearItem.type === ITEM_TYPE.CONSUMABLE) {
                        const item = this.player.inventory.items[this.player.inventory.items.length - 1];
                        for (let i = 0; i < 5; i++) {
                            if (!this.player.inventory.consumableSlots[i]) {
                                this.player.inventory.assignConsumable(item, i);
                                break;
                            }
                        }
                    }
                } else {
                    this.hud.addMessage('Inventory full!', 'damage');
                }
            }
            return;
        }

        // Open chests
        for (const inter of this.dungeonRenderer.interactables) {
            if (inter.userData?.type === 'chest' && !inter.userData.opened) {
                const dist = Utils.dist(this.player.x, this.player.z,
                    inter.position.x, inter.position.z);
                if (dist < 2.5) {
                    inter.userData.opened = true;
                    inter.material.color.setHex(0x555555);
                    this.player.stats.chestsOpened++;

                    const loot = ItemDatabase.getChestLoot(this.player.floor);
                    for (const item of loot) {
                        const gx = inter.userData.gx;
                        const gz = inter.userData.gz;
                        const ox = Utils.randFloat(-0.5, 0.5);
                        const oz = Utils.randFloat(-0.5, 0.5);
                        this.itemSystem.spawnItem(item, gx + Math.round(ox), gz + Math.round(oz));
                    }

                    this.hud.addMessage('Chest opened!', 'item');
                    return;
                }
            }
        }
    }

    _useConsumable(slotIndex) {
        const result = this.player.useConsumable(slotIndex);
        if (!result) return;

        switch (result.type) {
            case 'heal':
                this.hud.addMessage(`Healed ${result.amount} HP!`, 'heal');
                this.hud.showHealNumber(window.innerWidth / 2, window.innerHeight / 2, result.amount);
                break;
            case 'buff':
                this.hud.addMessage(`Used ${result.name}!`, 'info');
                break;
            case 'aoe':
                // Damage all nearby enemies
                const nearby = this.enemyManager.getEnemiesInRange(this.player.x, this.player.z, result.radius);
                for (const enemy of nearby) {
                    this.enemyManager.takeDamage(enemy, result.damage);
                    if (!enemy.alive) this._onEnemyKilled(enemy);
                }
                this.hud.addMessage(`Lightning strikes ${nearby.length} enemies!`, 'damage');
                break;
            case 'teleport':
                const room = Utils.pick(this.dungeon.rooms);
                const center = {
                    x: Math.floor(room.x + room.w / 2),
                    z: Math.floor(room.y + room.h / 2),
                };
                const pos = Utils.gridToWorld(center.x, center.z);
                this.player.x = pos.x;
                this.player.z = pos.z;
                this.camera.position.set(pos.x, PLAYER_HEIGHT, pos.z);
                this.hud.addMessage('Teleported!', 'info');
                break;
        }
    }

    _checkStairs() {
        const pg = Utils.worldToGrid(this.player.x, this.player.z);
        if (this.dungeon.grid[pg.gz]?.[pg.gx] === TILE.STAIRS_DOWN) {
            this.hud.showInteractionPrompt('[E] Descend to next floor');

            if (this.input.wasPressed('KeyE')) {
                this.player.floor++;
                this.player.stats.floorsCleared++;

                if (this.player.floor > MAX_FLOOR) {
                    this._gameOver(true);
                    return;
                }

                this._generateFloor();
            }
        }
    }

    _checkTraps(dt) {
        const pg = Utils.worldToGrid(this.player.x, this.player.z);
        if (this.dungeon.grid[pg.gz]?.[pg.gx] === TILE.TRAP) {
            if (Utils.chance(dt * 0.5)) { // Chance per second
                const dmg = this.player.takeDamage(5 + this.player.floor * 2);
                if (dmg > 0) {
                    this.hud.showDamageFlash();
                    this.hud.addMessage(`Trap! -${dmg} HP`, 'damage');
                }
            }
        }
    }

    _updateWeaponAnim(dt) {
        if (this.weaponSwing > 0) {
            this.weaponSwing -= dt * 5;
            const swing = Math.sin(this.weaponSwing * Math.PI) * 0.8;
            this.weaponMesh.rotation.z = -swing;
            this.weaponMesh.rotation.x = swing * 0.3;
            this.weaponMesh.position.x = 0.4 - swing * 0.2;
        } else {
            // Idle bob
            this.weaponMesh.rotation.z = Math.sin(this.time * 2) * 0.02;
            this.weaponMesh.position.y = -0.3 + Math.sin(this.time * 2) * 0.01;
        }
    }

    _worldToScreen(wx, wy, wz) {
        const v = new THREE.Vector3(wx, wy, wz);
        v.project(this.camera);
        if (v.z > 1) return null; // Behind camera
        return {
            x: (v.x * 0.5 + 0.5) * window.innerWidth,
            y: (-v.y * 0.5 + 0.5) * window.innerHeight,
        };
    }

    _handleGlobalInput() {
        // Tab - inventory
        if (this.input.wasPressed('Tab')) {
            if (this.state === GAME_STATES.PLAYING) {
                this.state = GAME_STATES.INVENTORY;
                this.input.exitPointerLock();
                this.screens.showInventory(
                    this.player.inventory,
                    (item) => this.player.inventory.equip(item),
                    (item) => {
                        // Use consumable from inventory
                        if (item.heal) {
                            const healed = this.player.heal(item.heal);
                            this.hud.addMessage(`Healed ${healed} HP!`, 'heal');
                        } else if (item.fullHeal) {
                            const healed = this.player.heal(99999);
                            this.hud.addMessage(`Fully healed! +${healed} HP`, 'heal');
                        }
                        this.player.inventory.removeItem(item);
                    },
                    (item, slot) => this.player.inventory.assignConsumable(item, slot)
                );
            } else if (this.state === GAME_STATES.INVENTORY) {
                this.state = GAME_STATES.PLAYING;
                this.screens.show(null);
                this.screens.showHUD();
                this.input.requestPointerLock(this.canvas);
            }
        }

        // Escape - pause
        if (this.input.wasPressed('Escape')) {
            if (this.state === GAME_STATES.PLAYING) {
                this.state = GAME_STATES.PAUSED;
                this.input.exitPointerLock();
                this.screens.show('pause');
                this.screens.showHUD();
            } else if (this.state === GAME_STATES.PAUSED) {
                this.state = GAME_STATES.PLAYING;
                this.screens.show(null);
                this.screens.showHUD();
                this.input.requestPointerLock(this.canvas);
            } else if (this.state === GAME_STATES.INVENTORY) {
                this.state = GAME_STATES.PLAYING;
                this.screens.show(null);
                this.screens.showHUD();
                this.input.requestPointerLock(this.canvas);
            }
        }
    }

    _gameOver(isVictory) {
        this.state = GAME_STATES.GAME_OVER;
        this.input.exitPointerLock();
        this.screens.showGameOver(this.player, isVictory);
    }

    returnToTitle() {
        this.state = GAME_STATES.TITLE;
        this.dungeonRenderer.clear();
        this.enemyManager.clear();
        this.projectileManager.clear();
        this.itemSystem.clear();
        this.screens.show('title');
        this.input.exitPointerLock();
    }
}
