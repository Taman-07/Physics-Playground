const canvas = document.getElementById("earthCanvas");
const ctx = canvas.getContext("2d");

const mass = document.getElementById("mass");
const height = document.getElementById("height");
const velocity = document.getElementById("velocity");

const massValue = document.getElementById("massValue");
const heightValue = document.getElementById("heightValue");
const velocityValue = document.getElementById("velocityValue");

const gravity = document.getElementById("gravity");
const currentVelocity = document.getElementById("currentVelocity");
const currentHeight = document.getElementById("currentHeight");
const force = document.getElementById("force");
const timeElapsed = document.getElementById("timeElapsed");
const fallTime = document.getElementById("fallTime");
const impactSpeed = document.getElementById("impactSpeed");
const distanceFallen = document.getElementById("distanceFallen");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

let g = 9.81;   // changes with the selected planet

let objectX;
let objectY;
let objectRadius = 10;
let objectOffset = 0;   // horizontal drag offset from Earth's centre
let dragging = false;

let elapsed = 0;          // seconds since Start
let startH = 0;           // height and velocity when Start was pressed
let startV = 0;
let predictedTime = 0;    // time the object needs to reach the ground

let earthX;
let earthY;
let earthRadius;

let simulationHeight;
let currentV = 0;
let currentH = 0;

let running = false;
let clock = 0;          // seconds, drives Earth rotation and star twinkle
let lastTimestamp = 0;


/* =========================
   SEEDED RANDOM (stable stars)
========================= */

