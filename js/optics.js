const canvas = document.getElementById("opticsCanvas");
const ctx = canvas.getContext("2d");

const $ = (id) => document.getElementById(id);
const angle = $("angle");
const rayLength = $("rayLength");
const surface = $("mirrorType");

const GREEN = "#62e6a4";
const VIOLET = "#887cff";
const AMBER = "#ffb86b";
const N_GLASS = 1.5;

let W = 0, H = 0;
let sweeping = false;
let sweepT = Math.asin((30 - 40) / 35) || 0; // start near 30°
let lastTime = performance.now();
let pulseT = 0;

/* ---------- sizing (sharp on high-DPI screens) ---------- */
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ---------- helpers ---------- */
function isGlass() { return surface.value === "glass"; }

function geometry() {
    const deg = Number(angle.value);
    const rad = deg * Math.PI / 180;
    const cx = W / 2;
    const cy = H / 2;
    const L = Math.min(Number(rayLength.value), cy - 28);
    const refr = Math.asin(Math.sin(rad) / N_GLASS);
    return { deg, rad, cx, cy, L, refr };
}

function glowLine(x1, y1, x2, y2, color, width, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.lineWidth = width + 4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1, width - 1);
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
}

function arrowHead(x, y, dx, dy, color, alpha) {
    const a = Math.atan2(dy, dx), h = 13;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - h * Math.cos(a - 0.45), y - h * Math.sin(a - 0.45));
    ctx.lineTo(x - h * Math.cos(a + 0.45), y - h * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/* photon pulses travelling along a ray */
function pulses(x1, y1, x2, y2, color, alpha, phase) {
    const count = 3;
    for (let i = 0; i < count; i++) {
        const t = (phase + i / count) % 1;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        const fade = Math.sin(Math.PI * t) * alpha;
        // short trail
        const tx = x - (x2 - x1) * 0.07;
        const ty = y - (y2 - y1) * 0.07;
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, color);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = g;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

/* ---------- scene ---------- */
function drawSurface(g) {
    const left = 40, right = W - 40;

    if (isGlass()) {
        const fill = ctx.createLinearGradient(0, g.cy, 0, H);
        fill.addColorStop(0, "rgba(95,212,255,0.20)");
        fill.addColorStop(1, "rgba(95,212,255,0.03)");
        ctx.fillStyle = fill;
        ctx.fillRect(left, g.cy, right - left, H - g.cy - 20);
        ctx.strokeStyle = "rgba(95,212,255,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(left, g.cy); ctx.lineTo(right, g.cy); ctx.stroke();
        ctx.fillStyle = "#7fa9bd";
        ctx.font = "12px Sora, Arial";
        ctx.textAlign = "center";
        ctx.fillText("GLASS  n = 1.5", g.cx + 110, g.cy + 36);
        ctx.fillText("AIR  n = 1.0", g.cx + 110, g.cy - 14);
        return;
    }

    const grad = ctx.createLinearGradient(left, 0, right, 0);
    grad.addColorStop(0, "rgba(215,220,232,0.15)");
    grad.addColorStop(0.5, "#f1f4fb");
    grad.addColorStop(1, "rgba(215,220,232,0.15)");
    ctx.save();
    ctx.shadowColor = "rgba(180,190,255,0.5)";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(left, g.cy); ctx.lineTo(right, g.cy); ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "rgba(136,124,255,0.35)";
    ctx.lineWidth = 2;
    for (let x = left + 10; x < right; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, g.cy + 5); ctx.lineTo(x - 12, g.cy + 18); ctx.stroke();
    }
    ctx.fillStyle = "#8992a3";
    ctx.font = "12px Sora, Arial";
    ctx.textAlign = "center";
    ctx.fillText("PLANE MIRROR", g.cx, g.cy + 44);
}

function drawNormal(g) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(g.cx, 35); ctx.lineTo(g.cx, H - 35); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#8992a3";
    ctx.font = "12px Sora, Arial";
    ctx.textAlign = "left";
    ctx.fillText("NORMAL", g.cx + 10, 50);
}

