const canvas = document.getElementById("magnetCanvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

const strength = $("strength");
const position = $("position");
const distance = $("distance");

const RED = "#e85d75", BLUE = "#5575e8", VIOLET = "136,124,255";

let W = 0, H = 0;
let flowing = true;
let flip = 1;            // +1: N on the left, -1: N on the right
let compassAngle = 0;    // direction of compass from the magnet (radians)
let needle = 0, needleVel = 0;
let flow = 0, last = performance.now();
let drag = null;

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function magnetPos() {
    return { x: W * Number(position.value) / 100, y: H / 2 };
}

function compassPos() {
    const m = magnetPos(), d = Number(distance.value);
    return { x: m.x + Math.cos(compassAngle) * d, y: m.y + Math.sin(compassAngle) * d };
}

/* Dipole field at (px,py). Moment points from S to N, so it is -x when N is on the left. */
function fieldAt(px, py) {
    const m = magnetPos();
    const rx = px - m.x, ry = py - m.y;
    const r = Math.hypot(rx, ry) || 1;
    const ux = rx / r, uy = ry / r;
    const mx = -flip, my = 0;
    const dot = mx * ux + my * uy;
    const k = Number(strength.value) * Math.pow(150, 3) / Math.pow(r, 3);
    return { x: k * (3 * dot * ux - mx), y: k * (3 * dot * uy - my) };
}

/* ---------- drawing ---------- */
function drawGlow(m) {
    const s = Number(strength.value) / 100;
    const g = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, 220);
    g.addColorStop(0, "rgba(" + VIOLET + "," + (0.28 * s) + ")");
    g.addColorStop(1, "rgba(" + VIOLET + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
}

function fieldLoop(m, L, sign) {
    ctx.beginPath();
    let first = true;
    for (let t = Math.PI - 0.03; t >= 0.03; t -= 0.04) {
        const r = L * Math.sin(t) * Math.sin(t);
        const x = m.x + flip * r * Math.cos(t);   // flows from N pole round to S pole
        const y = m.y - sign * r * Math.sin(t);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function drawFieldLines(m) {
    const s = Number(strength.value) / 100;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
        const L = 120 + i * 48;
        const a = (0.75 - i * 0.08) * (0.35 + 0.65 * s);
        ctx.strokeStyle = "rgba(" + VIOLET + "," + a + ")";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([9, 9]);
        ctx.lineDashOffset = -flow;
        fieldLoop(m, L, 1);
        fieldLoop(m, L, -1);
    }
    ctx.setLineDash([]);
}

function drawMagnet(m) {
    const w = 130, h = 48, x = m.x - w / 2, y = m.y - h / 2;
    const leftCol = flip > 0 ? RED : BLUE, rightCol = flip > 0 ? BLUE : RED;
    ctx.save();
    ctx.shadowColor = "rgba(" + VIOLET + ",0.6)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = leftCol; ctx.fillRect(x, y, w / 2, h);
    ctx.fillStyle = rightCol; ctx.fillRect(m.x, y, w / 2, h);
    ctx.restore();
    const sheen = ctx.createLinearGradient(0, y, 0, y + h);
    sheen.addColorStop(0, "rgba(255,255,255,0.28)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = sheen; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
    ctx.fillText(flip > 0 ? "N" : "S", m.x - w / 4, m.y + 6);
    ctx.fillText(flip > 0 ? "S" : "N", m.x + w / 4, m.y + 6);
}

function drawCompass(c) {
    ctx.beginPath(); ctx.arc(c.x, c.y, 30, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,14,23,0.85)"; ctx.fill();
    ctx.strokeStyle = "#9ba4b5"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * 25, c.y + Math.sin(a) * 25);
        ctx.lineTo(c.x + Math.cos(a) * 29, c.y + Math.sin(a) * 29);
        ctx.stroke();
    }
    const cs = Math.cos(needle), sn = Math.sin(needle), len = 22, wd = 5;
    const tri = (dir, col) => {
        ctx.beginPath();
        ctx.moveTo(c.x + cs * len * dir, c.y + sn * len * dir);
        ctx.lineTo(c.x - sn * wd, c.y + cs * wd);
        ctx.lineTo(c.x + sn * wd, c.y - cs * wd);
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    tri(1, RED); tri(-1, BLUE);
    ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = "#8992a3"; ctx.font = "11px Arial"; ctx.textAlign = "center";
    ctx.fillText("COMPASS", c.x, c.y + 50);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    const m = magnetPos(), c = compassPos();
    drawGlow(m);
    drawFieldLines(m);
    // dashed link showing r
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    ctx.setLineDash([]);
    drawMagnet(m);
    drawCompass(c);
}

/* ---------- readouts ---------- */
function updateValues() {
    const s = Number(strength.value), p = Number(position.value), d = Number(distance.value);
    const c = compassPos(), f = fieldAt(c.x, c.y), b = Math.hypot(f.x, f.y);
    $("strengthValue").textContent = s;
    $("positionValue").textContent = p;
    $("distanceValue").textContent = d;
    $("fieldStrength").textContent = b.toFixed(1);
    $("currentDistance").textContent = d;
    $("currentPosition").textContent = p;
    $("fieldEffect").textContent = b >= 60 ? "Strong" : b >= 15 ? "Medium" : "Weak";
}

/* ---------- animation ---------- */
function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (flowing) flow = (flow + dt * 40) % 1000;

    // needle swings to align with the field, with a little overshoot
    const c = compassPos(), f = fieldAt(c.x, c.y);
    const target = Math.atan2(f.y, f.x);
    let diff = target - needle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    needleVel += (diff * 90 - needleVel * 9) * dt;
    needle += needleVel * dt;

    updateValues();
    draw();
    requestAnimationFrame(frame);
}

/* ---------- dragging ---------- */
function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
    const p = pointer(e), c = compassPos(), m = magnetPos();
    if (Math.hypot(p.x - c.x, p.y - c.y) < 36) drag = "compass";
    else if (Math.abs(p.x - m.x) < 70 && Math.abs(p.y - m.y) < 30) drag = "magnet";
    if (drag) canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
    const p = pointer(e);
    if (drag === "magnet") {
        position.value = Math.max(20, Math.min(80, Math.round(p.x / W * 100)));
    } else if (drag === "compass") {
        const m = magnetPos();
        compassAngle = Math.atan2(p.y - m.y, p.x - m.x);
        distance.value = Math.max(80, Math.min(250, Math.round(Math.hypot(p.x - m.x, p.y - m.y))));
    } else {
        const c = compassPos(), m = magnetPos();
        const over = Math.hypot(p.x - c.x, p.y - c.y) < 36 ||
            (Math.abs(p.x - m.x) < 70 && Math.abs(p.y - m.y) < 30);
        canvas.style.cursor = over ? "grab" : "default";
    }
});

["pointerup", "pointercancel"].forEach((t) => canvas.addEventListener(t, () => { drag = null; }));

/* ---------- buttons ---------- */
$("startBtn").addEventListener("click", () => {
    flowing = !flowing;
    $("startBtn").textContent = flowing ? "⏸ Pause flow" : "▶ Start flow";
    $("statusText").textContent = flowing ? "● FLOWING" : "● PAUSED";
});

$("flipBtn").addEventListener("click", () => { flip = -flip; });

$("resetBtn").addEventListener("click", () => {
    strength.value = 50; position.value = 50; distance.value = 150;
    compassAngle = 0; flip = 1; flowing = true;
    $("startBtn").textContent = "⏸ Pause flow";
    $("statusText").textContent = "● FLOWING";
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
updateValues();
requestAnimationFrame(frame);