function seededRandom(seed) {
    let s = seed;
    return function () {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = seededRandom(2024);

/* Stars are stored as fractions of the canvas so they scale on resize */
const stars = Array.from({ length: 150 }, () => ({
    x: rand(),
    y: rand(),
    size: 0.5 + rand() * 1.5,
    speed: 0.6 + rand() * 2,
    phase: rand() * Math.PI * 2,
    bright: rand() > 0.93
}));

/* Land masses: [longitude°, latitude°, size as fraction of Earth radius] */
const land = [
    // Americas
    [-105, 48, 0.22], [-95, 35, 0.22], [-88, 18, 0.1],
    [-62, -3, 0.2], [-65, -22, 0.17], [-70, -42, 0.1],
    // Europe and Africa
    [10, 50, 0.14], [18, 22, 0.26], [24, 0, 0.2], [28, -22, 0.16],
    // Asia
    [80, 52, 0.3], [105, 38, 0.25], [125, 48, 0.18], [78, 22, 0.12],
    // Australia
    [135, -25, 0.15]
];

/* Clouds: [longitude°, latitude°, size] */
const clouds = Array.from({ length: 18 }, () => [
    rand() * 360 - 180,
    rand() * 120 - 60,
    0.1 + rand() * 0.14
]);

/* City lights on the night side, scattered around the land masses */
const cities = land.flatMap(([lon, lat, size]) =>
    Array.from({ length: 5 }, () => [
        lon + (rand() - 0.5) * size * 70,
        lat + (rand() - 0.5) * size * 70
    ])
);

/* Craters for rocky worlds: [longitude°, latitude°, size] */
const craters = Array.from({ length: 16 }, () => [
    rand() * 360 - 180,
    rand() * 130 - 65,
    0.05 + rand() * 0.1
]);

/*
   Planet data.
   g = surface gravity (m/s²), radius = drawn size in px,
   colors = light / mid / dark shading, glow = atmosphere colour.
*/
const planets = {
    moon: { name: "Moon", tag: "MOON", g: 1.62, radius: 54, type: "rocky", spin: 0.05,
        colors: ["#ecece8", "#9c9c9c", "#3e3e44"], glow: "rgba(200, 200, 225, 0.10)", craters: true },
    mercury: { name: "Mercury", tag: "MERCURY", g: 3.70, radius: 50, type: "rocky", spin: 0.04,
        colors: ["#d4c9bc", "#8c8179", "#3a3430"], glow: "rgba(190, 165, 140, 0.10)", craters: true },
    venus: { name: "Venus", tag: "VENUS", g: 8.87, radius: 68, type: "rocky", spin: -0.05,
        colors: ["#ffe6ae", "#d9a441", "#6e4313"], glow: "rgba(255, 200, 100, 0.40)", swirls: true },
    earth: { name: "Earth", tag: "EARTH", g: 9.81, radius: 70, type: "earth", spin: 0.18 },
    mars: { name: "Mars", tag: "MARS", g: 3.71, radius: 56, type: "rocky", spin: 0.17,
        colors: ["#f4a77a", "#c1502e", "#4a1a10"], glow: "rgba(255, 130, 90, 0.22)", craters: true, cap: true },
    jupiter: { name: "Jupiter", tag: "JUPITER", g: 24.79, radius: 92, type: "gas", spin: 0.45,
        colors: ["#f4ddb9", "#c99a68", "#5a3a22"], glow: "rgba(255, 205, 150, 0.18)",
        bands: "rgba(150, 90, 50, 0.35)", spot: ["rgba(205, 85, 50, 0.75)", 0.22] },
    saturn: { name: "Saturn", tag: "SATURN", g: 10.44, radius: 76, type: "gas", spin: 0.4,
        colors: ["#f8e9bf", "#d4b571", "#6a5530"], glow: "rgba(250, 225, 160, 0.18)",
        bands: "rgba(160, 120, 60, 0.25)", rings: true },
    uranus: { name: "Uranus", tag: "URANUS", g: 8.69, radius: 66, type: "gas", spin: 0.25,
        colors: ["#d2f6f6", "#6fd0d6", "#1f6f7a"], glow: "rgba(120, 230, 240, 0.30)",
        bands: "rgba(255, 255, 255, 0.08)" },
    neptune: { name: "Neptune", tag: "NEPTUNE", g: 11.15, radius: 64, type: "gas", spin: 0.3,
        colors: ["#86abff", "#2b4fd6", "#0a1a5c"], glow: "rgba(80, 120, 255, 0.35)",
        bands: "rgba(255, 255, 255, 0.07)", spot: ["rgba(10, 20, 90, 0.6)", 0.16] },
    pluto: { name: "Pluto", tag: "PLUTO", g: 0.62, radius: 44, type: "rocky", spin: 0.03,
        colors: ["#f4e4d3", "#b49a85", "#4a3a30"], glow: "rgba(230, 210, 190, 0.08)", craters: true }
};

let planet = planets.earth;

let shootingStar = null;
let nextShootingStar = 3;


/* =========================
   CANVAS SIZE
========================= */

function resizeCanvas() {

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    earthX = canvas.width / 2;
    earthRadius = planet.radius;
    earthY = canvas.height - 60;

    if (!running) resetObjectPosition();

}


/* =========================
   OBJECT SIZE FROM MASS
   1 kg -> about 8 px, 100 kg -> 22 px
========================= */

function getObjectRadius() {
    return 6 + 16 * Math.sqrt(Number(mass.value) / 100);
}


/* =========================
   OBJECT POSITION
========================= */

function surfaceYAt(x) {

    const dx = Math.min(Math.abs(x - earthX), earthRadius * 0.99);

    return earthY - Math.sqrt(earthRadius * earthRadius - dx * dx);

}

function heightToY(h) {

    const surfaceY = surfaceYAt(objectX);
    const topMargin = 20;
    const available = surfaceY - objectRadius - topMargin;
    const ratio = h / Number(height.max);

    return surfaceY - objectRadius - ratio * available;

}

function resetObjectPosition() {

    objectRadius = getObjectRadius();

    simulationHeight = Number(height.value);
    currentH = simulationHeight;
    currentV = Number(velocity.value);
    elapsed = 0;

    objectX = earthX + objectOffset;
    objectY = heightToY(currentH);

}


/* =========================
   DRAW SPACE BACKGROUND
========================= */

function drawSpace() {

    const w = canvas.width;
    const h = canvas.height;

    /* Soft nebula glows (semi-transparent so the grid shows through) */

    const nebulae = [
        [w * 0.18, h * 0.28, w * 0.45, "rgba(120, 80, 255, 0.20)"],
        [w * 0.85, h * 0.18, w * 0.4, "rgba(40, 120, 255, 0.16)"],
        [w * 0.7, h * 0.6, w * 0.35, "rgba(200, 70, 190, 0.10)"]
    ];

    nebulae.forEach(([x, y, r, color]) => {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
    });

    /* Twinkling stars */

    stars.forEach((star) => {

        const twinkle = 0.55 + 0.45 * Math.sin(clock * star.speed + star.phase);
        const x = star.x * w;
        const y = star.y * h;

        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (0.25 + twinkle * 0.6).toFixed(2) + ")";
        ctx.fill();

        /* A few brighter stars get a small cross glint */
        if (star.bright) {
            const len = 4 + twinkle * 5;
            ctx.strokeStyle = "rgba(190, 210, 255, " + (twinkle * 0.6).toFixed(2) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - len, y);
            ctx.lineTo(x + len, y);
            ctx.moveTo(x, y - len);
            ctx.lineTo(x, y + len);
            ctx.stroke();
        }

    });

    /* Moon drifting across the sky (Earth only) */

    if (planet.type === "earth") {

    const moonAngle = clock * 0.12;
    const mx = earthX + Math.cos(moonAngle) * w * 0.38;
    const my = h * 0.2 + Math.sin(moonAngle) * 14;

    const moon = ctx.createRadialGradient(mx - 4, my - 4, 1, mx, my, 12);
    moon.addColorStop(0, "#f6f6f2");
    moon.addColorStop(0.6, "#b9b9b5");
    moon.addColorStop(1, "#6f6f72");

    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fillStyle = moon;
    ctx.shadowColor = "rgba(255, 255, 255, 0.35)";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(90, 90, 95, 0.35)";
    [[-4, 2, 3], [4, -3, 2.5], [3, 5, 1.8]].forEach(([dx, dy, cr]) => {
        ctx.beginPath();
        ctx.arc(mx + dx, my + dy, cr, 0, Math.PI * 2);
        ctx.fill();
    });

    }

    drawShootingStar();

}

function drawShootingStar() {

    if (!shootingStar) return;

    const s = shootingStar;
    const tailX = s.x - s.vx * 0.12;
    const tailY = s.y - s.vy * 0.12;

    const trail = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
    trail.addColorStop(0, "rgba(255, 255, 255, " + s.life.toFixed(2) + ")");
    trail.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

}

function updateShootingStar(dt) {

    if (!shootingStar && clock > nextShootingStar) {
        shootingStar = {
            x: canvas.width * (0.3 + Math.random() * 0.6),
            y: canvas.height * Math.random() * 0.3,
            vx: -350,
            vy: 180,
            life: 1
        };
        nextShootingStar = clock + 5 + Math.random() * 6;
    }

    if (shootingStar) {
        shootingStar.x += shootingStar.vx * dt;
        shootingStar.y += shootingStar.vy * dt;
        shootingStar.life -= dt * 1.2;
        if (shootingStar.life <= 0) shootingStar = null;
    }

}


/* =========================
   DRAW EARTH
========================= */

function ellipsePath(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
}

/* Place a point on the rotating sphere. Returns null when on the far side. */
function project(lonDeg, latDeg, rotation) {

    const lon = (lonDeg * Math.PI) / 180 - rotation;
    const lat = (latDeg * Math.PI) / 180;
    const depth = Math.cos(lon) * Math.cos(lat);

    if (depth <= 0.05) return null;

    return {
        x: earthX + earthRadius * Math.cos(lat) * Math.sin(lon),
        y: earthY - earthRadius * Math.sin(lat),
        depth: depth
    };

}

/* Saturn-style rings. back = half behind the planet, front = half in front */

function drawRing(front) {

    const R = earthRadius;

    [[1.55, 0.34, "rgba(214, 190, 140, 0.55)"], [1.95, 0.22, "rgba(180, 155, 110, 0.40)"]].forEach(([k, w, color]) => {
        ctx.beginPath();
        ctx.ellipse(earthX, earthY, R * k, R * k * 0.28, -0.22,
            front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = R * w;
        ctx.stroke();
    });

}

/* Every planet except Earth */

function drawOtherPlanet() {

    const cx = earthX;
    const cy = earthY;
    const R = earthRadius;
    const p = planet;
    const rotation = clock * p.spin;

    /* Atmosphere glow */

    const glow = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.45);
    glow.addColorStop(0, p.glow);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
    ctx.fill();

    if (p.rings) drawRing(false);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    /* Base colour */

    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.1);
    body.addColorStop(0, p.colors[0]);
    body.addColorStop(0.55, p.colors[1]);
    body.addColorStop(1, p.colors[2]);
    ctx.fillStyle = body;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    /* Cloud bands on gas giants */

    if (p.bands) {
        const count = 11;
        const bandHeight = (R * 2) / count;
        ctx.fillStyle = p.bands;
        for (let i = 0; i < count; i += 2) {
            ctx.fillRect(cx - R, cy - R + i * bandHeight, R * 2, bandHeight);
        }
    }

    /* A storm that travels around the planet */

    if (p.spot) {
        const s = project(60, -20, rotation);
        if (s) {
            ellipsePath(s.x, s.y, p.spot[1] * R * s.depth, p.spot[1] * R * 0.55);
            ctx.fillStyle = p.spot[0];
            ctx.fill();
        }
    }

    /* Craters */

    if (p.craters) {
        craters.forEach(([lon, lat, size]) => {
            const c = project(lon, lat, rotation);
            if (!c) return;
            ellipsePath(c.x, c.y, size * R * c.depth, size * R);
            ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    /* Thick swirling clouds on Venus */

    if (p.swirls) {
        clouds.forEach(([lon, lat, size]) => {
            const c = project(lon, lat, rotation);
            if (!c) return;
            ellipsePath(c.x, c.y, size * R * c.depth * 2.4, size * R * 0.45);
            ctx.fillStyle = "rgba(255, 240, 200, 0.22)";
            ctx.fill();
        });
    }

    /* Mars polar cap */

    if (p.cap) {
        ctx.fillStyle = "rgba(245, 250, 255, 0.75)";
        ellipsePath(cx, cy - R * 0.95, R * 0.4, R * 0.14);
        ctx.fill();
    }

    /* Night side and sun highlight */

    const night = ctx.createLinearGradient(cx - R * 0.5, cy - R * 0.6, cx + R, cy + R * 0.8);
    night.addColorStop(0, "rgba(2, 6, 25, 0)");
    night.addColorStop(0.45, "rgba(2, 6, 25, 0.15)");
    night.addColorStop(1, "rgba(2, 6, 25, 0.8)");
    ctx.fillStyle = night;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    const shine = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, 0, cx - R * 0.45, cy - R * 0.5, R * 0.5);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shine;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    ctx.restore();

    /* Thin rim */

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (p.rings) drawRing(true);

}

function drawEarth() {

    if (planet.type !== "earth") {
        drawOtherPlanet();
        return;
    }

    const cx = earthX;
    const cy = earthY;
    const R = earthRadius;
    const rotation = clock * 0.18;


    /* Atmosphere glow */

    const atmosphere = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.5);
    atmosphere.addColorStop(0, "rgba(110, 200, 255, 0.55)");
    atmosphere.addColorStop(0.35, "rgba(60, 150, 255, 0.20)");
    atmosphere.addColorStop(1, "rgba(60, 150, 255, 0)");

    ctx.fillStyle = atmosphere;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
    ctx.fill();


    /* Everything inside the planet is clipped to its circle */

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    /* Oceans */

    const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.1);
    ocean.addColorStop(0, "#55bfff");
    ocean.addColorStop(0.5, "#1c7ed6");
    ocean.addColorStop(0.85, "#0a3a73");
    ocean.addColorStop(1, "#051d3d");
    ctx.fillStyle = ocean;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    /* Continents, shrinking toward the edge to fake the curve */

    land.forEach(([lon, lat, size]) => {
        const p = project(lon, lat, rotation);
        if (!p) return;
        ellipsePath(p.x, p.y, size * R * p.depth * 1.3, size * R);
        ctx.fillStyle = "rgba(76, 190, 120, " + Math.min(0.95, 0.35 + p.depth).toFixed(2) + ")";
        ctx.fill();
    });

    /* Polar ice caps */

    ctx.fillStyle = "rgba(240, 248, 255, 0.8)";
    ellipsePath(cx, cy - R * 0.95, R * 0.5, R * 0.17);
    ctx.fill();
    ellipsePath(cx, cy + R * 0.95, R * 0.55, R * 0.18);
    ctx.fill();

    /* Clouds drift a little faster than the ground */

    clouds.forEach(([lon, lat, size]) => {
        const p = project(lon, lat, rotation * 1.35);
        if (!p) return;
        ellipsePath(p.x, p.y, size * R * p.depth * 1.8, size * R * 0.5);
        ctx.fillStyle = "rgba(255, 255, 255, " + (0.12 + p.depth * 0.2).toFixed(2) + ")";
        ctx.fill();
    });

    /* Night side shading */

    const night = ctx.createLinearGradient(cx - R * 0.5, cy - R * 0.6, cx + R, cy + R * 0.8);
    night.addColorStop(0, "rgba(2, 6, 25, 0)");
    night.addColorStop(0.45, "rgba(2, 6, 25, 0.15)");
    night.addColorStop(1, "rgba(2, 6, 25, 0.8)");
    ctx.fillStyle = night;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    /* City lights glow on the dark side */

    cities.forEach(([lon, lat]) => {
        const p = project(lon, lat, rotation);
        if (!p) return;
        const dark = Math.max(0, Math.min(1, (p.x - (cx - R * 0.15)) / (R * 0.8)));
        if (dark <= 0) return;
        ctx.fillStyle = "rgba(255, 214, 120, " + (dark * 0.9).toFixed(2) + ")";
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
    });

    /* Sun highlight */

    const shine = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, 0, cx - R * 0.45, cy - R * 0.5, R * 0.5);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shine;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    ctx.restore();


    /* Thin bright rim */

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(140, 210, 255, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

}


