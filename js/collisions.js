const canvas = document.getElementById("collisionCanvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

const sliders = {
    mass1: $("mass1"), mass2: $("mass2"),
    velocity1: $("velocity1"), velocity2: $("velocity2"),
    restitution: $("restitution")
};
const statusEl = $("status");

const SPEED = 6;          // screen pixels per second for each 1 m/s
const COL1 = ["#a99fff", "#5145bd"], COL2 = ["#70e5ff", "#267b9c"];

let W = 0, H = 0;
let phase = "ready";      // ready | running | done
let collided = false;
let ball1, ball2;
let rings = [], sparks = [];
let pos1 = 0.2, pos2 = 0.8, drag = null;   // start positions (fraction of width)
let last = performance.now();

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (phase === "ready") createBalls();
}

function getValues() {
    return {
        m1: Number(sliders.mass1.value), m2: Number(sliders.mass2.value),
        v1: Number(sliders.velocity1.value), v2: Number(sliders.velocity2.value),
        e: Number(sliders.restitution.value)
    };
}

/* 1D collision with coefficient of restitution */
function finalVelocities(v) {
    const p = v.m1 * v.v1 + v.m2 * v.v2, M = v.m1 + v.m2;
    return {
        v1: (p - v.m2 * v.e * (v.v1 - v.v2)) / M,
        v2: (p + v.m1 * v.e * (v.v1 - v.v2)) / M
    };
}

/* ---------- readouts ---------- */
function updateCalculations() {
    const v = getValues(), f = finalVelocities(v);
    const p = v.m1 * v.v1 + v.m2 * v.v2;
    const pAfter = v.m1 * f.v1 + v.m2 * f.v2;
    const ke = 0.5 * v.m1 * v.v1 ** 2 + 0.5 * v.m2 * v.v2 ** 2;
    const keAfter = 0.5 * v.m1 * f.v1 ** 2 + 0.5 * v.m2 * f.v2 ** 2;

    $("mass1Value").textContent = v.m1;
    $("mass2Value").textContent = v.m2;
    $("velocity1Value").textContent = v.v1;
    $("velocity2Value").textContent = v.v2;
    $("restitutionValue").textContent = v.e.toFixed(1);
    $("currentRestitution").textContent = v.e.toFixed(1);
    $("totalMomentum").textContent = p.toFixed(2);
    $("kineticEnergy").textContent = ke.toFixed(2);
    $("finalVelocity1").textContent = f.v1.toFixed(2);
    $("finalVelocity2").textContent = f.v2.toFixed(2);
    $("deltaMomentum").textContent = (pAfter - p).toFixed(2);
    $("energyChange").textContent = (keAfter - ke).toFixed(2);
    $("impulse").textContent = Math.abs(v.m1 * (f.v1 - v.v1)).toFixed(2);
}

function setStatus(text, color) {
    statusEl.textContent = "● " + text;
    statusEl.style.color = color;
}

/* ---------- setup ---------- */
function radiusFor(m) { return 14 + 6 * Math.sqrt(m); }   // heavier balls look bigger

function createBalls() {
    const v = getValues();
    const r1 = radiusFor(v.m1), r2 = radiusFor(v.m2);
    const floorY = H * 0.62;
    ball1 = { x: W * pos1, y: floorY - r1, r: r1, v: v.v1, m: v.m1, trail: [] };
    ball2 = { x: W * pos2, y: floorY - r2, r: r2, v: v.v2, m: v.m2, trail: [] };
}

