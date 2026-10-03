const $ = id => document.getElementById(id);
const canvas = $("mechanicsCanvas"), ctx = canvas.getContext("2d");
const gCanvas = $("graphCanvas"), gctx = gCanvas.getContext("2d");

const mass = $("mass"), appliedForce = $("appliedForce"), friction = $("friction"),
      velocity = $("velocity");
const startBtn = $("startBtn"), resetBtn = $("resetBtn"), pushBtn = $("pushBtn");

const groundHeight = 70, boxW = 70, boxH = 50, PX_PER_M = 14;
const boxScreenX = () => canvas.width * 0.3;

let v = 0, x = 0, t = 0;
let running = false, pushOn = true, started = false;
let animationId, lastTime = 0;
let samples = [];

/* ---------- surface themes ---------- */
const SURFACES = {
    ice:      { name: "ICE",      mu: 0.03, accent: "#5ec8ff", top: "#eaf8ff", g1: "#a9dcf5", g2: "#5f9fc8", tick: "rgba(10,40,70,0.6)",    ink: "#0b2a45" },
    wood:     { name: "WOOD",     mu: 0.20, accent: "#d9a066", top: "#b07a40", g1: "#7a4e26", g2: "#53331a", tick: "rgba(255,230,190,0.5)", ink: "#f3d9b1" },
    concrete: { name: "CONCRETE", mu: 0.50, accent: "#9aa4b2", top: "#c3c9d2", g1: "#5b616b", g2: "#3b4048", tick: "rgba(255,255,255,0.4)", ink: "#e1e5ea" },
    rubber:   { name: "RUBBER",   mu: 0.85, accent: "#ff6b4a", top: "#ff6b4a", g1: "#26262b", g2: "#141417", tick: "rgba(255,255,255,0.35)", ink: "#c9c9d1" }
};
let surface = "wood";
const S = () => SURFACES[surface];

function applyTheme(name) {
    surface = name;
    document.querySelectorAll("#surfaceChips .chip").forEach(c => c.classList.toggle("on", c.dataset.s === name));
}

function nearestSurface(m) {
    return Object.keys(SURFACES).reduce((a, b) =>
        Math.abs(SURFACES[a].mu - m) <= Math.abs(SURFACES[b].mu - m) ? a : b);
}

/* ---------- helpers ---------- */
const g = () => 9.81;   // Earth gravity (m/s²)
const mu = () => Number(friction.value) / 100;

function forces() {
    const m = Number(mass.value);
    const W = m * g();
    const fk = mu() * W;                       // friction limit (μ·N)
    const F = pushOn ? Number(appliedForce.value) : 0;
    let net, fActing;
    if (v <= 0.001) {                          // at rest: static friction
        if (F <= fk) { net = 0; fActing = F; }
        else { net = F - fk; fActing = fk; }
    } else {                                   // moving: kinetic friction
        net = F - fk; fActing = fk;
    }
    return { m, W, fk, F, net, fActing, a: net / m };
}

function setStatus(text, cls = "") {
    const s = $("status");
    s.textContent = "● " + text;
    s.className = "status " + cls;
}

/* ---------- UI text ---------- */
function updateLabels() {
    $("massValue").textContent = mass.value;
    $("forceValue").textContent = appliedForce.value;
    $("frictionValue").textContent = mu().toFixed(2);
    $("velocityValue").textContent = velocity.value;
}

function updateReadouts() {
    const f = forces();
    $("netForce").textContent = f.net.toFixed(1);
    $("acceleration").textContent = f.a.toFixed(2);
    $("currentVelocity").textContent = v.toFixed(2);
    $("distance").textContent = x.toFixed(2);
    $("weight").textContent = f.W.toFixed(1);
    $("frictionForce").textContent = f.fk.toFixed(1);
    $("ke").textContent = (0.5 * f.m * v * v).toFixed(1);
    $("time").textContent = t.toFixed(2);

    let msg;
    if (v <= 0.001 && f.F <= f.fk && f.F > 0)
        msg = `The push (${f.F} N) is not bigger than maximum friction (${f.fk.toFixed(1)} N), so the block stays still. Increase force or lower μ.`;
    else if (!pushOn && v > 0.001)
        msg = "Force released: only friction acts now, so the block slows down (Newton's first law in action).";
    else if (f.net > 0)
        msg = `Net force = ${f.F} − ${f.fk.toFixed(1)} = ${f.net.toFixed(1)} N, so a = ${f.net.toFixed(1)} ÷ ${f.m} = ${f.a.toFixed(2)} m/s².`;
    else if (f.net < 0)
        msg = `Friction is bigger than the push, so the block decelerates at ${Math.abs(f.a).toFixed(2)} m/s².`;
    else msg = "Forces are balanced: the block moves at constant velocity.";
    $("note").textContent = msg;
}

/* ---------- drawing ---------- */
function resizeCanvas() {
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    gCanvas.width = gCanvas.clientWidth; gCanvas.height = gCanvas.clientHeight;
    draw(); drawGraph();
}