/* =========================
   DRAW OBJECT
   Size grows with mass
========================= */

function drawObject() {

    const r = objectRadius;

    /* Metal ball */

    const body = ctx.createRadialGradient(
        objectX - r * 0.35,
        objectY - r * 0.35,
        r * 0.1,
        objectX,
        objectY,
        r
    );
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.5, "#b9c2d9");
    body.addColorStop(1, "#5d6684");

    ctx.beginPath();
    ctx.arc(objectX, objectY, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    /* Mass label */

    ctx.fillStyle = "#aeb6c5";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(mass.value + " kg", objectX - r - 10, objectY + 4);
    ctx.textAlign = "left";


    /* Drag hint */

    if (!running && !dragging) {
        ctx.fillStyle = "rgba(174, 182, 197, 0.7)";
        ctx.font = "11px Arial";
        ctx.textAlign = "center";
        ctx.fillText("drag to move", objectX, objectY - r - 10);
        ctx.textAlign = "left";
    }


    /* Gravity arrow: longer for heavier objects (bigger force) */

    if (running) {

        const arrowLength = 28 + (Number(mass.value) / 100) * 40;
        const startY = objectY + r + 6;
        const endY = startY + arrowLength;

        ctx.beginPath();
        ctx.moveTo(objectX, startY);
        ctx.lineTo(objectX, endY);
        ctx.strokeStyle = "#887cff";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(objectX - 6, endY - 8);
        ctx.lineTo(objectX, endY + 2);
        ctx.lineTo(objectX + 6, endY - 8);
        ctx.fillStyle = "#887cff";
        ctx.fill();

        ctx.fillStyle = "#887cff";
        ctx.font = "12px Arial";
        ctx.fillText("mg", objectX + 10, startY + arrowLength / 2);

    }

}


