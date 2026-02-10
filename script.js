// CONFIG & CONSTANTS
const MAP_WIDTH = 8000;
const MAP_HEIGHT = 8000;
const GRID_SIZE = 100;

const CAR_SHOP = [
    { id: 'c1', color: '#ec4899', cost: 0, design: 'default' },
    { id: 'c2', color: '#ef4444', cost: 100, design: 'default' },
    { id: 'c3', color: '#10b981', cost: 200, design: 'default' },
    { id: 'c4', color: '#f59e0b', cost: 500, design: 'sport' },
    { id: 'c5', color: '#8b5cf6', cost: 1000, design: 'sport' },
    { id: 'c6', color: '#ffffff', cost: 2000, design: 'sport' },
    { id: 'c7', color: '#3b82f6', cost: 5000, design: 'sport' },
    { id: 'c8', color: '#000000', cost: 10000, design: 'sport' },
];

const PLANE_SHOP = [
    { id: 'p1', color: '#0ea5e9', cost: 1000 },
    { id: 'p2', color: '#a855f7', cost: 4000 },
    { id: 'p3', color: '#f97316', cost: 7000 },
    { id: 'p4', color: '#22c55e', cost: 10000 },
    { id: 'p5', color: '#ef4444', cost: 17000 },
    { id: 'p6', color: '#ffffff', cost: 20000 },
    { id: 'p7', color: '#facc15', cost: 50000 },
    { id: 'p8', color: '#000000', cost: 100000 },
];

