// ============================================================
// PROJECTILE SYSTEM
// ============================================================

class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
        this.meshes = [];
    }

    clear() {
        for (const m of this.meshes) {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        }
        this.projectiles = [];
        this.meshes = [];
    }

    spawn(x, z, angle, speed, damage, owner, type = 'fireball') {
        const proj = {
            x, z,
            y: 1.2,
            vx: Math.sin(angle) * speed,
            vz: Math.cos(angle) * speed,
            damage,
            owner, // 'player' or 'enemy'
            type,
            alive: true,
            lifetime: 3,
            mesh: null,
        };

        this._createMesh(proj, type);
        this.projectiles.push(proj);
        return proj;
    }

    _createMesh(proj, type) {
        let geo, mat;

        switch (type) {
            case 'fireball':
                geo = new THREE.SphereGeometry(0.2, 8, 8);
                mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
                break;
            case 'ice_bolt':
                geo = new THREE.ConeGeometry(0.1, 0.4, 6);
                mat = new THREE.MeshBasicMaterial({ color: 0x44aaff });
                break;
            case 'shadow_bolt':
                geo = new THREE.SphereGeometry(0.25, 8, 8);
                mat = new THREE.MeshBasicMaterial({ color: 0x8844ff });
                break;
            case 'fire_breath':
                geo = new THREE.ConeGeometry(0.3, 0.8, 8);
                mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
                break;
            case 'player_slash':
                geo = new THREE.PlaneGeometry(0.8, 0.2);
                mat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide,
                });
                break;
            default:
                geo = new THREE.SphereGeometry(0.15, 6, 6);
                mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.meshes.push(mesh);
        proj.mesh = mesh;

        // Light for fiery projectiles
        if (type === 'fireball' || type === 'fire_breath') {
            const light = new THREE.PointLight(0xff4400, 1, 5);
            light.position.copy(mesh.position);
            mesh.add(light);
        }
    }

    update(dt, dungeon) {
        for (const proj of this.projectiles) {
            if (!proj.alive) continue;

            proj.lifetime -= dt;
            if (proj.lifetime <= 0) {
                proj.alive = false;
                if (proj.mesh) this.scene.remove(proj.mesh);
                continue;
            }

            proj.x += proj.vx * dt;
            proj.z += proj.vz * dt;

            // Wall collision
            const gx = Math.floor(proj.x / CELL_SIZE);
            const gz = Math.floor(proj.z / CELL_SIZE);
            if (gx < 0 || gx >= dungeon.width || gz < 0 || gz >= dungeon.height ||
                dungeon.grid[gz][gx] === TILE.WALL) {
                proj.alive = false;
                if (proj.mesh) this.scene.remove(proj.mesh);
                continue;
            }

            if (proj.mesh) {
                proj.mesh.position.set(proj.x, proj.y, proj.z);
                proj.mesh.rotation.y += dt * 10;
            }
        }

        // Cleanup dead projectiles
        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    getHittingPlayer(px, pz, radius = 0.5) {
        const hits = [];
        for (const proj of this.projectiles) {
            if (!proj.alive || proj.owner !== 'enemy') continue;
            if (Utils.dist(proj.x, proj.z, px, pz) < radius) {
                proj.alive = false;
                if (proj.mesh) this.scene.remove(proj.mesh);
                hits.push(proj);
            }
        }
        return hits;
    }

    getHittingEnemies(enemies) {
        const hits = [];
        for (const proj of this.projectiles) {
            if (!proj.alive || proj.owner !== 'player') continue;
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                if (Utils.dist(proj.x, proj.z, enemy.x, enemy.z) < enemy.size + 0.3) {
                    proj.alive = false;
                    if (proj.mesh) this.scene.remove(proj.mesh);
                    hits.push({ projectile: proj, enemy });
                    break;
                }
            }
        }
        return hits;
    }
}
