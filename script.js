// 1. ПОДКЛЮЧЕНИЕ (URL ИСПРАВЛЕН!)
const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";


const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
let tgUser = tg.initDataUnsafe?.user;

// ВАЖНО: ID всегда один и тот же
let id = tgUser?.id
? "tg_" + tgUser.id
: (localStorage.getItem("uid") || ("user_" + Math.random().toString(36).substr(2,9)));

localStorage.setItem("uid", id);

let username = tgUser?.username || "Игрок_" + id.slice(-4);

// ===== DATA =====
let player = {
points:0,
energy:10,
maxEnergy:10,
lastEnergy:Date.now(),
strength:1,
agility:1,
charisma:1,
clan:null
};

// ===== КЛАНЫ =====
const clansInfo = {
"Вахитовский": "🎉 Активность +30%",
"Авиастрой": "💣 Атака +40%",
"Приволжский": "🗡 Миссии +30%",
"Советский": "+10% ко всему",
"Московский": "⚡ быстрее энергия",
"Кировский": "💣 атака дешевле",
"Ново-Савиновский": "+3 энергия"
};

// ===== LEVEL =====
function getLevel(p){
return 1 + Math.floor((p.strength+p.agility+p.charisma)/10);
}

// ===== SAVE =====
async function save(){
await db.from("players").upsert({
id,
username,
...player
},{onConflict:"id"});
}

// ===== LOAD =====
async function load(){

let {data, error} = await db.from("players")
.select("*")
.eq("id", id)
.maybeSingle();

if(error){
console.log("Ошибка загрузки:", error);
}

if(!data){
console.log("Создаем нового игрока");

await save();
showStart();
return;
}

player = data;

if(!player.clan){
showStart();
return;
}

openTab("main");
update();
}

// ===== RESET =====
async function resetGame(){

await db.from("players").delete().eq("id", id);

localStorage.removeItem("uid");

location.reload();
}

// ===== UI =====
function openTab(id){
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

// ===== START =====
function showStart(){

let html="<h2>Выбери район</h2>";

for(let c in clansInfo){
html+=`<button onclick="chooseClan('${c}')">
${c}<br><small>${clansInfo[c]}</small> </button>`;
}

document.getElementById("start").innerHTML = html;
openTab("start");
}

async function chooseClan(c){
player.clan = c;

if(c==="Ново-Савиновский") player.maxEnergy+=3;

await save();

openTab("main");
update();
}

// ===== ACTIONS =====
async function mission(){
if(player.energy<2) return;

player.energy-=2;

let gain = 10 + player.agility;
player.points += gain;
player.agility++;

await save();
update();
}

async function activity(){
if(player.energy<1) return;

player.energy--;

let gain = 8 + player.charisma;
player.points += gain;
player.charisma++;

await save();
update();
}

// ===== ATTACK =====
async function attackPlayer(){

if(player.energy<5) return;

player.energy-=5;
player.points += 10 + player.strength;
player.strength++;

await save();
update();
}

// ===== ТОП =====
async function showTop(){

openTab("top");

let {data} = await db.from("players")
.select("*")
.order("points",{ascending:false});

let clans = {};

data.forEach(p=>{
if(!clans[p.clan]) clans[p.clan]=[];
clans[p.clan].push(p);
});

let html="<h2>🏆 ТОП</h2>";

Object.keys(clans).forEach(c=>{

let sum = clans[c].reduce((a,b)=>a+b.points,0);

html+=`<h3>${c} (${sum})</h3>`;

clans[c].forEach(p=>{
html+=`

<div>
${p.username} | lvl ${getLevel(p)} | ${p.points}
</div>
`;
});

});

document.getElementById("topList").innerHTML = html;
}

// ===== UPDATE =====
function update(){

document.getElementById("username").innerText = username;
document.getElementById("clan").innerText = player.clan;
document.getElementById("bonus").innerText = clansInfo[player.clan];

document.getElementById("points").innerText = player.points;
document.getElementById("energy").innerText = player.energy;
document.getElementById("maxEnergy").innerText = player.maxEnergy;

document.getElementById("strength").innerText = player.strength;
document.getElementById("agility").innerText = player.agility;
document.getElementById("charisma").innerText = player.charisma;
}

// ===== ENERGY =====
function regen(){

let now = Date.now();
let diff = Math.floor((now - player.lastEnergy)/60000);

if(diff>0){
player.energy = Math.min(player.maxEnergy, player.energy + diff);
player.lastEnergy = now;
}

let next = 60000 - (now - player.lastEnergy);
if(next<0) next = 60000;

document.getElementById("timer").innerText = Math.floor(next/1000)+" сек";
}

// ===== LOOP =====
setInterval(()=>{
regen();
update();
},1000);

// ===== START =====
load();
