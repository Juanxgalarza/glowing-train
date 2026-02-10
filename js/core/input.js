// ============================================================
// INPUT MANAGER
// ============================================================

class InputManager {
    constructor() {
        this.keys = {};
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.locked = false;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }

    _onKeyDown(e) {
        this.keys[e.code] = true;
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
    }

    _onMouseDown(e) {
        if (e.button === 0) this.mouseDown = true;
    }

    _onMouseUp(e) {
        if (e.button === 0) this.mouseDown = false;
    }

    _onMouseMove(e) {
        if (this.locked) {
            this.mouseDX += e.movementX || 0;
            this.mouseDY += e.movementY || 0;
        }
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    _onPointerLockChange() {
        this.locked = !!document.pointerLockElement;
    }

    requestPointerLock(canvas) {
        canvas.requestPointerLock();
    }

    exitPointerLock() {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    consumeMouseDelta() {
        const dx = this.mouseDX;
        const dy = this.mouseDY;
        this.mouseDX = 0;
        this.mouseDY = 0;
        return { dx, dy };
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        if (this.keys[code]) {
            this.keys[code] = false;
            return true;
        }
        return false;
    }

    getMovement() {
        let mx = 0, mz = 0;
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) mz = 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown')) mz = -1;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) mx = -1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) mx = 1;
        return { mx, mz };
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    }
}