/* =========================
   DRAW DISTANCE LINE
========================= */

function drawHeightLine() {

    if (!running) return;

    const groundY = surfaceYAt(objectX);
    const lineX = objectX + objectRadius + 20;

    ctx.beginPath();
    ctx.moveTo(lineX, objectY);
    ctx.lineTo(lineX, groundY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#aeb6c5";
    ctx.font = "12px Arial";
    ctx.fillText(
        currentH.toFixed(1) + " m",
        lineX + 8,
        (objectY + groundY) / 2
    );

}


/* =========================
   DRAW EVERYTHING
========================= */

function drawTimer() {

    const barWidth = 150;
    const ratio = predictedTime > 0 ? Math.min(elapsed / predictedTime, 1) : 0;

    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText("t = " + elapsed.toFixed(2) + " s", 16, 28);

    ctx.fillStyle = "#8d96a8";
    ctx.font = "12px Arial";
    ctx.fillText("falls in " + predictedTime.toFixed(2) + " s", 16, 46);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(16, 54, barWidth, 4);

    ctx.fillStyle = "#887cff";
    ctx.fillRect(16, 54, barWidth * ratio, 4);

}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSpace();
    drawEarth();
    drawHeightLine();
    drawObject();
    drawTimer();

}


/* =========================
   UPDATE EXPERIMENT VALUES
========================= */

