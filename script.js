// 1. ПОДКЛЮЧЕНИЕ (URL ИСПРАВЛЕН!)
const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";


const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
let tgUser = tg.initDataUnsafe?.user;

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
"Авиастрой": "💣 +40% к атаке",
"Приволжский": "🗡 +30% к миссиям",
"Советский": "📈 +10% ко всему",
"Московский": "⚡ быстрее энергия",
"Кировский": "💣 атака дешевле",
"Ново-Савиновский": "🔋 +3 энергия"
};

// ===== UI =====
function openTab(id) {
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

// ===== LOG =====
function log(text) {
let el = document.getElementById("attackLog");
if (el) el.innerHTML = text + "<br>" + el.innerHTML;
}

// ===== RESET =====
async function resetGame(){
localStorage.clear();
await db.from("players").delete().eq("id", id);
location.reload();
}

// ===== ТАЙМЕР =====
function regen() {
let now = Date.now();
let speed = clan === "Московский" ? 30000 : 60000;

if (now < lastEnergy) lastEnergy = now;

let diff = Math.floor((now - lastEnergy) / speed);

if (diff > 0) {
energy = Math.min(maxEnergy, energy + diff);
lastEnergy = now;
}

let next = speed - (now - lastEnergy);
if (next < 0) next = speed;

document.getElementById("timer").innerText =
Math.floor(next/1000) + " сек";
}

// ===== ТОП =====
async function showTop(){
openTab("top");

let { data } = await db
.from("players")
.select("username, points, clan")
.order("points", { ascending:false })
.limit(20);

let html = "<h2>🏆 ТОП игроков</h2>";

data.forEach((p,i)=>{
html += `<div>${i+1}. ${p.username} (${p.clan}) - ${p.points}</div>`;
});

document.getElementById("topList").innerHTML = html;
}

// ===== START =====
function showStart() {
let html = "<h2>Выбери район</h2>";

for (let c in clans) {
html += `<button onclick="selectClan('${c}')">${c}<br><small>${clans[c]}</small></button>`;
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

// ===== ДЕЙСТВИЯ =====
function mission() {
if (energy < 2) return;

energy -= 2;
let gain = 10 + agility;
points += gain;
agility++;

save(); update();
}

function activity() {
if (energy < 1) return;

energy--;
let gain = 8 + charisma;
points += gain;
charisma++;

save(); update();
}

// ===== АТАКА =====
let selectedClan = null;

function openAttack() {
openTab("attack");

let html = "<h2>Выбери район</h2>";

for (let c in clans) {
if (c !== clan)
html += `<button onclick="selectAttackClan('${c}')">${c}</button>`;
}

document.getElementById("attackUI").innerHTML = html;
}

function selectAttackClan(c) {
selectedClan = c;

document.getElementById("attackUI").innerHTML = `
<button onclick="attackClan()">
💣 Удар по району (-5 энергии)<br>
<small>Ослабляет весь район (глобальный удар)</small>
</button>

<button onclick="loadPlayers('${c}')">
👤 Удар по игроку (-5 энергии)<br>
<small>Грабишь игрока и забираешь очки</small>
</button>

<button onclick="openTab('actions')">⬅ Назад</button>
`;
}

async function loadPlayers(c) {
let { data } = await db
.from("players")
.select("id, username, points")
.eq("clan", c);

let html = "<h2>Выбери цель</h2>";

data.forEach(p=>{
if (p.id !== id)
html += `<button onclick="attackPlayer('${p.id}','${p.username}')">
${p.username} (${p.points})
</button>`;
});

html += `<button onclick="openTab('actions')">⬅ Назад</button>`;

document.getElementById("attackUI").innerHTML = html;
}

async function attackPlayer(pid, name) {
if (energy < 5) return;

energy -= 5;

let { data } = await db
.from("players")
.select("points")
.eq("id", pid)
.single();

let steal = 15 + strength;

await db.from("players")
.update({ points: Math.max(0, data.points - steal) })
.eq("id", pid);

points += steal;
strength++;

log(`💣 Ограблен ${name} (-${steal})`);

save(); update();
}

function attackClan() {
if (energy < 5) return;

energy -= 5;

log(`💣 Удар по району ${selectedClan}`);

save(); update();
}

// ===== SAVE =====
async function save() {
await db.from("players").upsert({
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
}

// ===== LOAD =====
async function load() {

let { data } = await db
.from("players")
.select("*")
.eq("id", id)
.maybeSingle();

if (!data) {
await db.from("players").insert({
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
showStart();
return;
}

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

// ===== UPDATE =====
function update() {

document.getElementById("username").innerText = username;
document.getElementById("clan").innerText = clan;
document.getElementById("bonus").innerText = clans[clan];

document.getElementById("points").innerText = points;
document.getElementById("energy").innerText = energy;
document.getElementById("maxEnergy").innerText = maxEnergy;

document.getElementById("m_strength").innerText = strength;
document.getElementById("m_agility").innerText = agility;
document.getElementById("m_charisma").innerText = charisma;

document.getElementById("actionsStats").innerHTML = `
Энергия: ${energy}/${maxEnergy}<br>
💪 Сила: ${strength}<br>
⚡ Ловкость: ${agility}<br>
🎭 Харизма: ${charisma}
`;
}

// ===== LOOP =====
setInterval(()=>{
regen();
update();
},1000);

load();