function drawRays(g) {
    const sx = g.cx - Math.sin(g.rad) * g.L;
    const sy = g.cy - Math.cos(g.rad) * g.L;
    const ex = g.cx + Math.sin(g.rad) * g.L;
    const ey = g.cy - Math.cos(g.rad) * g.L;
    const glass = isGlass();
    const rAlpha = glass ? 0.4 : 1;

    // incident
    glowLine(sx, sy, g.cx, g.cy, GREEN, 3, 1);
    pulses(sx, sy, g.cx, g.cy, GREEN, 1, pulseT);

    // reflected
    glowLine(g.cx, g.cy, ex, ey, VIOLET, 3, rAlpha);
    pulses(g.cx, g.cy, ex, ey, VIOLET, rAlpha, pulseT);

    // refracted (glass only)
    if (glass) {
        const rx = g.cx + Math.sin(g.refr) * g.L;
        const ry = g.cy + Math.cos(g.refr) * g.L * 0.9;
        glowLine(g.cx, g.cy, rx, ry, AMBER, 3, 0.9);
        pulses(g.cx, g.cy, rx, ry, AMBER, 0.9, pulseT);
        arrowHead(rx, ry, rx - g.cx, ry - g.cy, AMBER, 0.9);
        // refraction arc
        ctx.strokeStyle = AMBER;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(g.cx, g.cy, 48, Math.PI / 2 - g.refr, Math.PI / 2); ctx.stroke();
        ctx.fillStyle = AMBER;
        ctx.font = "12px JetBrains Mono, monospace";
        ctx.textAlign = "left";
        ctx.fillText("θ₃ = " + (g.refr * 180 / Math.PI).toFixed(1) + "°", g.cx + 14, g.cy + 76);
    }

    arrowHead(g.cx, g.cy, g.cx - sx, g.cy - sy, GREEN, 1);
    arrowHead(ex, ey, ex - g.cx, ey - g.cy, VIOLET, rAlpha);

    // labels
    ctx.font = "12px Sora, Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = GREEN;
    ctx.fillText("Incident ray", (sx + g.cx) / 2 - 36, (sy + g.cy) / 2 - 8);
    ctx.fillStyle = VIOLET;
    ctx.fillText("Reflected ray", (ex + g.cx) / 2 + 40, (ey + g.cy) / 2 - 8);

    // point of incidence with pulse ring
    const ring = 6 + 10 * ((pulseT * 2) % 1);
    ctx.save();
    ctx.globalAlpha = 1 - (ring - 6) / 10;
    ctx.strokeStyle = "#fff";
    ctx.beginPath(); ctx.arc(g.cx, g.cy, ring, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(g.cx, g.cy, 5, 0, Math.PI * 2); ctx.fill();
}

function drawAngles(g) {
    const top = -Math.PI / 2;
    ctx.lineWidth = 2;

    ctx.strokeStyle = GREEN;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, 55, top - g.rad, top); ctx.stroke();
    ctx.strokeStyle = VIOLET;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, 55, top, top + g.rad); ctx.stroke();

    ctx.font = "12px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = GREEN;
    ctx.fillText("θ₁ = " + g.deg.toFixed(0) + "°", g.cx - 78, g.cy - 62);
    ctx.fillStyle = VIOLET;
    ctx.fillText("θ₂ = " + g.deg.toFixed(0) + "°", g.cx + 78, g.cy - 62);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    const g = geometry();
    drawSurface(g);
    drawNormal(g);
    drawRays(g);
    drawAngles(g);
}

/* ---------- readouts ---------- */
function updateValues() {
    const deg = Number(angle.value);
    const len = Number(rayLength.value);
    const g = geometry();

    $("angleValue").textContent = deg;
    $("lengthValue").textContent = len;
    $("incidentAngle").textContent = deg;
    $("reflectionAngle").textContent = deg;
    $("rayAngle").textContent = deg * 2;
    $("surfaceValue").textContent = isGlass() ? "Glass" : "Plane Mirror";

    if (isGlass()) {
        $("refractAngle").textContent = (g.refr * 180 / Math.PI).toFixed(1);
        $("refractUnit").textContent = "°";
    } else {
        $("refractAngle").textContent = "—";
        $("refractUnit").textContent = "";
    }
}

function setSweeping(on) {
    sweeping = on;
    $("startBtn").textContent = on ? "⏸ Stop sweep" : "▶ Auto sweep";
    $("statusText").textContent = on ? "SWEEPING" : "READY";
}

/* ---------- animation loop ---------- */
function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    pulseT = (pulseT + dt * 0.45) % 1;

    if (sweeping) {
        sweepT += dt * 0.5;
        angle.value = Math.round(40 + 35 * Math.sin(sweepT)); // sweeps 5°–75°
        updateValues();
    }
    draw();
    requestAnimationFrame(frame);
}

/* ---------- events ---------- */
angle.addEventListener("input", () => { setSweeping(false); updateValues(); });
rayLength.addEventListener("input", updateValues);
surface.addEventListener("change", updateValues);

$("startBtn").addEventListener("click", () => {
    if (!sweeping) {
        // resume from the current slider angle
        const s = (Number(angle.value) - 40) / 35;
        sweepT = Math.asin(Math.max(-1, Math.min(1, s)));
    }
    setSweeping(!sweeping);
});

$("resetBtn").addEventListener("click", () => {
    angle.value = 30;
    rayLength.value = 180;
    surface.value = "plane";
    setSweeping(false);
    updateValues();
});

/* drag on the canvas to aim the laser */
function aimFromPointer(e) {
    const r = canvas.getBoundingClientRect();
    const dx = Math.abs(e.clientX - r.left - W / 2);
    const dy = Math.max(1, H / 2 - (e.clientY - r.top));
    const deg = Math.round(Math.atan2(dx, dy) * 180 / Math.PI);
    angle.value = Math.max(0, Math.min(80, deg));
    setSweeping(false);
    updateValues();
}
canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("drag");
    aimFromPointer(e);
});
canvas.addEventListener("pointermove", (e) => {
    if (canvas.classList.contains("drag")) aimFromPointer(e);
});
["pointerup", "pointercancel"].forEach((t) =>
    canvas.addEventListener(t, () => canvas.classList.remove("drag")));

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateValues();
requestAnimationFrame(frame);