function updateExperimentValues() {

    massValue.textContent = mass.value;
    heightValue.textContent = height.value;
    velocityValue.textContent = velocity.value;

    /* Force = mass × gravity */

    force.textContent = (Number(mass.value) * g).toFixed(2);

}


/* =========================
   UPDATE LIVE CALCULATIONS
========================= */

function updateCalculations() {

    gravity.textContent = g.toFixed(2);
    currentVelocity.textContent = currentV.toFixed(2);
    currentHeight.textContent = Math.max(currentH, 0).toFixed(2);

    /* Predicted fall time: h = ut + ½gt²  →  t = (−u + √(u² + 2gh)) / g */

    const h0 = running ? startH : Number(height.value);
    const u0 = running ? startV : Number(velocity.value);

    predictedTime = fallTimeFor(h0, u0, g);

    timeElapsed.textContent = elapsed.toFixed(2);
    fallTime.textContent = predictedTime.toFixed(2);
    impactSpeed.textContent = (u0 + g * predictedTime).toFixed(2);
    distanceFallen.textContent = Math.max(0, h0 - Math.max(currentH, 0)).toFixed(2);

}


/* =========================
   PHYSICS
========================= */

function fallTimeFor(h, u, grav) {
    return (-u + Math.sqrt(u * u + 2 * grav * h)) / grav;
}

