const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

let id = user?.id.toString();
let username = user?.username || "Игрок";

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
"Вахитовский": { bonus:"Активность +30%" },
"Авиастрой": { bonus:"Атаки +40%" },
"Приволжский": { bonus:"Миссии +30%" },
"Советский": { bonus:"Все +10%" },
"Московский": { bonus:"Реген быстрее" },
"Кировский": { bonus:"Атака дешевле (-1 энергия)" },
"Ново-Савиновский": { bonus:"Энергия +3" }
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

// скорость (московский быстрее)
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
html += `<button onclick="selectClan('${c}')">
<b>${c}</b><br>${clans[c].bonus}
</button>`;
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

// 🗡 МИССИЯ
function mission() {

if (energy < 2) return log("❌ Нет энергии");

energy -= 2;

let gain = 10 + agility;

if (clan === "Приволжский") gain *= 1.3;
if (clan === "Советский") gain *= 1.1;

points += Math.floor(gain);
agility++;

log(`🗡 Миссия: +${Math.floor(gain)} очков | +1 ловкость`);

save();
update();
}

// 💣 АТАКА (ПРОСТАЯ)
async function attack() {

let cost = clan === "Кировский" ? 4 : 5;

if (energy < cost) return log("❌ Нет энергии");

energy -= cost;

// выбираем случайного игрока
let { data } = await db
.from("players")
.select("*")
.neq("id", id)
.limit(1);

if (!data || data.length === 0) {
log("😴 Нет целей для атаки");
return;
}

let target = data[0];

// шанс успеха
let power = strength + Math.random()*10;
let enemy = target.strength + Math.random()*10;

if (power > enemy) {

let steal = 10;

await db.from("players")
.update({ points: target.points - steal })
.eq("id", target.id);

points += steal;

log(`💣 Ты ограбил ${target.username} (-${steal} у него)`);

} else {
log("💥 Атака провалена");
}

strength++;

save();
update();
}

// 🎉 АКТИВНОСТЬ
function activity() {

if (energy < 1) return log("❌ Нет энергии");

energy--;

let gain = 8 + charisma;

if (clan === "Вахитовский") gain *= 1.3;
if (clan === "Советский") gain *= 1.1;

points += Math.floor(gain);
charisma++;

log(`🎉 Активность: +${Math.floor(gain)} очков | +1 харизма`);

save();
update();
}

// ===== ТОП =====
async function loadTop() {

openTab("top");

let { data } = await db
.from("players")
.select("*")
.order("points", { ascending:false })
.limit(20);

let html = "";

data.forEach(p=>{
html += `<p>${p.username} — ${p.points} (${p.clan})</p>`;
});

document.getElementById("topList").innerHTML = html;
}

// ===== ОБНОВЛЕНИЕ UI =====
function update() {

document.getElementById("username").innerText = "@" + username;
document.getElementById("clan").innerText = clan;
document.getElementById("bonus").innerText = clans[clan]?.bonus;

document.getElementById("points").innerText = points;
document.getElementById("energy").innerText = energy;
document.getElementById("maxEnergy").innerText = maxEnergy;

document.getElementById("strength").innerText = strength;
document.getElementById("agility").innerText = agility;
document.getElementById("charisma").innerText = charisma;

// 👇 добавим отображение в actions
if (document.getElementById("actionsStats")) {
document.getElementById("actionsStats").innerHTML =
`Энергия: ${energy}/${maxEnergy} | 💪${strength} 🏃${agility} 🗣${charisma}`;
}
}

// ===== СОХРАНЕНИЕ =====
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
});
}

// ===== ЗАГРУЗКА =====
async function load() {

let { data } = await db
.from("players")
.select("*")
.eq("id", id)
.maybeSingle();

if (!data) {

// 👉 СОЗДАЕМ ИГРОКА
await db.from("players").insert({
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

// ===== START =====
load();