function drawGround() {
    const T = S(), w = canvas.width, gy = canvas.height - groundHeight;
    const off = -x * PX_PER_M + boxScreenX() + boxW / 2;      // world -> screen shift
    const mod = (a, n) => ((a % n) + n) % n;

    const grd = ctx.createLinearGradient(0, gy, 0, gy + groundHeight);
    grd.addColorStop(0, T.g1); grd.addColorStop(1, T.g2);
    ctx.fillStyle = grd; ctx.fillRect(0, gy, w, groundHeight);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, gy, w, groundHeight); ctx.clip();

    if (surface === "ice") {
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;          // shine streaks
        for (let px = mod(off, 80) - 80; px < w; px += 80) {
            ctx.beginPath(); ctx.moveTo(px, gy + 6); ctx.lineTo(px + 34, gy + 44); ctx.stroke();
        }
        ctx.strokeStyle = "rgba(40,90,140,0.45)"; ctx.lineWidth = 1.5;          // cracks
        for (let px = mod(off, 230) - 230; px < w; px += 230) {
            ctx.beginPath(); ctx.moveTo(px, gy + 10); ctx.lineTo(px + 14, gy + 28);
            ctx.lineTo(px + 6, gy + 40); ctx.lineTo(px + 24, gy + 58); ctx.stroke();
        }
    } else if (surface === "wood") {
        ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;                // grain
        [20, 38, 54].forEach(y => { ctx.beginPath(); ctx.moveTo(0, gy + y); ctx.lineTo(w, gy + y); ctx.stroke(); });
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2;                 // plank seams
        for (let px = mod(off, 130) - 130; px < w; px += 130) {
            ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + groundHeight); ctx.stroke();
        }
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;               // knots
        for (let px = mod(off + 60, 260) - 260; px < w; px += 260) {
            ctx.beginPath(); ctx.ellipse(px, gy + 32, 9, 5, 0, 0, 7); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(px, gy + 32, 4, 2, 0, 0, 7); ctx.stroke();
        }
    } else if (surface === "concrete") {
        ctx.fillStyle = "rgba(255,255,255,0.12)";                               // speckles
        const c0 = Math.floor(-off / 24) - 1, c1 = Math.ceil((w - off) / 24) + 1;
        for (let i = c0; i <= c1; i++) {
            const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
            const r2 = Math.abs(Math.sin(i * 78.233) * 12345.6789) % 1;
            ctx.fillRect(off + i * 24 + r * 20, gy + 8 + r2 * (groundHeight - 16), 2, 2);
        }
        ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 3;                // expansion joints
        for (let px = mod(off, 210) - 210; px < w; px += 210) {
            ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + groundHeight); ctx.stroke();
        }
    } else {
        ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 3;                // tread chevrons
        for (let px = mod(off, 28) - 28; px < w; px += 28) {
            [14, 42].forEach(y => {
                ctx.beginPath(); ctx.moveTo(px, gy + y - 8); ctx.lineTo(px + 14, gy + y + 6);
                ctx.lineTo(px + 28, gy + y - 8); ctx.stroke();
            });
        }
    }
    ctx.restore();

    ctx.strokeStyle = T.top; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();

    // ruler
    const m0 = Math.max(0, Math.floor(-off / PX_PER_M)), m1 = Math.ceil((w - off) / PX_PER_M);
    ctx.font = "bold 11px Arial"; ctx.textAlign = "center";
    for (let m = m0; m <= m1; m++) {
        const px = off + m * PX_PER_M, big = m % 5 === 0;
        ctx.strokeStyle = T.tick; ctx.lineWidth = big ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + (big ? 14 : 7)); ctx.stroke();
        if (big) { ctx.fillStyle = T.ink; ctx.fillText(m + " m", px, gy + 28); }
    }
    const sx = off;                                                              // start line
    if (sx > -5 && sx < w + 5) {
        ctx.strokeStyle = "#62e6a4"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(sx, gy - 60); ctx.lineTo(sx, gy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#62e6a4"; ctx.fillText("START", sx, gy - 66);
    }
}

