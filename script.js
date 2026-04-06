const SUPABASE_URL = "ТВОЙ_URL";
const SUPABASE_KEY = "ТВОЙ_ANON_KEY";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

let userId = user?.id?.toString();
let username = user?.username || "Игрок";

// данные
let points = 0;
let energy = 10;
let maxEnergy = 10;
let lastEnergyTime = Date.now();
let clan = null;

let strength = 1;
let agility = 1;
let charisma = 1;
let level = 1;

// ===== РАЙОНЫ =====
const clans = {
"Вахитовский": { bonus:"харизма", img:"https://i.imgur.com/9XnKZ6X.png" },
"Приволжский": { bonus:"ловкость" },
"Советский": { bonus:"сила" },
"Московский": { bonus:"харизма" },
"Кировский": { bonus:"сила" },
"Авиастрой": { bonus:"ловкость" },
"Ново-Савиновский": { bonus:"харизма" }
};

// ===== UI =====
function openTab(id) {
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

// ===== СТАРТ =====
function showStart() {

let html = "<h3>Выбери район</h3>";

for (let c in clans) {
html += `<button onclick="selectClan('${c}')">${c} (+${clans[c].bonus})</button>`;
}

document.getElementById("startScreen").innerHTML = html;
}

// ===== ВЫБОР =====
function selectClan(c) {

clan = c;

if (clans[c].bonus === "сила") strength += 2;
if (clans[c].bonus === "ловкость") agility += 2;
if (clans[c].bonus === "харизма") charisma += 2;

save();

openTab("mainScreen");
updateUI();
}

// ===== ЭНЕРГИЯ =====
function regenEnergy() {

let now = Date.now();
let diff = Math.floor((now - lastEnergyTime)/60000); // минуты

if (diff > 0) {
energy = Math.min(maxEnergy, energy + diff);
lastEnergyTime = now;
}

let next = 60 - ((now - lastEnergyTime)/1000);

document.getElementById("timer").innerText =
"До энергии: " + Math.floor(next) + " сек";
}

// ===== ДЕЙСТВИЯ =====
function mission() {

if (energy < 2) return alert("Нет энергии");

energy -= 2;
points += 10 + agility;
agility++;

save();
updateUI();
}

function attack() {

if (energy < 5) return alert("Нет энергии");

energy -= 5;
points += 15 + strength;
strength++;

save();
updateUI();
}

function activity() {

if (energy < 1) return alert("Нет энергии");

energy -= 1;
points += 8;
charisma++;

save();
updateUI();
}

// ===== UI =====
function updateUI() {

document.getElementById("username").innerText = "@" + username;
document.getElementById("clan").innerText = clan;
document.getElementById("points").innerText = points;
document.getElementById("energy").innerText = energy;
document.getElementById("maxEnergy").innerText = maxEnergy;

document.getElementById("strength").innerText = strength;
document.getElementById("agility").innerText = agility;
document.getElementById("charisma").innerText = charisma;

// прокачка персонажа
let img = document.getElementById("character");

if (points > 100) img.src = "https://i.imgur.com/JYUB0m3.png";
if (points > 300) img.src = "https://i.imgur.com/7yUvePI.png";
}

// ===== SAVE =====
async function save() {

await client.from("players").upsert({
id:userId,
username,
points,
energy,
max_energy:maxEnergy,
last_energy_time:lastEnergyTime,
clan,
strength,
agility,
charisma,
level
});
}

// ===== LOAD =====
async function load() {

let { data } = await client
.from("players")
.select("*")
.eq("id", userId)
.maybeSingle();

if (!data) {
showStart();
return;
}

points = data.points;
energy = data.energy;
maxEnergy = data.max_energy;
lastEnergyTime = data.last_energy_time;
clan = data.clan;

strength = data.strength;
agility = data.agility;
charisma = data.charisma;

openTab("mainScreen");
updateUI();
}

// ===== LOOP =====
setInterval(()=>{
regenEnergy();
updateUI();
},1000);

// ===== START =====
load();