// UTILS
function formatTime(sec) {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// CLASSES
class InputHandler {
    constructor() {
        this.state = { up: false, down: false, left: false, right: false };
        this.onToggle = null;

        window.addEventListener('keydown', e => this.handleKey(e, true));
        window.addEventListener('keyup', e => this.handleKey(e, false));
    }

    handleKey(e, active) {
        switch(e.key.toLowerCase()) {
            case 'w': case 'arrowup': this.state.up = active; break;
            case 's': case 'arrowdown': this.state.down = active; break;
            case 'a': case 'arrowleft': this.state.left = active; break;
            case 'd': case 'arrowright': this.state.right = active; break;
            case ' ': if(active && this.onToggle) this.onToggle(); break;
        }
    }
}

class World {
    constructor() {
        this.width = MAP_WIDTH;
        this.height = MAP_HEIGHT;
        this.gridSize = GRID_SIZE;
        this.hurdles = [];
        this.upgradeApplied = localStorage.getItem('vgame_upgrade') === 'true';
        if(this.upgradeApplied) {
            this.width += 10000;
            this.height += 10000;
        }
        this.spawnHurdles();
    }

    spawnHurdles() {
        const count = this.upgradeApplied ? 800 : 300;
        for (let i = 0; i < count; i++) {
            const typeRoll = Math.random();
            let type, radius;
            if (typeRoll < 0.6) { type = 'tree'; radius = 25; }
            else if (typeRoll < 0.8) { type = 'barrier'; radius = 30; }
            else if (typeRoll < 0.95) { type = 'block'; radius = 35; }
            else { type = 'human'; radius = 15; }

            this.hurdles.push({
                x: Math.random() * (this.width - 200) + 100,
                y: Math.random() * (this.height - 200) + 100,
                type, radius
            });
        }
    }

    render(ctx, camX, camY, w, h) {
        const startCol = Math.floor(camX / this.gridSize);
        const endCol = startCol + Math.ceil(w / this.gridSize) + 1;
        const startRow = Math.floor(camY / this.gridSize);
        const endRow = startRow + Math.ceil(h / this.gridSize) + 1;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const x = c * this.gridSize;
                const y = r * this.gridSize;
                if (x >= 0 && x <= this.width && y >= 0 && y <= this.height) {
                    ctx.strokeRect(x, y, this.gridSize, this.gridSize);
                }
            }
        }

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 20;
        ctx.strokeRect(0, 0, this.width, this.height);

        for (const hurdle of this.hurdles) {
            if (hurdle.x > camX - 100 && hurdle.x < camX + w + 100 &&
                hurdle.y > camY - 100 && hurdle.y < camY + h + 100) {
                this.drawHurdle(ctx, hurdle);
            }
        }
    }

    drawHurdle(ctx, hurdle) {
        ctx.save();
        ctx.translate(hurdle.x, hurdle.y);
        if (hurdle.type === 'tree') {
            ctx.fillStyle = '#059669';
            ctx.beginPath(); ctx.arc(0, 0, hurdle.radius, 0, Math.PI * 2); ctx.fill();
        } else if (hurdle.type === 'barrier') {
            ctx.fillStyle = '#f97316'; ctx.fillRect(-hurdle.radius, -5, hurdle.radius * 2, 10);
        } else if (hurdle.type === 'block') {
            ctx.fillStyle = '#64748b'; ctx.fillRect(-15, -15, 30, 30);
        } else {
            ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Vehicle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.angle = 0; this.speed = 0;
        this.mode = 'car'; this.altitude = 0; this.targetAltitude = 0;
        this.color = '#ec4899'; this.design = 'default';
    }

    update(input, world) {
        const accel = this.mode === 'car' ? 0.2 : 0.4;
        const friction = this.mode === 'car' ? 0.96 : 0.99;
        const max = this.mode === 'car' ? 8 : 16;
        const turn = this.mode === 'car' ? 0.05 : 0.04;

        if (input.up) this.speed += accel;
        if (input.down) this.speed -= accel;
        this.speed *= friction;
        if (Math.abs(this.speed) > max) this.speed = Math.sign(this.speed) * max;
        if (Math.abs(this.speed) < 0.1) this.speed = 0;

        if (Math.abs(this.speed) > 0.5) {
            let dir = input.left ? -1 : (input.right ? 1 : 0);
            if (this.speed < 0) dir = -dir;
            this.angle += dir * turn;
        }

        const nextX = this.x + Math.sin(this.angle) * this.speed;
        const nextY = this.y - Math.cos(this.angle) * this.speed;

        let collided = false;
        if (this.altitude < 0.4) {
            for (const h of world.hurdles) {
                const distSq = (nextX - h.x)**2 + (nextY - h.y)**2;
                if (distSq < (h.radius + 15)**2) {
                    collided = true; this.speed *= -0.4;
                    break;
                }
            }
        }

        if (!collided) { this.x = nextX; this.y = nextY; }
        this.altitude += (this.targetAltitude - this.altitude) * 0.1;

        const margin = 30;
        if (this.x < margin) { this.x = margin; this.speed *= -0.2; }
        if (this.y < margin) { this.y = margin; this.speed *= -0.2; }
        if (this.x > world.width - margin) { this.x = world.width - margin; this.speed *= -0.2; }
        if (this.y > world.height - margin) { this.y = world.height - margin; this.speed *= -0.2; }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const sOff = 10 + (this.altitude * 40);
        ctx.save();
        ctx.translate(sOff * 0.5, sOff * 0.5);
        this.drawShape(ctx, 'rgba(0,0,0,0.3)');
        ctx.restore();
        const fScale = 1 + (this.altitude * 0.15);
        ctx.scale(fScale, fScale);
        this.drawShape(ctx, this.color);
        ctx.restore();
    }

    drawShape(ctx, color) {
        ctx.fillStyle = color;
        if (this.mode === 'car' || this.altitude < 0.5) {
            ctx.beginPath(); ctx.roundRect(-18, -35, 36, 70, 8); ctx.fill();
        } else {
            ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-60, 40); ctx.lineTo(60, 40); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, 0, 15, 50, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
}

// MAIN ENGINE
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputHandler();
        this.world = new World();
        this.vehicle = new Vehicle(this.world.width/2, this.world.height/2);
        
        this.points = Number(localStorage.getItem('vgame_points')) || 0;
        this.playtime = Number(localStorage.getItem('vgame_playtime')) || 0;
        this.lastTime = Date.now();

        this.input.onToggle = () => {
            this.vehicle.mode = this.vehicle.mode === 'car' ? 'plane' : 'car';
            this.vehicle.targetAltitude = this.vehicle.mode === 'plane' ? 1 : 0;
            updateHUD();
        };

        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.loadSkin();
    }

    loadSkin() {
        const s = JSON.parse(localStorage.getItem('vgame_current_skin') || '{"color":"#ec4899"}');
        this.vehicle.color = s.color;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        this.loop();
    }

    loop() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.playtime += dt;
        this.points += dt * (10 / 86400);

        this.vehicle.update(this.input.state, this.world);
        
        const camX = this.vehicle.x - this.canvas.width/2;
        const camY = this.vehicle.y - this.canvas.height/2;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-camX, -camY);
        this.world.render(this.ctx, camX, camY, this.canvas.width, this.canvas.height);
        this.vehicle.render(this.ctx);
        this.ctx.restore();

        if(Math.floor(this.playtime) % 5 === 0) {
            localStorage.setItem('vgame_points', this.points);
            localStorage.setItem('vgame_playtime', this.playtime);
        }

        requestAnimationFrame(() => this.loop());
    }
}

