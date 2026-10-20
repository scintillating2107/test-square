const $ = id => document.getElementById(id);
const stage = $("stage"), track = $("track"), square = $("square");
const dirBtn = $("dirBtn"), themeBtn = $("themeBtn");
const speed = $("speed"), size = $("size"), picker = $("picker"), swatches = $("swatches");
const rainbow = $("rainbow"), spin = $("spin"), pulse = $("pulse"), trail = $("trail");

const SIDES = 6;
const colors = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#8338ec", "#ff006e"];

let points = [];
let pos = 0;
let direction = 1;
let angle = 0, x = 0, y = 0;
let half = 0;
let lastDot = null;
let drag = null;

swatches.innerHTML = colors.map(c => `<span style="background:${c}" data-color="${c}"></span>`).join("");

const wrap = n => ((n % SIDES) + SIDES) % SIDES;

function drawTrack() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const r = Math.min(+size.value, Math.min(w, h) / 2 - 40);

  points = [];
  for (let i = 0; i < SIDES; i++) {
    const a = (2 * Math.PI / SIDES) * i - Math.PI / 2;
    points.push({ x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a) });
  }

  track.innerHTML = `<polygon points="${points.map(p => `${p.x},${p.y}`).join(" ")}"></polygon>` +
    points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4"></circle>`).join("");

  half = square.offsetWidth / 2;
  placeSquare();
}

function placeSquare() {
  const i = Math.floor(pos), t = pos - i;
  const a = points[i], b = points[(i + 1) % SIDES];
  x = a.x + (b.x - a.x) * t;
  y = a.y + (b.y - a.y) * t;
  square.style.transform = `translate(${x - half}px, ${y - half}px) rotate(${angle}deg)`;
}

function moveBy(delta) {
  if (!delta) return;
  const next = pos + delta;

  if (rainbow.checked && Math.floor(next) !== Math.floor(pos)) {
    setColor(colors[wrap(Math.floor(delta > 0 ? next : pos))]);
  }
  if (spin.checked) angle += delta * 90;

  pos = wrap(next);
  placeSquare();

  if (trail.checked && (!lastDot || Math.hypot(x - lastDot.x, y - lastDot.y) > 8)) addTrailDot();
}

function moveToPoint(px, py) {
  let delta = nearestPos(px, py) - pos;
  if (delta > SIDES / 2) delta -= SIDES;
  if (delta < -SIDES / 2) delta += SIDES;
  moveBy(delta);
}

function nearestPos(px, py) {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < SIDES; i++) {
    const a = points[i], b = points[(i + 1) % SIDES];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
    const dist = Math.hypot(a.x + dx * t - px, a.y + dy * t - py);
    if (dist < bestDist) {
      bestDist = dist;
      best = i + t;
    }
  }
  return best;
}

function setColor(color) {
  square.style.backgroundColor = color;
  square.style.boxShadow = `0 0 18px ${color}`;
  picker.value = color;
  for (const s of swatches.children) s.classList.toggle("active", s.dataset.color === color);
}

const randomColor = () => setColor("#" + Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0"));

function addTrailDot() {
  const dot = document.createElement("div");
  dot.className = "dot";
  dot.style.background = picker.value;
  dot.style.transform = `translate(${x - 7}px, ${y - 7}px)`;
  dot.onanimationend = () => dot.remove();
  stage.appendChild(dot);
  lastDot = { x, y };
}

function clearTrail() {
  stage.querySelectorAll(".dot").forEach(d => d.remove());
  lastDot = null;
}

function setDirection(d) {
  direction = d;
  dirBtn.textContent = d === 1 ? "Scroll: clockwise" : "Scroll: anticlockwise";
}

function setTheme(light) {
  document.body.classList.toggle("light", light);
  themeBtn.textContent = light ? "Dark mode" : "Light mode";
  try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) {}
}

function resetAll() {
  pos = angle = 0;
  setDirection(1);
  document.querySelectorAll(".controls input").forEach(i => {
    if (i.type === "checkbox") i.checked = i.defaultChecked;
    else i.value = i.defaultValue;
  });
  square.classList.remove("pulse");
  clearTrail();
  setColor(colors[0]);
  drawTrack();
}

function endDrag() {
  if (drag && drag.onSquare && !drag.moved) randomColor();
  drag = null;
  stage.classList.remove("dragging");
}

stage.addEventListener("pointerdown", e => {
  const box = stage.getBoundingClientRect();
  drag = { onSquare: e.target === square, startX: e.clientX, startY: e.clientY, moved: false, box };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add("dragging");
  if (!drag.onSquare) moveToPoint(e.clientX - box.left, e.clientY - box.top);
});

stage.addEventListener("pointermove", e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4) drag.moved = true;
  if (drag.moved) moveToPoint(e.clientX - drag.box.left, e.clientY - drag.box.top);
});

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

stage.addEventListener("wheel", e => {
  e.preventDefault();
  const scale = e.deltaMode === 1 ? 16 : 1;
  const amount = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  moveBy(amount * scale * speed.value * 0.0005 * direction);
}, { passive: false });

square.addEventListener("keydown", e => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];

  if (step && e.shiftKey) {
    const target = step > 0 ? Math.floor(pos) + 1 : Math.ceil(pos) - 1;
    moveBy(target - pos);
  } else if (step) {
    moveBy(step * speed.value * 0.01);
  } else if (e.key === " " || e.key === "Enter") {
    randomColor();
  } else if (e.key === "Home") {
    moveBy(pos > SIDES / 2 ? SIDES - pos : -pos);
  } else {
    return;
  }
  e.preventDefault();
});

dirBtn.addEventListener("click", () => setDirection(-direction));
$("resetBtn").addEventListener("click", resetAll);
themeBtn.addEventListener("click", () => setTheme(!document.body.classList.contains("light")));

swatches.addEventListener("click", e => {
  if (e.target.dataset.color) setColor(e.target.dataset.color);
});

picker.addEventListener("input", () => setColor(picker.value));
pulse.addEventListener("change", () => square.classList.toggle("pulse", pulse.checked));

trail.addEventListener("change", () => {
  if (!trail.checked) clearTrail();
});

size.addEventListener("input", drawTrack);
window.addEventListener("resize", drawTrack);

let savedTheme = null;
try { savedTheme = localStorage.getItem("theme"); } catch (e) {}
setTheme(savedTheme === "light");
setColor(colors[0]);
drawTrack();
