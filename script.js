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
"Московский": { bonus:"Быстрый реген" },
"Кировский": { bonus:"Атака дешевле" },
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

// ===== СТАРТ =====
function showStart() {
let html = "<h2>Выбери район</h2>";

for (let c in clans) {
html += `<button onclick="selectClan('${c}')">${c}<br>${clans[c].bonus}</button>`;
}

document.getElementById("start").innerHTML = html;
}

// ===== ВЫБОР =====
function selectClan(c) {

clan = c;

if (c === "Ново-Савиновский") maxEnergy += 3;

save();
openTab("main");
update();
}

// ===== ЭНЕРГИЯ =====
function regen() {
let now = Date.now();
let diff = Math.floor((now - lastEnergy)/60000);

if (diff > 0) {
energy = Math.min(maxEnergy, energy + diff);
lastEnergy = now;
}

document.getElementById("timer").innerText =
"Следующая энергия через ~60 сек";
}

// ===== ДЕЙСТВИЯ =====
function mission() {

if (energy < 2) return log("❌ Нет энергии");

energy -= 2;

let gain = 10 + agility;

if (clan === "Приволжский") gain *= 1.3;

points += Math.floor(gain);
agility++;

log("🗡 Миссия: +" + gain);

save();
update();
}

function attack() {

let cost = 5;
if (clan === "Кировский") cost = 4;

if (energy < cost) return log("❌ Нет энергии");

energy -= cost;

let gain = 15 + strength;

if (clan === "Авиастрой") gain *= 1.4;

points += Math.floor(gain);
strength++;

log("💣 Атака: +" + gain);

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

log("🎉 Активность: +" + gain);

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

// ===== UPDATE =====
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
});
}

// ===== LOAD =====
async function load() {

let { data } = await db
.from("players")
.select("*")
.eq("id", id)
.maybeSingle();

if (!data) {
showStart();
return;
}

points = data.points;
energy = data.energy;
maxEnergy = data.max_energy;
clan = data.clan;

strength = data.strength;
agility = data.agility;
charisma = data.charisma;

openTab("main");
update();
}

// ===== LOOP =====
setInterval(()=>{
regen();
update();
},1000);

load();