// UI & INITIALIZATION
const engine = new GameEngine();
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if(isMobile) document.getElementById('mobile-controls').classList.remove('hidden');

function updateHUD() {
    document.getElementById('speed-val').innerText = Math.abs(Math.round(engine.vehicle.speed * 10));
    document.getElementById('time-val').innerText = formatTime(engine.playtime);
    document.getElementById('points-val').innerText = Math.floor(engine.points);
    const tag = document.getElementById('mode-indicator');
    tag.className = `mode-tag ${engine.vehicle.mode}`;
    document.getElementById('mode-icon').innerText = engine.vehicle.mode === 'car' ? '🚗' : '✈️';
    document.getElementById('mode-text').innerText = engine.vehicle.mode.toUpperCase();
}

setInterval(updateHUD, 100);

// SHOP LOGIC
const shopOverlay = document.getElementById('shop-overlay');
const owned = JSON.parse(localStorage.getItem('vgame_owned') || '["c1"]');

function renderShop() {
    const renderList = (id, list) => {
        const el = document.getElementById(id);
        el.innerHTML = list.map(item => `
            <button class="skin-btn ${owned.includes(item.id) ? 'owned' : ''}" onclick="buyItem('${item.id}')">
                <div class="swatch" style="background:${item.color}"></div>
                <div class="cost">${owned.includes(item.id) ? 'OWNED' : item.cost + ' PTS'}</div>
            </button>
        `).join('');
    };
    renderList('car-list', CAR_SHOP);
    renderList('plane-list', PLANE_SHOP);
}

window.buyItem = (id) => {
    const item = [...CAR_SHOP, ...PLANE_SHOP].find(x => x.id === id);
    if(owned.includes(id)) {
        localStorage.setItem('vgame_current_skin', JSON.stringify(item));
        engine.loadSkin();
        return;
    }
    if(engine.points >= item.cost) {
        engine.points -= item.cost;
        owned.push(id);
        localStorage.setItem('vgame_owned', JSON.stringify(owned));
        localStorage.setItem('vgame_current_skin', JSON.stringify(item));
        engine.loadSkin();
        renderShop();
    }
};

document.getElementById('shop-btn').onclick = () => { shopOverlay.classList.remove('hidden'); renderShop(); };
document.getElementById('close-shop').onclick = () => shopOverlay.classList.add('hidden');
document.getElementById('buy-upgrade').onclick = () => {
    if(engine.points >= 8000 && !engine.world.upgradeApplied) {
        engine.points -= 8000;
        localStorage.setItem('vgame_upgrade', 'true');
        location.reload();
    }
};

// MOBILE EVENTS
const bindTouch = (id, key) => {
    const btn = document.getElementById(id);
    btn.ontouchstart = (e) => { e.preventDefault(); engine.input.state[key] = true; };
    btn.ontouchend = (e) => { e.preventDefault(); engine.input.state[key] = false; };
};
bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');
bindTouch('btn-gas', 'up'); bindTouch('btn-brake', 'down');
document.getElementById('mode-swap').ontouchstart = (e) => { e.preventDefault(); engine.input.onToggle(); };

engine.start();
