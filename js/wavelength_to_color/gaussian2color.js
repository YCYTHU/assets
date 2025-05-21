const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const DPR = window.devicePixelRatio || 1;

let WIDTH = canvas.clientWidth;
let HEIGHT = 500;

const xAxis = [390, 830];

let longPressTimer = null;
const LONG_PRESS_DURATION = 800; // ms
const XYZ2RGB = s_XYZ2RGB;
var XYZ = [0,0,1];

function setCanvasSize() {
  WIDTH = canvas.clientWidth;
  canvas.width = WIDTH * DPR;
  canvas.height = HEIGHT * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  ctx.scale(DPR, DPR);
}
setCanvasSize();
window.addEventListener('resize', () => {
  setCanvasSize();
  draw();
});

const gaussians = [];
let dragging = null;
let selected = null;

const peakRadius = 6;
const widthHandleLength = 6;

function canvasToAxisX(x) {
  return xAxis[0] + (x / WIDTH) * (xAxis[1] - xAxis[0]);
}
function axisToCanvasX(x) {
  return WIDTH * (x - xAxis[0]) / (xAxis[1] - xAxis[0]);
}

function drawAxis() {
  const axisY = HEIGHT;
  const tickStep = 50;

  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(WIDTH, axisY);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  for (let x = xAxis[0]; x <= xAxis[1]; x += tickStep) {
    let xPos = axisToCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(xPos, axisY);
    ctx.lineTo(xPos, axisY - 5);
    ctx.stroke();
    ctx.fillText(x, xPos, axisY - 18);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

  // Draw Gaussian curve
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = 0; x <= WIDTH; x++) {
    const axisX = canvasToAxisX(x);
    const y = HEIGHT - totalGaussianY(axisX);
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'steelblue'; // line color
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let g of gaussians) {
    const isSelected = selected === g;
    const cx = axisToCanvasX(g.mu);
    const cy = HEIGHT - g.A;
    const wx = axisToCanvasX(g.mu + g.sigma * widthHandleLength);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(wx, cy);
    ctx.strokeStyle = 'gray';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, peakRadius, 0, 2 * Math.PI);
    ctx.fillStyle = isSelected ? 'darkred' : 'crimson';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(wx, cy, peakRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'orange';
    ctx.fill();
  }

  drawAxis();
  exportNormalizedData();

  CIEx = XYZ[0]/(XYZ[0]+XYZ[1]+XYZ[2]);
  CIEy = XYZ[1]/(XYZ[0]+XYZ[1]+XYZ[2]);
  ctx.fillStyle = '#333';
  ctx.font = '16px sans-serif';
  ctx.fillText(`(${CIEx.toFixed(2)}, ${CIEy.toFixed(2)})`, axisToCanvasX(790), 60);
}

function totalGaussianY(axisX) {
  return gaussians.reduce((sum, g) => {
    return sum + g.A * Math.exp(-((axisX - g.mu) ** 2) / (2 * g.sigma ** 2));
  }, 0);
}

function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  const client = e.touches ? e.touches[0] : e;
  return [client.clientX - rect.left, client.clientY - rect.top];
}

function handleStart(e) {
  e.preventDefault();
  const [x, y] = getEventPos(e);
  const cx = x, cy = y;
  selected = null;

  for (let g of gaussians) {
    const gx = axisToCanvasX(g.mu);
    const gy = HEIGHT - g.A;
    if (distance(cx, cy, gx, gy) < peakRadius + 5) { // tolerance
      dragging = { type: 'peak', g };
      selected = g;
      draw();

      // 长按删除逻辑（仅限触摸）
      if (e.touches) {
        longPressTimer = setTimeout(() => {
          if (confirm('是否删除该曲线？')) {
            const idx = gaussians.indexOf(g);
            if (idx !== -1) {
              gaussians.splice(idx, 1);
              selected = null;
              draw();
            }
          }
        }, LONG_PRESS_DURATION);
      }

      return;
    }
    const wx = axisToCanvasX(g.mu + g.sigma * widthHandleLength);
    if (distance(cx, cy, wx, gy) < peakRadius + 5) {
      dragging = { type: 'sigma', g };
      selected = g;
      clearTimeout(longPressTimer);
      draw();
      return;
    }
  }

  const mu = canvasToAxisX(cx);
  const A = HEIGHT - cy;
  const newG = { mu, A, sigma: 0.02 * (xAxis[1] - xAxis[0]) };
  gaussians.push(newG);
  selected = newG;
  draw();
}

function handleMove(e) {
  clearTimeout(longPressTimer);
  if (!dragging) return;
  e.preventDefault();
  const [x, y] = getEventPos(e);
  const g = dragging.g;

  if (dragging.type === 'peak') {
    g.mu = canvasToAxisX(x);
    g.A = HEIGHT - y;
  } else if (dragging.type === 'sigma') {
    const muCanvas = axisToCanvasX(g.mu);
    const dx = x - muCanvas;
    const dAxis = dx * (xAxis[1] - xAxis[0]) / WIDTH;
    g.sigma = dAxis / widthHandleLength;
    if (g.sigma < 1) g.sigma = 1;
  }
  draw();
}

function handleEnd() {
  clearTimeout(longPressTimer);
  dragging = null;
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' && selected) {
    const idx = gaussians.indexOf(selected);
    if (idx !== -1) {
      gaussians.splice(idx, 1);
      selected = null;
      draw();
    }
  }
});

function exportNormalizedData() {
  const data = [];
  const steps = 4400;
  const [minX, maxX] = xAxis;

  let maxY = 0;
  for (let i = 0; i <= steps; i++) {
    const x = minX + (i / steps) * (maxX - minX);
    const y = totalGaussianY(x);
    data.push({ x, y });
    if (y > maxY) maxY = y;
  }

  const normalized = data.map(p => ({ x: p.x, y: maxY > 0 ? p.y / maxY : 0 }));
  //console.log('Normalized Data:', normalized);

  const rgb = gauss2color(normalized); // 假设返回如 'rgb(255, 128, 0)'
  drawTopColor(rgb);
}

function drawTopColor(rgb) {
  ctx.fillStyle = rgb;
  ctx.fillRect(0, 0, WIDTH, 30); // 高度 30 像素的颜色条
}

function gauss2color(normalized) {
  data = normalized.map(point => point.y);
  XYZ[0] = math.multiply(0.1, math.dot(data, math.column(xyz, 1)));
  XYZ[1] = math.multiply(0.1, math.dot(data, math.column(xyz, 2)));
  XYZ[2] = math.multiply(0.1, math.dot(data, math.column(xyz, 3)));
  var RGB = math.multiply(XYZ2RGB, normalize(XYZ));
  RGB = math.round(scale(RGB));
  return `rgb(${RGB[0]},${RGB[1]},${RGB[2]})`;
}

function scale(array) {
  var ans = [];
  array.forEach(function (element, index, arr) {
    if (element < 0)
      ans[index] = 0;
    else if (element > 1)
      ans[index] = 255;
    else
      ans[index] = 255 * element;
  })
  return ans;
}

function normalize(array) {
  var ans = [];
  var max = Math.max(...array);
  array.forEach(function (element, index) {
    ans[index] = element / max;
  });
  return ans;
}

draw();

