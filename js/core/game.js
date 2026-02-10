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

        // Player light - brighter and longer range
        this.playerLight = new THREE.PointLight(0xffeedd, 2.5, 22);
        this.playerLight.position.set(0, PLAYER_HEIGHT, 0);
        this.scene.add(this.playerLight);

        // Secondary fill light on player for better visibility
        this.playerFillLight = new THREE.PointLight(0xaaccff, 0.8, 12);
        this.playerFillLight.position.set(0, PLAYER_HEIGHT + 1, 0);
        this.scene.add(this.playerFillLight);

        // Weapon visual
        this.weaponMesh = null;
        this.weaponSwing = 0;
        this.swingPhase = 0; // 0=idle, 1=windup, 2=slash, 3=followthrough, 4=return
        this.swingTimer = 0;
        this.currentWeaponId = null;
        this._createWeaponMesh();

        // Attack visual
        this.attackVisualTimer = 0;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeTimer = 0;

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

    _createWeaponMesh(weaponId) {
        // Remove old weapon
        if (this.weaponMesh) {
            this.camera.remove(this.weaponMesh);
        }

        const group = new THREE.Group();
        const id = weaponId || 'rusty_sword';
        this.currentWeaponId = id;

        // Build different models per weapon type
        if (id === 'war_axe') {
            this._buildAxeModel(group, 0xaaaaaa, 0x886622);
        } else if (id === 'thunder_hammer') {
            this._buildHammerModel(group, 0x6688cc, 0x443322, 0x44aaff);
        } else if (id === 'shadow_dagger') {
            this._buildDaggerModel(group, 0x554488, 0x222222);
        } else if (id === 'flame_sword') {
            this._buildSwordModel(group, 0xff6622, 0xcc4400, 0x886622, true);
        } else if (id === 'frost_blade') {
            this._buildSwordModel(group, 0x88ccff, 0x4488cc, 0x556688, false, 0x44aaff);
        } else if (id === 'vampiric_blade') {
            this._buildSwordModel(group, 0x881122, 0xcc0033, 0x330011, false, 0xff0044);
        } else if (id === 'doom_cleaver') {
            this._buildCleaverModel(group, 0x222222, 0x110022, 0x8800ff);
        } else if (id === 'celestial_sword') {
            this._buildSwordModel(group, 0xffffff, 0xffffaa, 0xccaa44, false, 0xffffcc);
        } else if (id === 'elven_blade') {
            this._buildSwordModel(group, 0x88cc88, 0x44aa44, 0x336633, false, 0x44ff44);
        } else if (id === 'iron_sword') {
            this._buildSwordModel(group, 0xbbbbcc, 0x999999, 0x886622);
        } else {
            // Default rusty sword
            this._buildSwordModel(group, 0xaa8866, 0x886644, 0x553311);
        }

        group.position.set(0.45, -0.35, -0.55);
        this.camera.add(group);
        if (!this.camera.parent) this.scene.add(this.camera);
        this.weaponMesh = group;
    }

    _buildSwordModel(group, bladeColor, guardColor, handleColor, hasFlame = false, glowColor = null) {
        // Blade - tapered
        const bladeGeo = new THREE.BoxGeometry(0.05, 0.65, 0.03);
        const bladeMat = new THREE.MeshLambertMaterial({
            color: bladeColor,
            emissive: glowColor || 0x000000,
            emissiveIntensity: glowColor ? 0.4 : 0,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.35;
        group.add(blade);

        // Blade tip
        const tipGeo = new THREE.ConeGeometry(0.03, 0.12, 4);
        const tip = new THREE.Mesh(tipGeo, bladeMat);
        tip.position.y = 0.73;
        group.add(tip);

        // Blade edge highlight
        const edgeGeo = new THREE.BoxGeometry(0.06, 0.65, 0.005);
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.y = 0.35;
        edge.position.z = 0.018;
        group.add(edge);

        // Guard - cross guard
        const guardGeo = new THREE.BoxGeometry(0.22, 0.04, 0.05);
        const guardMat = new THREE.MeshLambertMaterial({ color: guardColor });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        group.add(guard);

        // Guard orbs
        const orbGeo = new THREE.SphereGeometry(0.025, 6, 6);
        const orbL = new THREE.Mesh(orbGeo, guardMat);
        const orbR = new THREE.Mesh(orbGeo, guardMat);
        orbL.position.set(-0.12, 0, 0);
        orbR.position.set(0.12, 0, 0);
        group.add(orbL, orbR);

        // Handle - wrapped
        const handleGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.18, 6);
        const handleMat = new THREE.MeshLambertMaterial({ color: handleColor });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.11;
        group.add(handle);

        // Pommel
        const pommelGeo = new THREE.SphereGeometry(0.03, 6, 6);
        const pommel = new THREE.Mesh(pommelGeo, guardMat);
        pommel.position.y = -0.22;
        group.add(pommel);

        // Flame effect
        if (hasFlame) {
            for (let i = 0; i < 3; i++) {
                const flameGeo = new THREE.ConeGeometry(0.04 - i * 0.01, 0.15 + i * 0.05, 5);
                const flameMat = new THREE.MeshBasicMaterial({
                    color: i === 0 ? 0xff4400 : i === 1 ? 0xff8800 : 0xffcc00,
                    transparent: true, opacity: 0.5 - i * 0.1,
                });
                const flame = new THREE.Mesh(flameGeo, flameMat);
                flame.position.y = 0.5 + i * 0.08;
                flame.position.x = Math.sin(i * 2) * 0.02;
                flame.userData = { isWeaponFlame: true, idx: i };
                group.add(flame);
            }
        }

        // Glow light for magical weapons
        if (glowColor) {
            const glow = new THREE.PointLight(glowColor, 0.6, 3);
            glow.position.y = 0.35;
            group.add(glow);
        }
    }

    _buildAxeModel(group, headColor, handleColor) {
        // Handle - long wooden shaft
        const handleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.7, 6);
        const handleMat = new THREE.MeshLambertMaterial({ color: handleColor });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = 0.1;
        group.add(handle);

        // Axe head - wider flat shape
        const headGeo = new THREE.BoxGeometry(0.25, 0.2, 0.04);
        const headMat = new THREE.MeshLambertMaterial({ color: headColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.08, 0.45, 0);
        group.add(head);

        // Axe blade edge (curved look)
        const edgeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8, 1, false, 0, Math.PI);
        const edgeMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.z = Math.PI / 2;
        edge.position.set(0.22, 0.45, 0);
        group.add(edge);

        // Pommel
        const pommelGeo = new THREE.SphereGeometry(0.035, 6, 6);
        const pommel = new THREE.Mesh(pommelGeo, headMat);
        pommel.position.y = -0.25;
        group.add(pommel);
    }

    _buildHammerModel(group, headColor, handleColor, glowColor) {
        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.65, 6);
        const handleMat = new THREE.MeshLambertMaterial({ color: handleColor });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = 0.05;
        group.add(handle);

        // Hammer head - big block
        const headGeo = new THREE.BoxGeometry(0.2, 0.15, 0.18);
        const headMat = new THREE.MeshLambertMaterial({
            color: headColor, emissive: glowColor, emissiveIntensity: 0.3,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.42;
        group.add(head);

        // Lightning accents
        const accentGeo = new THREE.BoxGeometry(0.22, 0.02, 0.02);
        const accentMat = new THREE.MeshBasicMaterial({ color: glowColor });
        for (let i = 0; i < 3; i++) {
            const accent = new THREE.Mesh(accentGeo, accentMat);
            accent.position.set(0, 0.37 + i * 0.05, 0.08);
            group.add(accent);
        }

        // Glow
        const glow = new THREE.PointLight(glowColor, 0.8, 4);
        glow.position.y = 0.42;
        group.add(glow);
    }

    _buildDaggerModel(group, bladeColor, handleColor) {
        // Short blade
        const bladeGeo = new THREE.BoxGeometry(0.035, 0.3, 0.02);
        const bladeMat = new THREE.MeshLambertMaterial({
            color: bladeColor, emissive: 0x221144, emissiveIntensity: 0.3,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.2;
        group.add(blade);

        // Sharp tip
        const tipGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
        const tip = new THREE.Mesh(tipGeo, bladeMat);
        tip.position.y = 0.4;
        group.add(tip);

        // Guard - small
        const guardGeo = new THREE.BoxGeometry(0.12, 0.025, 0.04);
        const guardMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0.04;
        group.add(guard);

        // Handle - wrapped
        const handleGeo = new THREE.CylinderGeometry(0.02, 0.022, 0.12, 6);
        const handleMat = new THREE.MeshLambertMaterial({ color: handleColor });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.04;
        group.add(handle);
    }

    _buildCleaverModel(group, bladeColor, handleColor, glowColor) {
        // Massive blade
        const bladeGeo = new THREE.BoxGeometry(0.12, 0.75, 0.03);
        const bladeMat = new THREE.MeshLambertMaterial({
            color: bladeColor, emissive: glowColor, emissiveIntensity: 0.25,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.4;
        group.add(blade);

        // Blade wider section
        const wideGeo = new THREE.BoxGeometry(0.18, 0.35, 0.025);
        const wide = new THREE.Mesh(wideGeo, bladeMat);
        wide.position.set(0.03, 0.55, 0);
        group.add(wide);

        // Rune lines
        const runeMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.7 });
        for (let i = 0; i < 4; i++) {
            const runeGeo = new THREE.BoxGeometry(0.08, 0.015, 0.035);
            const rune = new THREE.Mesh(runeGeo, runeMat);
            rune.position.set(0.01, 0.3 + i * 0.12, 0);
            rune.userData = { isRune: true, idx: i };
            group.add(rune);
        }

        // Guard - spiked
        const guardGeo = new THREE.BoxGeometry(0.28, 0.05, 0.06);
        const guardMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        group.add(guard);

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.22, 6);
        const handleMat = new THREE.MeshLambertMaterial({ color: handleColor });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.13;
        group.add(handle);

        // Glow
        const glow = new THREE.PointLight(glowColor, 0.5, 3);
        glow.position.y = 0.5;
        group.add(glow);
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

        // Build weapon model for starting weapon
        this._createWeaponMesh(startSword.id);

        this._generateFloor();
        this.input.requestPointerLock(this.canvas);
    }

    _generateFloor() {
        // Clear previous
        this.dungeonRenderer.clear();
        this.enemyManager.clear();
        this.projectileManager.clear();
        this.itemSystem.clear();

        // Generate dungeon - early floors are smaller for faster progression
        const floor = this.player.floor;
        let size;
        if (floor <= 2) {
            size = 22 + floor * 3; // Floors 1-2: small (25-28)
        } else if (floor <= 4) {
            size = 28 + floor * 2; // Floors 3-4: medium (34-36)
        } else {
            size = 32 + floor * 3; // Floors 5+: large (47+)
        }
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
            this.playerFillLight.position.set(this.player.x, PLAYER_HEIGHT + 1, this.player.z);
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
        this.swingPhase = 1;
        this.swingTimer = 0;
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
        if (!this.weaponMesh) return;

        const id = this.currentWeaponId || 'rusty_sword';
        const isHeavy = id === 'war_axe' || id === 'thunder_hammer' || id === 'doom_cleaver';
        const isDagger = id === 'shadow_dagger';

        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const s = this.shakeIntensity * (this.shakeTimer / 0.15);
            this.camera.position.x += (Math.random() - 0.5) * s;
            this.camera.position.y += (Math.random() - 0.5) * s * 0.5 + PLAYER_HEIGHT;
        }

        if (this.swingPhase > 0) {
            this.swingTimer += dt;

            if (isDagger) {
                // Dagger: quick stab animation
                const stabSpeed = 8;
                if (this.swingPhase === 1) {
                    // Pull back
                    const t = Math.min(this.swingTimer * stabSpeed, 1);
                    this.weaponMesh.position.z = -0.55 + t * 0.15;
                    this.weaponMesh.rotation.x = t * 0.3;
                    if (t >= 1) { this.swingPhase = 2; this.swingTimer = 0; }
                } else if (this.swingPhase === 2) {
                    // Stab forward
                    const t = Math.min(this.swingTimer * stabSpeed * 1.5, 1);
                    this.weaponMesh.position.z = -0.4 - t * 0.35;
                    this.weaponMesh.rotation.x = 0.3 - t * 0.5;
                    this.weaponMesh.position.y = -0.35 + t * 0.1;
                    if (t >= 1) { this.swingPhase = 3; this.swingTimer = 0; }
                } else if (this.swingPhase === 3) {
                    // Return
                    const t = Math.min(this.swingTimer * stabSpeed * 0.8, 1);
                    const ease = 1 - Math.pow(1 - t, 2);
                    this.weaponMesh.position.z = -0.75 + ease * 0.2;
                    this.weaponMesh.rotation.x = -0.2 + ease * 0.2;
                    this.weaponMesh.position.y = -0.25 - ease * 0.1;
                    if (t >= 1) { this.swingPhase = 0; this.swingTimer = 0; }
                }
            } else if (isHeavy) {
                // Heavy weapons: overhead slam
                const slamSpeed = 4;
                if (this.swingPhase === 1) {
                    // Wind up - raise weapon overhead
                    const t = Math.min(this.swingTimer * slamSpeed, 1);
                    const ease = t * t;
                    this.weaponMesh.rotation.x = ease * 1.2;
                    this.weaponMesh.rotation.z = ease * -0.3;
                    this.weaponMesh.position.y = -0.35 + ease * 0.3;
                    this.weaponMesh.position.z = -0.55 + ease * 0.1;
                    if (t >= 1) { this.swingPhase = 2; this.swingTimer = 0; }
                } else if (this.swingPhase === 2) {
                    // Slam down - fast
                    const t = Math.min(this.swingTimer * slamSpeed * 3, 1);
                    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                    this.weaponMesh.rotation.x = 1.2 - ease * 2.0;
                    this.weaponMesh.rotation.z = -0.3 + ease * 0.5;
                    this.weaponMesh.position.y = -0.05 - ease * 0.4;
                    this.weaponMesh.position.z = -0.45 - ease * 0.15;
                    if (t >= 1) {
                        this.swingPhase = 3; this.swingTimer = 0;
                        // Screen shake on impact
                        this.shakeIntensity = 0.08;
                        this.shakeTimer = 0.15;
                    }
                } else if (this.swingPhase === 3) {
                    // Hold briefly
                    const t = Math.min(this.swingTimer * slamSpeed * 2, 1);
                    if (t >= 1) { this.swingPhase = 4; this.swingTimer = 0; }
                } else if (this.swingPhase === 4) {
                    // Return to idle
                    const t = Math.min(this.swingTimer * slamSpeed * 1.5, 1);
                    const ease = 1 - Math.pow(1 - t, 3);
                    this.weaponMesh.rotation.x = -0.8 + ease * 0.8;
                    this.weaponMesh.rotation.z = 0.2 - ease * 0.2;
                    this.weaponMesh.position.y = -0.45 + ease * 0.1;
                    this.weaponMesh.position.z = -0.6 + ease * 0.05;
                    if (t >= 1) { this.swingPhase = 0; this.swingTimer = 0; }
                }
            } else {
                // Sword: horizontal slash
                const slashSpeed = 6;
                if (this.swingPhase === 1) {
                    // Wind up - pull right
                    const t = Math.min(this.swingTimer * slashSpeed, 1);
                    const ease = t * t;
                    this.weaponMesh.rotation.z = ease * 0.6;
                    this.weaponMesh.rotation.y = ease * -0.3;
                    this.weaponMesh.position.x = 0.45 + ease * 0.15;
                    this.weaponMesh.position.y = -0.35 + ease * 0.15;
                    if (t >= 1) { this.swingPhase = 2; this.swingTimer = 0; }
                } else if (this.swingPhase === 2) {
                    // Slash across - fast diagonal
                    const t = Math.min(this.swingTimer * slashSpeed * 2.5, 1);
                    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    this.weaponMesh.rotation.z = 0.6 - ease * 1.8;
                    this.weaponMesh.rotation.x = ease * -0.4;
                    this.weaponMesh.rotation.y = -0.3 + ease * 0.6;
                    this.weaponMesh.position.x = 0.6 - ease * 0.5;
                    this.weaponMesh.position.y = -0.2 - ease * 0.15;
                    if (t >= 1) {
                        this.swingPhase = 3; this.swingTimer = 0;
                        this.shakeIntensity = 0.03;
                        this.shakeTimer = 0.08;
                    }
                } else if (this.swingPhase === 3) {
                    // Follow through
                    const t = Math.min(this.swingTimer * slashSpeed * 1.5, 1);
                    const ease = 1 - Math.pow(1 - t, 3);
                    this.weaponMesh.rotation.z = -1.2 + ease * 1.2;
                    this.weaponMesh.rotation.x = -0.4 + ease * 0.4;
                    this.weaponMesh.rotation.y = 0.3 - ease * 0.3;
                    this.weaponMesh.position.x = 0.1 + ease * 0.35;
                    this.weaponMesh.position.y = -0.35;
                    if (t >= 1) { this.swingPhase = 0; this.swingTimer = 0; }
                }
            }
        } else {
            // Idle animation - gentle bob and sway
            const { mx, mz } = this.input.getMovement();
            const isMoving = mx !== 0 || mz !== 0;
            const bobSpeed = isMoving ? 6 : 2;
            const bobAmount = isMoving ? 0.025 : 0.008;
            const swayAmount = isMoving ? 0.04 : 0.015;

            this.weaponMesh.position.x = 0.45 + Math.sin(this.time * bobSpeed * 0.7) * swayAmount;
            this.weaponMesh.position.y = -0.35 + Math.sin(this.time * bobSpeed) * bobAmount;
            this.weaponMesh.position.z = -0.55;
            this.weaponMesh.rotation.x = 0;
            this.weaponMesh.rotation.y = 0;
            this.weaponMesh.rotation.z = Math.sin(this.time * bobSpeed * 0.5) * 0.02;
        }

        // Animate weapon effects (flames, runes)
        if (this.weaponMesh) {
            this.weaponMesh.traverse((child) => {
                if (child.userData?.isWeaponFlame) {
                    child.position.y = 0.5 + child.userData.idx * 0.08 + Math.sin(this.time * 10 + child.userData.idx) * 0.04;
                    child.scale.setScalar(0.8 + Math.sin(this.time * 12 + child.userData.idx * 2) * 0.3);
                }
                if (child.userData?.isRune) {
                    child.material.opacity = 0.4 + Math.sin(this.time * 3 + child.userData.idx * 1.5) * 0.3;
                }
            });
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
                    (item) => {
                        this.player.inventory.equip(item);
                        if (item.type === ITEM_TYPE.WEAPON) {
                            this._createWeaponMesh(item.id);
                        }
                    },
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
