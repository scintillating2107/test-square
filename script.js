const $ = id => document.getElementById(id);
const stage = $("stage"), track = $("track"), square = $("square");
const playBtn = $("playBtn"), dirBtn = $("dirBtn"), themeBtn = $("themeBtn");
const speed = $("speed"), size = $("size"), picker = $("picker"), swatches = $("swatches");
const rainbow = $("rainbow"), spin = $("spin"), pulse = $("pulse"), trail = $("trail");

const colors = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#8338ec", "#ff006e"];

let points = [];
let current = 0;    
let progress = 0;   
let direction = 1;  
let angle = 0, x = 0, y = 0;
let playing = false, lastTime = null, trailTimer = 0;

swatches.innerHTML = colors.map(c => `<span style="background:${c}" data-color="${c}"></span>`).join("");

const nextCorner = () => (current + direction + 6) % 6;

// 6 corners of a hexagon 
function drawTrack() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const r = Math.min(+size.value, Math.min(w, h) / 2 - 40);

  points = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    points.push({ x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a) });
  }

  track.innerHTML = `<polygon points="${points.map(p => p.x + "," + p.y).join(" ")}"></polygon>` +
    points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4"></circle>`).join("");
  placeSquare();
}

function placeSquare() {
  const a = points[current], b = points[nextCorner()];
  const half = square.offsetWidth / 2;
  x = a.x + (b.x - a.x) * progress;
  y = a.y + (b.y - a.y) * progress;
  square.style.transform = `translate(${x - half}px, ${y - half}px) rotate(${angle}deg)`;
}

function setColor(color) {
  square.style.backgroundColor = color;
  square.style.boxShadow = `0 0 18px ${color}`;
  picker.value = color;
  for (const s of swatches.children) s.classList.toggle("active", s.dataset.color === color);
}


function addTrailDot() {
  const dot = document.createElement("div");
  dot.className = "dot";
  dot.style.background = picker.value;
  dot.style.transform = `translate(${x - 7}px, ${y - 7}px)`;
  dot.onanimationend = () => dot.remove();
  stage.appendChild(dot);
}

const clearTrail = () => stage.querySelectorAll(".dot").forEach(d => d.remove());

function loop(time) {
  if (!playing) return;
  const dt = (time - (lastTime ?? time)) / 1000;
  lastTime = time;

  progress += dt * speed.value * 0.25;
  while (progress >= 1) {
    progress -= 1;
    current = nextCorner();
    if (rainbow.checked) setColor(colors[current]);
  }

  if (spin.checked) angle += dt * 120 * direction;
  placeSquare();

  trailTimer += dt;
  if (trail.checked && trailTimer > 0.04) {
    addTrailDot();
    trailTimer = 0;
  }
  requestAnimationFrame(loop);
}

function setPlaying(value) {
  playing = value;
  playBtn.textContent = playing ? "Pause" : "Start";
  if (playing) {
    lastTime = null;
    requestAnimationFrame(loop);
  }
}

function setTheme(light) {
  document.body.classList.toggle("light", light);
  themeBtn.textContent = light ? "Dark mode" : "Light mode";
  try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) {}
}


function resetAll() {
  setPlaying(false);
  current = progress = angle = 0;
  direction = 1;
  dirBtn.textContent = "Clockwise";
  document.querySelectorAll(".controls input").forEach(i => {
    if (i.type === "checkbox") i.checked = i.defaultChecked;
    else i.value = i.defaultValue;
  });
  square.classList.remove("pulse");
  clearTrail();
  setColor(colors[0]);
  drawTrack();
}

dirBtn.onclick = () => {
  // flip direction but stay on the same side
  current = nextCorner();
  progress = 1 - progress;
  direction *= -1;
  dirBtn.textContent = direction === 1 ? "Clockwise" : "Anticlockwise";
  placeSquare();
};

playBtn.onclick = () => setPlaying(!playing);
$("resetBtn").onclick = resetAll;
themeBtn.onclick = () => setTheme(!document.body.classList.contains("light"));
swatches.onclick = e => e.target.dataset.color && setColor(e.target.dataset.color);
picker.oninput = () => setColor(picker.value);
square.onclick = () => setColor("#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"));
pulse.onchange = () => square.classList.toggle("pulse", pulse.checked);
trail.onchange = () => trail.checked || clearTrail();
size.oninput = drawTrack;
window.onresize = drawTrack;

let saved = null;
try { saved = localStorage.getItem("theme"); } catch (e) {}
setTheme(saved === "light");
setColor(colors[0]);
drawTrack();