/* ---------- drawing ---------- */
function drawScene() {
    const floorY = H * 0.62;
    const g = ctx.createLinearGradient(0, floorY, 0, H);
    g.addColorStop(0, "rgba(113,101,232,0.18)");
    g.addColorStop(1, "rgba(113,101,232,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = "#3a4361";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, floorY); ctx.lineTo(W - 20, floorY); ctx.stroke();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "#252d40";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2, 90); ctx.lineTo(W / 2, floorY); ctx.stroke();
    ctx.setLineDash([]);
}

function drawTrail(b, color) {
    b.trail.forEach((p, i) => {
        ctx.globalAlpha = (i / b.trail.length) * 0.35;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p, b.y, b.r * (0.4 + 0.6 * i / b.trail.length), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawBall(b, n, cols) {
    drawTrail(b, cols[0]);
    ctx.save();
    ctx.shadowColor = cols[0];
    ctx.shadowBlur = 22;
    const g = ctx.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, 2, b.x, b.y, b.r);
    g.addColorStop(0, cols[0]);
    g.addColorStop(1, cols[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(n, b.x, b.y);

    // shadow + labels
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(b.x, H * 0.62 + 4, b.r * 0.9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8992a3"; ctx.font = "12px Arial"; ctx.textBaseline = "alphabetic";
    ctx.fillText(b.m + " kg", b.x, H * 0.62 + 28);

    // velocity arrow with value (drag the handle in READY to change it)
    const t = arrowTip(b);
    const d = Math.sign(b.v);
    ctx.strokeStyle = cols[0]; ctx.fillStyle = cols[0]; ctx.lineWidth = 3;
    if (d !== 0) {
        ctx.beginPath(); ctx.moveTo(b.x, t.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t.x + d * 2, t.y); ctx.lineTo(t.x - d * 8, t.y - 6); ctx.lineTo(t.x - d * 8, t.y + 6); ctx.fill();
    }
    if (phase === "ready") {
        ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#0a0e17"; ctx.fill();
        ctx.strokeStyle = cols[0]; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = "#fff"; ctx.font = "12px Arial"; ctx.textAlign = "center";
    ctx.fillText("v = " + b.v.toFixed(1) + " m/s", b.x, t.y - 14);
}

function arrowTip(b) {
    const d = Math.sign(b.v);
    return { x: d === 0 ? b.x : b.x + d * (b.r + 8 + Math.abs(b.v) * 1.6), y: b.y - b.r - 22 };
}

function drawMomentumBars() {
    const p1 = ball1.m * ball1.v, p2 = ball2.m * ball2.v, pt = p1 + p2;
    const cx = W / 2, scale = Math.min(W * 0.35, 220) / 5000;
    const rows = [["p₁", p1, COL1[0]], ["p₂", p2, COL2[0]], ["Σp", pt, "#ffffff"]];
    ctx.font = "11px Arial"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#8992a3"; ctx.textAlign = "center";
    ctx.fillText("MOMENTUM", cx, 14);
    ctx.strokeStyle = "#30384b"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 24); ctx.lineTo(cx, 24 + rows.length * 18); ctx.stroke();
    rows.forEach(([label, val, col], i) => {
        const y = 34 + i * 18;
        ctx.fillStyle = col; ctx.globalAlpha = 0.85;
        ctx.fillRect(val >= 0 ? cx : cx + val * scale, y - 5, Math.abs(val) * scale, 10);
        ctx.globalAlpha = 1;
        ctx.textAlign = "right"; ctx.fillStyle = "#8992a3";
        ctx.fillText(label, cx - Math.min(W * 0.35, 220) - 8, y);
        ctx.textAlign = "left"; ctx.fillStyle = "#fff";
        ctx.fillText(val.toFixed(0), cx + Math.min(W * 0.35, 220) + 8, y);
    });
    ctx.textBaseline = "alphabetic";
}

function drawEffects(dt) {
    rings = rings.filter((r) => r.t < 1);
    rings.forEach((r) => {
        r.t += dt * 2;
        ctx.strokeStyle = "rgba(255,255,255," + (1 - r.t) + ")";
        ctx.lineWidth = 3 * (1 - r.t) + 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, 10 + r.t * 70, 0, Math.PI * 2); ctx.stroke();
    });
    sparks = sparks.filter((s) => s.life > 0);
    sparks.forEach((s) => {
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; s.life -= dt;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = "#ffe9a8";
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
}

/* ---------- simulation ---------- */
function collide() {
    collided = true;
    const v = getValues();
    const f = finalVelocities({ m1: ball1.m, m2: ball2.m, v1: ball1.v, v2: ball2.v, e: v.e });
    ball1.v = f.v1; ball2.v = f.v2;

    const overlap = ball1.r + ball2.r - (ball2.x - ball1.x);
    const M = ball1.m + ball2.m;
    ball1.x -= overlap * ball2.m / M;
    ball2.x += overlap * ball1.m / M;

    const cx = ball1.x + ball1.r, cy = ball1.y;
    rings.push({ x: cx, y: cy, t: 0 });
    for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 160;
        sparks.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.6 + Math.random() * 0.4 });
    }
    setStatus("COLLISION", "#887cff");
}

function step(dt) {
    [ball1, ball2].forEach((b) => {
        b.x += b.v * SPEED * dt;
        b.trail.push(b.x);
        if (b.trail.length > 16) b.trail.shift();
    });
    if (!collided && ball2.x - ball1.x <= ball1.r + ball2.r && ball1.v > ball2.v) collide();

    const offscreen = (b) => b.x < -b.r - 20 || b.x > W + b.r + 20;
    if ((offscreen(ball1) && offscreen(ball2)) || (collided && ball1.v <= ball2.v && Math.abs(ball2.x - ball1.x) > W)) {
        phase = "done";
        setStatus("COMPLETE", "#62e6a4");
    }
    // balls separating without ever colliding, or both stopped
    if (!collided && ball1.v <= ball2.v) setStatus("NO COLLISION", "#ffd166");
    if (ball1.v === 0 && ball2.v === 0) phase = "done";
}

function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (phase === "running") step(dt);
    ctx.clearRect(0, 0, W, H);
    drawScene();
    drawMomentumBars();
    drawBall(ball1, 1, COL1);
    drawBall(ball2, 2, COL2);
    drawEffects(dt);
    requestAnimationFrame(frame);
}

/* ---------- controls ---------- */
function startSimulation() {
    if (phase === "running") return;
    if (phase === "done") resetSimulation();
    createBalls();
    collided = false;
    phase = "running";
    setStatus("RUNNING", "#ffd166");
    $("startBtn").textContent = "● Running";
}

function resetSimulation() {
    phase = "ready";
    collided = false;
    rings = []; sparks = [];
    pos1 = 0.2; pos2 = 0.8;
    createBalls();
    updateCalculations();
    setStatus("READY", "#62e6a4");
    $("startBtn").textContent = "▶ Start";
}

Object.values(sliders).forEach((s) => s.addEventListener("input", () => {
    updateCalculations();
    if (phase === "ready") createBalls();
}));

$("startBtn").addEventListener("click", startSimulation);
$("resetBtn").addEventListener("click", resetSimulation);
/* ---------- dragging (only before the run starts) ---------- */
function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hit(p) {
    const balls = [[ball1, 1], [ball2, 2]];
    for (const [b, n] of balls) {
        const t = arrowTip(b);
        if (Math.hypot(p.x - t.x, p.y - t.y) < 16) return { kind: "arrow", n };
    }
    for (const [b, n] of balls) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 4) return { kind: "ball", n };
    }
    return null;
}

canvas.addEventListener("pointerdown", (e) => {
    if (phase !== "ready") return;
    drag = hit(pointer(e));
    if (drag) canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
    const p = pointer(e);
    if (!drag) {
        canvas.style.cursor = phase === "ready" && hit(p) ? "grab" : "default";
        return;
    }
    const b = drag.n === 1 ? ball1 : ball2;
    if (drag.kind === "ball") {
        const gap = ball1.r + ball2.r + 10;
        if (drag.n === 1) pos1 = Math.max(b.r + 10, Math.min(p.x, ball2.x - gap)) / W;
        else pos2 = Math.min(W - b.r - 10, Math.max(p.x, ball1.x + gap)) / W;
    } else {
        const dx = p.x - b.x, len = Math.abs(dx) - b.r - 8;
        const v = Math.sign(dx) * Math.max(0, len) / 1.6;
        sliders[drag.n === 1 ? "velocity1" : "velocity2"].value = Math.max(-100, Math.min(100, Math.round(v)));
    }
    updateCalculations();
    createBalls();
});

["pointerup", "pointercancel"].forEach((t) => canvas.addEventListener(t, () => { drag = null; }));

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateCalculations();
requestAnimationFrame(frame);