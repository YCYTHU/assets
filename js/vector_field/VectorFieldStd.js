const canvas = document.getElementById("canvas");
const dpr = window.devicePixelRatio || 1;
const ctx = initializeCanvas(canvas, dpr);
const bounds = {
    x: 0,
    y: 0,
    width: canvas.width / dpr,
    height: canvas.height / dpr
};
const MAX_PARTICLE_AGE = 100;       // 粒子寿命
const PARTICLE_MULTIPLIER = 10.0;   // 粒子密度
const FRAME_RATE = 25;              // 刷新间隔（ms）
const LINE_WIDTH = 1 * dpr;         // 线宽
const EVOLVE_STEP = 0.5;            // 步长
const COLORMAP = [                  // 色彩刻度
    [58, 76, 192],
    [103, 136, 237],
    [153, 186, 254],
    [200, 215, 239],
    [237, 208, 193],
    [246, 167, 137],
    [225, 104, 82],
    [179, 3, 38]
];
const particleCount = Math.round(bounds.width * PARTICLE_MULTIPLIER);
const particles = Array.from({ length: particleCount }, () => randomizeParticle({}));
const vectorField = createVectorField();
const vectorColorRange = calculateColorLim(vectorField);
const vectorColorScale = calculateColorScale(255, vectorColorRange, COLORMAP);
frame(particles, vectorField, vectorColorScale, ctx);

function initializeCanvas(canvas, dpr) {
    const ctx = canvas.getContext("2d");
    canvas.style.backgroundColor = "#000";
    canvas.width = 640 * dpr;
    canvas.height = 360 * dpr;
    canvas.style.width = `640px`;
    canvas.style.height = `360px`;
    ctx.translate(0, canvas.height);
    ctx.scale(dpr, -dpr);
    return ctx;
}

function createVectorField() {
    return {
        interpolate: (x, y) => {
            x = (x - bounds.width / 2) / (bounds.height / 3);
            y = (y - bounds.height / 2) / (bounds.height / 3);
            const ux = y * (1 - 2 * x * x) * Math.exp(-(x * x + y * y));
            const vy = x * (1 - 2 * y * y) * Math.exp(-(x * x + y * y));
            const s = Math.sqrt(ux * ux + vy * vy);
            const u = 1.5 * ux / s;
            const v = 1.5 * vy / s;
            const norm = Math.sqrt(u * u + v * v);
            const colorParam = ((x ** 3 * y + x * y ** 3 - 3 * x * y) * Math.exp(-(x * x + y * y)));
            return [u, v, norm, colorParam];
        }
    };
}

function calculateColorLim(vectorField, sampleCount = 1000) {
    let maxColor = -Infinity;
    let minColor = Infinity;
    for (let i = 0; i < sampleCount; i++) {
        const x = Math.random() * bounds.width;
        const y = Math.random() * bounds.height;
        const [, , , colorParam] = vectorField.interpolate(x, y);
        if (colorParam > maxColor) { maxColor = colorParam; }
        if (colorParam < minColor) { minColor = colorParam; }
    }
    if (minColor === maxColor) {
        maxColor = maxColor + 1;
        minColor = minColor - 1;
    }
    return [minColor, maxColor];
}

function calculateColorScale(steps, intensityRange, colormap) {
    function interpolateColor(color1, color2, factor) {
        return color1.map((c, i) => Math.round(c + factor * (color2[i] - c)));
    }
    const colors = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const scaledT = t * (colormap.length - 1);
        const idx = Math.floor(scaledT);
        const frac = scaledT - idx;
        const color = idx < colormap.length - 1
            ? interpolateColor(colormap[idx], colormap[idx + 1], frac)
            : colormap[colormap.length - 1];
        colors.push(`rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`);
    }
    return {
        indexFor: (m) => Math.max(Math.min(Math.floor(((m - intensityRange[0]) / (intensityRange[1] - intensityRange[0])) * steps), steps), 0),
        getColor: (index) => colors[index]
    };
}

function randomizeParticle(p) {
    p.x = Math.random() * bounds.width;
    p.y = Math.random() * bounds.height;
    p.age = Math.random() * MAX_PARTICLE_AGE;
    return p;
}

function evolve(particles, vectorField) {
    particles.forEach(p => {
        if (p.age > MAX_PARTICLE_AGE) {
            randomizeParticle(p);
        }
        const vec = vectorField.interpolate(p.x, p.y);
        const vecNorm = vec[2];
        if (!vec || vecNorm === null) {
            p.age = MAX_PARTICLE_AGE;
        } else {
            p.x += EVOLVE_STEP * vec[0];
            p.y += EVOLVE_STEP * vec[1];
            if (p.x > bounds.width || p.x < 0 || p.y > bounds.height || p.y < 0) {
                randomizeParticle(p);
            }
        }
        p.age++;
    });
}

function draw(particles, vectorField, vectorColorScale, ctx) {
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = LINE_WIDTH;
    particles.forEach(p => {
        const vec = vectorField.interpolate(p.x, p.y);
        const vecNorm = vec[2];
        const vec_x = vec[0] / vecNorm;
        const vec_y = vec[1] / vecNorm;
        const colorIndex = vectorColorScale.indexFor(vec[3]);
        ctx.strokeStyle = vectorColorScale.getColor(colorIndex);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - vec_x, p.y - vec_y);
        ctx.stroke();
    });
}

function frame(particles, vectorField, vectorColorScale, ctx) {
    evolve(particles, vectorField);
    draw(particles, vectorField, vectorColorScale, ctx);
    setTimeout(() => requestAnimationFrame(() => frame(particles, vectorField, vectorColorScale, ctx)), FRAME_RATE);
}