function drawArrow(x1, y1, x2, y2, label, color, labelDy = -12) {
    if (Math.hypot(x2 - x1, y2 - y1) < 4) return;
    const head = 10, ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "12px Arial"; ctx.textAlign = "center";
    ctx.fillText(label, (x1 + x2) / 2, y1 + labelDy);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround();
    const f = forces();
    const bx = boxScreenX(), by = canvas.height - groundHeight - boxH;
    const cy = by + boxH / 2;

    // motion streaks
    if (v > 1) {
        ctx.strokeStyle = "rgba(136,124,255,0.25)"; ctx.lineWidth = 2;
        const len = Math.min(v * 3, 90);
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(bx - 8, by + 10 + i * 15); ctx.lineTo(bx - 8 - len, by + 10 + i * 15); ctx.stroke();
        }
    }

    // box
    ctx.shadowColor = "rgba(113,101,232,0.5)"; ctx.shadowBlur = 18;
    ctx.fillStyle = "#7165e8"; ctx.fillRect(bx, by, boxW, boxH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#a79fff"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, boxW, boxH);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center";
    ctx.fillText(f.m + " kg", bx + boxW / 2, cy + 5);

    // forces
    const fl = Math.min(f.F / 500 * 150, 150);
    const fr = Math.min(f.fActing / 500 * 150, 150);
    drawArrow(bx + boxW, cy, bx + boxW + fl, cy, "Force " + f.F + " N", "#62e6a4");
    drawArrow(bx, cy + 12, bx - fr, cy + 12, "Friction " + f.fActing.toFixed(0) + " N", "#ff8e9e", 26);
    const wl = Math.min(f.W / 1000 * 70 + 18, 70);
    drawArrow(bx + boxW / 2 + 12, by + boxH, bx + boxW / 2 + 12, by + boxH + Math.min(wl, groundHeight - 22), "W", "#ffd166", 0);
    drawArrow(bx + boxW / 2 - 12, by, bx + boxW / 2 - 12, by - Math.min(wl, 60), "N", "#5ec8ff", 0);

    // speed readout above box
    ctx.fillStyle = "#c9ceff"; ctx.font = "13px Arial"; ctx.textAlign = "left";
    ctx.fillText(`v = ${v.toFixed(1)} m/s   x = ${x.toFixed(1)} m`, 14, 24);
}

function drawGraph() {
    const w = gCanvas.width, h = gCanvas.height, pad = 8;
    gctx.clearRect(0, 0, w, h);
    gctx.strokeStyle = "rgba(255,255,255,0.07)"; gctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { gctx.beginPath(); gctx.moveTo(0, h * i / 4); gctx.lineTo(w, h * i / 4); gctx.stroke(); }
    if (samples.length < 2) return;
    const tMax = Math.max(samples[samples.length - 1].t, 5);
    const vMax = Math.max(1, ...samples.map(s => s.v)) * 1.1;
    $("graphMax").textContent = "peak " + Math.max(...samples.map(s => s.v)).toFixed(1) + " m/s";
    gctx.strokeStyle = "#62e6a4"; gctx.lineWidth = 2; gctx.beginPath();
    samples.forEach((s, i) => {
        const px = pad + s.t / tMax * (w - 2 * pad), py = h - pad - s.v / vMax * (h - 2 * pad);
        i ? gctx.lineTo(px, py) : gctx.moveTo(px, py);
    });
    gctx.stroke();
}

/* ---------- physics loop ---------- */
function step(dt) {
    const f = forces();
    const vOld = v;
    v += f.a * dt;
    if (v < 0) v = 0;                          // friction cannot reverse motion
    x += (vOld + v) / 2 * dt;                  // average velocity = accurate distance
    t += dt;
    samples.push({ t, v });
    if (samples.length > 3000) samples.shift();

    const nf = forces();
    if (v <= 0.001 && nf.F <= nf.fk && started) {
        v = 0; setStatus("STOPPED", "stop");
    } else setStatus("RUNNING", "run");
}

function animate(ts) {
    if (!running) return;
    if (!lastTime) lastTime = ts;
    let dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    step(dt);
    updateReadouts(); draw(); drawGraph();
    animationId = requestAnimationFrame(animate);
}

/* ---------- controls ---------- */
function refresh() { updateLabels(); updateReadouts(); draw(); }

function reset() {
    running = false; started = false; cancelAnimationFrame(animationId);
    v = Number(velocity.value); x = 0; t = 0; samples = []; lastTime = 0;
    startBtn.textContent = "▶ Start";
    setStatus("READY");
    $("graphMax").textContent = "0 m/s";
    refresh(); drawGraph();
}

startBtn.addEventListener("click", () => {
    if (running) {                             // pause
        running = false; cancelAnimationFrame(animationId);
        startBtn.textContent = "▶ Resume"; setStatus("PAUSED"); return;
    }
    running = true; started = true; lastTime = 0;
    startBtn.textContent = "⏸ Pause";
    animationId = requestAnimationFrame(animate);
});

resetBtn.addEventListener("click", reset);

pushBtn.addEventListener("click", () => {
    pushOn = !pushOn;
    pushBtn.classList.toggle("on", pushOn);
    pushBtn.textContent = pushOn ? "Force: ON (tap to release)" : "Force: OFF (tap to push)";
    refresh();
});

[mass, appliedForce].forEach(el => el.addEventListener("input", refresh));

friction.addEventListener("input", () => {
    applyTheme(nearestSurface(mu()));
    refresh();
});

velocity.addEventListener("input", () => {
    if (!started) v = Number(velocity.value);
    refresh();
});

document.querySelectorAll("#surfaceChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
        friction.value = Number(chip.dataset.mu) * 100;
        applyTheme(chip.dataset.s);
        refresh();
    });
});

window.addEventListener("resize", resizeCanvas);
applyTheme("wood");
resizeCanvas();
reset();