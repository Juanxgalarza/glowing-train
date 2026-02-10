// ============================================================
// PARTICLE SYSTEM - Visual effects for hits, steps, etc.
// ============================================================

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.meshes = [];
        // Reusable geometries
        this._geoSmall = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        this._geoMed = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        this._geoSpark = new THREE.BoxGeometry(0.04, 0.12, 0.04);
        this._geoDot = new THREE.SphereGeometry(0.04, 4, 4);
    }

    // Burst of colored particles on weapon hit
    spawnHitBurst(x, y, z, color, count) {
        count = count || 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Utils.randFloat(-0.3, 0.3);
            const speed = Utils.randFloat(1.5, 4);
            const vy = Utils.randFloat(1, 3.5);
            this._spawn(x, y, z,
                Math.sin(angle) * speed, vy, Math.cos(angle) * speed,
                color, this._geoSmall, Utils.randFloat(0.3, 0.6), Utils.randFloat(0.7, 1.2));
        }
    }

    // Critical hit: bigger sparks + flash
    spawnCritBurst(x, y, z) {
        for (let i = 0; i < 14; i++) {
            const angle = Utils.randFloat(0, Math.PI * 2);
            const speed = Utils.randFloat(2, 5.5);
            const vy = Utils.randFloat(2, 5);
            const color = Utils.pick([0xffcc00, 0xffaa00, 0xffffff, 0xffee44]);
            this._spawn(x, y, z,
                Math.sin(angle) * speed, vy, Math.cos(angle) * speed,
                color, this._geoSpark, Utils.randFloat(0.4, 0.8), Utils.randFloat(0.6, 1.0));
        }
    }

    // Player takes damage - red splatter
    spawnDamageParticles(x, y, z) {
        for (let i = 0; i < 6; i++) {
            const angle = Utils.randFloat(0, Math.PI * 2);
            const speed = Utils.randFloat(1, 3);
            const color = Utils.pick([0xff0000, 0xcc0000, 0x880000]);
            this._spawn(x, y, z,
                Math.sin(angle) * speed, Utils.randFloat(1, 3), Math.cos(angle) * speed,
                color, this._geoSmall, Utils.randFloat(0.4, 0.7), Utils.randFloat(0.5, 0.9));
        }
    }

    // Footstep dust
    spawnFootstepDust(x, z) {
        for (let i = 0; i < 3; i++) {
            const ox = Utils.randFloat(-0.2, 0.2);
            const oz = Utils.randFloat(-0.2, 0.2);
            this._spawn(x + ox, 0.05, z + oz,
                Utils.randFloat(-0.3, 0.3), Utils.randFloat(0.2, 0.8), Utils.randFloat(-0.3, 0.3),
                0x888877, this._geoDot, Utils.randFloat(0.5, 1.0), Utils.randFloat(0.4, 0.7));
        }
    }

    // Enemy death explosion
    spawnDeathExplosion(x, y, z, color) {
        for (let i = 0; i < 16; i++) {
            const angle = Utils.randFloat(0, Math.PI * 2);
            const speed = Utils.randFloat(2, 6);
            const vy = Utils.randFloat(1, 5);
            const c = Utils.chance(0.5) ? color : 0x222222;
            this._spawn(x, y, z,
                Math.sin(angle) * speed, vy, Math.cos(angle) * speed,
                c, this._geoMed, Utils.randFloat(0.5, 1.0), Utils.randFloat(0.6, 1.2));
        }
    }

    // Dash trail
    spawnDashTrail(x, y, z) {
        for (let i = 0; i < 4; i++) {
            this._spawn(
                x + Utils.randFloat(-0.2, 0.2),
                y + Utils.randFloat(-0.3, 0.3),
                z + Utils.randFloat(-0.2, 0.2),
                Utils.randFloat(-0.2, 0.2), Utils.randFloat(-0.1, 0.3), Utils.randFloat(-0.2, 0.2),
                0x88aaff, this._geoDot, 0.8, Utils.randFloat(0.2, 0.4)
            );
        }
    }

    // Gold pickup sparkle
    spawnGoldSparkle(x, y, z) {
        for (let i = 0; i < 6; i++) {
            const angle = Utils.randFloat(0, Math.PI * 2);
            this._spawn(x, y, z,
                Math.sin(angle) * 1.5, Utils.randFloat(1.5, 3), Math.cos(angle) * 1.5,
                Utils.pick([0xffcc00, 0xffee44, 0xffffff]), this._geoDot,
                Utils.randFloat(0.4, 0.7), Utils.randFloat(0.4, 0.7));
        }
    }

    // Heal effect (green rising)
    spawnHealEffect(x, y, z) {
        for (let i = 0; i < 8; i++) {
            const angle = Utils.randFloat(0, Math.PI * 2);
            const r = Utils.randFloat(0.3, 0.8);
            this._spawn(
                x + Math.sin(angle) * r, y, z + Math.cos(angle) * r,
                0, Utils.randFloat(1.5, 3), 0,
                Utils.pick([0x44ff44, 0x88ff88, 0x22cc22]), this._geoDot,
                0.6, Utils.randFloat(0.5, 0.8));
        }
    }

    _spawn(x, y, z, vx, vy, vz, color, geo, scale, lifetime) {
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.scale.setScalar(scale);
        this.scene.add(mesh);

        const particle = {
            mesh, vx, vy, vz,
            lifetime, maxLife: lifetime,
            gravity: -6,
            alive: true,
        };
        this.particles.push(particle);
        this.meshes.push(mesh);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (!p.alive) continue;

            p.lifetime -= dt;
            if (p.lifetime <= 0) {
                p.alive = false;
                this.scene.remove(p.mesh);
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            // Physics
            p.vy += p.gravity * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            // Don't go below floor
            if (p.mesh.position.y < 0.02) {
                p.mesh.position.y = 0.02;
                p.vy = 0;
                p.vx *= 0.8;
                p.vz *= 0.8;
            }

            // Fade out
            const life = p.lifetime / p.maxLife;
            p.mesh.material.opacity = life;
            p.mesh.scale.setScalar(p.mesh.scale.x * (0.98 + life * 0.02));

            // Spin
            p.mesh.rotation.x += dt * 5;
            p.mesh.rotation.z += dt * 3;
        }
    }

    clear() {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.material.dispose();
        }
        this.particles = [];
        this.meshes = [];
    }
}
