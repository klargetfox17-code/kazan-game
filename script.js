const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

// всегда один и тот же id
let id = user?.id?.toString(); 

// Если открыли в браузере (для тестов)
if (!id) {
  id = localStorage.getItem("uid") || "test_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("uid", id);
}

let username = user?.username || user?.first_name || "Игрок_" + id.slice(-4)

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
"Вахитовский": "🎉 +30% к активности (быстрый фарм)",
"Авиастрой": "💣 +40% к атакам (агрессия)",
"Приволжский": "🗡 +30% к миссиям (рост)",
"Советский": "📈 +10% ко всему",
"Московский": "⚡ энергия быстрее x2",
"Кировский": "💣 атака дешевле (-1)",
"Ново-Савиновский": "🔋 +3 энергия максимум"
};

// ===== UI =====
function openTab(id) {
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

function log(text) {
let main = document.getElementById("log");
let act = document.getElementById("logActions");

if (main) main.innerHTML = text + "<br>" + main.innerHTML;
if (act) act.innerHTML = text + "<br>" + act.innerHTML;
}

// ===== RESET =====
function resetGame(){
localStorage.clear();
location.reload();
}

// ===== ТАЙМЕР =====
function regen() {
let now = Date.now();
let speed = clan === "Московский" ? 30000 : 60000;

let diff = Math.floor((now - lastEnergy) / speed);

if (diff > 0) {
energy = Math.min(maxEnergy, energy + diff);
lastEnergy += diff * speed;
}

let next = speed - (now - lastEnergy);

document.getElementById("timer").innerText =
Math.max(0, Math.floor(next/1000)) + " сек";
}

// ===== СТАРТ =====
function showStart() {
let html = "<h2>Выбери район</h2>";

for (let c in clans) {
html += `<button onclick="selectClan('${c}')">${c}<br><small>${clans[c]}</small></button>`;
}

document.getElementById("start").innerHTML = html;
}

// ===== ВЫБОР =====
async function selectClan(c) {
clan = c;

if (c === "Ново-Савиновский") maxEnergy += 3;

await save();

openTab("main");
update();
}

// ===== ДЕЙСТВИЯ =====
function mission() {
if (energy < 2) return log("❌ Нет энергии");

energy -= 2;

let gain = 10 + agility;
if (clan === "Приволжский") gain *= 1.3;
if (clan === "Советский") gain *= 1.1;

points += Math.floor(gain);
agility++;

log(`🗡 Миссия: +${Math.floor(gain)} очков`);

save();
update();
}

function activity() {
if (energy < 1) return log("❌ Нет энергии");

energy--;

let gain = 8 + charisma;
if (clan === "Вахитовский") gain *= 1.3;
if (clan === "Советский") gain *= 1.1;

points += Math.floor(gain);
charisma++;

log(`🎉 Активность: +${Math.floor(gain)} очков`);

save();
update();
}

// ===== АТАКА =====
let selectedClan = null;

function openAttack() {
let html = "<h3>Выбери район</h3>";

for (let c in clans) {
if (c !== clan)
html += `<button onclick="selectAttackClan('${c}')">${c}</button>`;
}

document.getElementById("attackUI").innerHTML = html;
}

function selectAttackClan(c) {
selectedClan = c;

document.getElementById("attackUI").innerHTML = `
<button onclick="attackClan()">💣 Удар по району</button>
<button onclick="loadPlayers('${c}')">👤 Удар по игроку</button>
`;
}

async function loadPlayers(c) {
let { data } = await db
.from("players")
.select("id, username, points")
.eq("clan", c);

if (!data || data.length === 0) {
log("❌ Нет игроков");
return;
}

let html = "<h3>Цель:</h3>";

data.forEach(p=>{
if (p.id !== id)
html += `<button onclick="attackPlayer('${p.id}','${p.username}')">
${p.username} (${p.points})
</button>`;
});

document.getElementById("attackUI").innerHTML = html;
}

async function attackPlayer(pid, name) {

let cost = clan === "Кировский" ? 4 : 5;

if (energy < cost) return log("❌ Нет энергии");

energy -= cost;

let { data } = await db
.from("players")
.select("points")
.eq("id", pid)
.single();

if (!data) return log("❌ Игрок не найден");

let steal = 15 + strength;

if (clan === "Авиастрой") steal *= 1.4;

await db.from("players")
.update({ points: Math.max(0, data.points - steal) })
.eq("id", pid);

points += Math.floor(steal);
strength++;

log(`💣 Ограбил ${name} на ${Math.floor(steal)}`);

save();
update();
}

async function attackClan() {

if (energy < 5) return log("❌ Нет энергии");

energy -= 5;

log(`💣 Удар по району ${selectedClan}`);

save();
update();
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
}, { onConflict: "id" });
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

// ===== ТОП =====
async function loadTop() {

openTab("top");

let { data } = await db
.from("players")
.select("username, points, clan")
.order("points", { ascending:false })
.limit(20);

let html = "";

data.forEach((p,i)=>{
html += `
<div class="card">
#${i+1} ${p.username}<br>
🏆 ${p.points}<br>
📍 ${p.clan || "нет"}
</div>
`;
});

document.getElementById("topList").innerHTML = html;
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