function updatePhysics(dt) {

    elapsed += dt;

    const total = fallTimeFor(startH, startV, g);

    if (elapsed >= total) {

        /* Landed: show the exact impact values */

        elapsed = total;
        currentH = 0;
        currentV = startV + g * total;
        running = false;

    } else {

        /* v = u + gt     s = ut + ½gt² */

        currentV = startV + g * elapsed;
        currentH = startH - (startV * elapsed + 0.5 * g * elapsed * elapsed);

    }

    objectY = heightToY(currentH);

    updateCalculations();

}


/* =========================
   MAIN LOOP
   Runs all the time so the stars twinkle
   and Earth keeps rotating.
========================= */

function loop(timestamp) {

    const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0, 0.05);
    lastTimestamp = timestamp;

    clock += dt;

    updateShootingStar(dt);

    if (running) updatePhysics(dt);

    draw();

    requestAnimationFrame(loop);

}


/* =========================
   START BUTTON
========================= */

startBtn.addEventListener("click", () => {

    /* Restart from the top if the object already landed */

    if (running) return;

    if (currentH <= 0) {
        resetObjectPosition();
    }

    startH = currentH;
    startV = currentV;
    elapsed = 0;

    running = true;

});


/* =========================
   RESET BUTTON
========================= */

resetBtn.addEventListener("click", () => {

    running = false;

    resetObjectPosition();
    updateExperimentValues();
    updateCalculations();

});


