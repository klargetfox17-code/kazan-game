const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
tg.expand();

let tgUser = tg.initDataUnsafe?.user;

// 💥 СТАБИЛЬНЫЙ ID
let id;

if (tgUser && tgUser.id) {
  id = "tg_" + tgUser.id;
} else {
  id = localStorage.getItem("uid");

  if (!id) {
    id = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("uid", id);
  }
}

let username = tgUser?.username || "Игрок_" + id.slice(-4);

// ===== ДАННЫЕ =====
let points = 0;
let energy = 10;
let maxEnergy = 10;
let lastEnergy = Date.now();

let strength = 1;
let agility = 1;
let charisma = 1;

let clan = null;

// ===== РАЙОНЫ =====
const clans = {
"Вахитовский": "🎉 +30% к активности",
"Авиастрой": "💣 +40% к атакам",
"Приволжский": "🗡 +30% к миссиям",
"Советский": "📈 +10% ко всему",
"Московский": "⚡ энергия x2",
"Кировский": "💣 атака -1 энергия",
"Ново-Савиновский": "🔋 +3 энергия"
};

// ===== UI =====
function openTab(id) {
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

function log(text) {
console.log(text);

let el = document.getElementById("log");
if (el) el.innerHTML = text + "<br>" + el.innerHTML;
}

// ===== SAVE =====
async function save() {

let { data, error } = await db
.from("players")
.upsert({
id,
username,
points,
energy,
max_energy:maxEnergy,
last_energy:lastEnergy,
clan,
strength,
agility,
charisma
}, { onConflict:"id" });

if (error) {
log("❌ SAVE ERROR: " + error.message);
}
}

// ===== LOAD =====
async function load() {

log("ID: " + id);

let { data, error } = await db
.from("players")
.select("*")
.eq("id", id)
.single();

if (error) {

if (error.code === "PGRST116") {
// 💥 НЕТ ИГРОКА → СОЗДАЁМ

log("🆕 создаю игрока");

let { error: createError } = await db.from("players").insert({
id,
username,
points:0,
energy:10,
max_energy:10,
last_energy:Date.now(),
strength:1,
agility:1,
charisma:1,
clan:null
});

if (createError) {
log("❌ CREATE ERROR: " + createError.message);
return;
}

showStart();
return;
}

log("❌ LOAD ERROR: " + error.message);
return;
}

// ===== ЕСЛИ НАШЛИ =====
points = data.points;
energy = data.energy;
maxEnergy = data.max_energy;
lastEnergy = data.last_energy;
clan = data.clan;

strength = data.strength;
agility = data.agility;
charisma = data.charisma;

if (!clan) return showStart();

openTab("main");
update();
}

// ===== START =====
function showStart() {
let html = "<h2>Выбери район</h2>";

for (let c in clans) {
html += `<button onclick="selectClan('${c}')">${c}<br>${clans[c]}</button>`;
}

document.getElementById("start").innerHTML = html;
}

// ===== SELECT =====
async function selectClan(c) {
clan = c;

if (c === "Ново-Савиновский") maxEnergy += 3;

await save();

openTab("main");
update();
}

// ===== UPDATE =====
function update() {

document.getElementById("username").innerText = username;
document.getElementById("clan").innerText = clan;
document.getElementById("points").innerText = points;
document.getElementById("energy").innerText = energy;
}

// ===== LOOP =====
setInterval(update, 1000);

// ===== START =====
load();