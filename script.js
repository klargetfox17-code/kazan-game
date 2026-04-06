const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

// гарантированный id
let id = user?.id ? user.id.toString() : localStorage.getItem("uid");

if (!id) {
  id = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("uid", id);
}

let username = user?.username || "Игрок_" + id.slice(-4);

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
"Вахитовский": "Активность +30%",
"Авиастрой": "Атаки +40%",
"Приволжский": "Миссии +30%",
"Советский": "Все +10%",
"Московский": "Реген быстрее",
"Кировский": "Атака дешевле",
"Ново-Савиновский": "Энергия +3"
};

// ===== UI =====
function openTab(id) {
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

function log(text) {
let el = document.getElementById("log");
el.innerHTML = text + "<br>" + el.innerHTML;
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
"⏳ До энергии: " + Math.floor(next/1000) + " сек";
}

// ===== СТАРТ =====
function showStart() {
let html = "<h2>Выбери район</h2>";

for (let c in clans) {
html += `<button onclick="selectClan('${c}')">${c}<br>${clans[c]}</button>`;
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

points += Math.floor(gain);
agility++;

log(`🗡 +${Math.floor(gain)} очков`);

save();
update();
}

function activity() {

if (energy < 1) return log("❌ Нет энергии");

energy--;

let gain = 8 + charisma;
if (clan === "Вахитовский") gain *= 1.3;

points += Math.floor(gain);
charisma++;

log(`🎉 +${Math.floor(gain)} очков`);

save();
update();
}

// ===== АТАКА =====
let selectedClan = null;

function openAttack() {
let html = "<h3>Выбери район</h3>";

for (let c in clans) {
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

async function attackClan() {

if (energy < 5) return log("❌ Нет энергии");

energy -= 5;

let { error } = await db.rpc("damage_clan", {
clan_name: selectedClan,
damage: 20
});

if (error) log("❌ Ошибка: " + error.message);

log("💣 Удар по району");

save();
update();
}

async function loadPlayers(c) {

let { data } = await db
.from("players")
.select("*")
.eq("clan", c);

let html = "<h3>Выбери цель</h3>";

data.forEach(p=>{
if (p.id !== id)
html += `<button onclick="attackPlayer('${p.id}','${p.username}')">
${p.username} (${p.points})
</button>`;
});

document.getElementById("attackUI").innerHTML = html;
}

async function attackPlayer(pid, name) {

if (energy < 5) return log("❌ Нет энергии");

energy -= 5;

let { data } = await db
.from("players")
.select("*")
.eq("id", pid)
.single();

let steal = 15;

await db.from("players")
.update({ points: Math.max(0, data.points - steal) })
.eq("id", pid);

points += steal;

log(`💣 Ты ограбил ${name}`);

save();
update();
}

// ===== SAVE =====
async function save() {

let { error } = await db.from("players").upsert({
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
});

if (error) {
console.log(error);
log("❌ Ошибка сохранения: " + error.message);
}
}

// ===== LOAD =====
async function load() {

let { data, error } = await db
.from("players")
.select("*")
.eq("id", id)
.maybeSingle();

if (error) {
log("❌ Ошибка загрузки: " + error.message);
return;
}

if (!data) {

// СОЗДАЕМ
let { error: e } = await db.from("players").insert({
id,
username,
points:0,
energy:10,
max_energy:10,
last_energy:Date.now(),
strength:1,
agility:1,
charisma:1
});

if (e) {
log("❌ Ошибка создания: " + e.message);
}

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

if (!clan) {
showStart();
return;
}

openTab("main");
update();
}

// ===== LOOP =====
setInterval(()=>{
regen();
update();
},1000);

load();