/* =========================
   MASS SLIDER
   Bigger mass = bigger object
========================= */

mass.addEventListener("input", () => {

    objectRadius = getObjectRadius();

    /* Keep the object sitting correctly on its height */

    objectY = heightToY(currentH);

    updateExperimentValues();
    updateCalculations();

});


/* =========================
   HEIGHT SLIDER
========================= */

height.addEventListener("input", () => {

    if (!running) {
        resetObjectPosition();
    }

    updateExperimentValues();
    updateCalculations();

});


/* =========================
   VELOCITY SLIDER
========================= */

velocity.addEventListener("input", () => {

    if (!running) {
        currentV = Number(velocity.value);
    }

    updateExperimentValues();
    updateCalculations();

});


/* =========================
   INITIAL SETUP
========================= */

/* =========================
   DRAG THE OBJECT
   Horizontal drag moves it left/right,
   vertical drag changes the starting height.
========================= */

function pointerPos(e) {

    const rect = canvas.getBoundingClientRect();

    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };

}

function onObject(p) {
    return Math.hypot(p.x - objectX, p.y - objectY) <= objectRadius + 12;
}

canvas.addEventListener("pointerdown", (e) => {

    if (running || !onObject(pointerPos(e))) return;

    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";

});

canvas.addEventListener("pointermove", (e) => {

    const p = pointerPos(e);

    if (!dragging) {
        canvas.style.cursor = (!running && onObject(p)) ? "grab" : "default";
        return;
    }

    /* Keep the object above Earth so it always lands on it */

    const maxOffset = earthRadius * 0.85;
    objectOffset = Math.max(-maxOffset, Math.min(maxOffset, p.x - earthX));
    objectX = earthX + objectOffset;

    const surfaceY = surfaceYAt(objectX);
    const available = surfaceY - objectRadius - 20;
    const maxH = Number(height.max);
    const ratio = (surfaceY - objectRadius - p.y) / available;

    height.value = Math.round(Math.max(Number(height.min), Math.min(maxH, ratio * maxH)));

    resetObjectPosition();
    updateExperimentValues();
    updateCalculations();

});

function stopDrag() {
    dragging = false;
    canvas.style.cursor = "default";
}

canvas.addEventListener("pointerup", stopDrag);
canvas.addEventListener("pointercancel", stopDrag);


/* =========================
   PLANET SELECTOR
========================= */

const planetSelect = document.getElementById("planetSelect");
planetSelect.value = "earth";

function setPlanet(key) {

    planet = planets[key];
    g = planet.g;
    running = false;

    earthRadius = planet.radius;
    earthY = canvas.height - 60;

    const maxOffset = earthRadius * 0.85;
    objectOffset = Math.max(-maxOffset, Math.min(maxOffset, objectOffset));

    resetObjectPosition();

    document.getElementById("planetTag").textContent = "LAB 01 · " + planet.tag;
    document.getElementById("planetTitle").textContent = planet.name + " & Gravity";
    document.getElementById("planetIntro").textContent =
        "Explore how " + planet.name + "'s gravity affects a falling object " +
        "and observe velocity, distance and force in real time.";
    document.getElementById("planetInfo").textContent =
        planet.g.toFixed(2) + " m/s² · " + (planet.g / 9.81).toFixed(2) + "× Earth";
    document.title = planet.name + " & Gravity | Physics Playground";

    updateExperimentValues();
    updateCalculations();

}

planetSelect.addEventListener("change", () => setPlanet(planetSelect.value));


window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateExperimentValues();
updateCalculations();
requestAnimationFrame(loop);
