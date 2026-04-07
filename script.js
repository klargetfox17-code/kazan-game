// 1. ПОДКЛЮЧЕНИЕ (URL ИСПРАВЛЕН!)
const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";




const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
let tgUser = tg.initDataUnsafe?.user;

let id = tgUser?.id ? "tg_" + tgUser.id :
localStorage.getItem("uid") || ("user_" + Math.random().toString(36).substr(2,9));

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
"Вахитовский": "🎉 Активность даёт больше очков (+30%)",
"Авиастрой": "💣 Сильнее атаки (+40%)",
"Приволжский": "🗡 Миссии выгоднее (+30%)",
"Советский": "📈 Универсальный бонус (+10%)",
"Московский": "⚡ Быстрое восстановление энергии",
"Кировский": "💣 Дешевые атаки (-1 энергия)",
"Ново-Савиновский": "🔋 Больше энергии (+3)"
};

// ===== UI =====
function openTab(id){
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

function log(text){
let el=document.getElementById("actionsLog");
if(el) el.innerHTML=text+"<br>"+el.innerHTML;
}

// ===== RESET (ФИКС) =====
async function resetGame(){
localStorage.removeItem("uid");

await db.from("players").delete().eq("id", id);

// создаём новый ID
id = "user_" + Math.random().toString(36).substr(2,9);
localStorage.setItem("uid", id);

player = {
points:0, energy:10, maxEnergy:10,
lastEnergy:Date.now(),
strength:1, agility:1, charisma:1,
clan:null
};

showStart();
}

// ===== ЭНЕРГИЯ =====
function regen(){
let now = Date.now();
let speed = player.clan==="Московский" ? 30000 : 60000;

if(now < player.lastEnergy) player.lastEnergy = now;

let diff = Math.floor((now - player.lastEnergy)/speed);

if(diff>0){
player.energy = Math.min(player.maxEnergy, player.energy + diff);
player.lastEnergy = now;
}

let next = speed - (now - player.lastEnergy);
if(next < 0) next = speed;

document.getElementById("timer").innerText = Math.floor(next/1000)+" сек";
}

// ===== СОХРАНЕНИЕ =====
async function save(){
await db.from("players").upsert({
id,
username,
...player
},{onConflict:"id"});
}

// ===== ЗАГРУЗКА =====
async function load(){
let {data} = await db.from("players")
.select("*")
.eq("id", id)
.maybeSingle();

if(!data){
await save();
return showStart();
}

player = data;

if(!player.clan) return showStart();

openTab("main");
update();
}

// ===== СТАРТ =====
function showStart(){
let html="<h2>Выбери район</h2>";

for(let c in clansInfo){
html+=`<button onclick="chooseClan('${c}')">
${c}<br><small>${clansInfo[c]}</small>
</button>`;
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

// ===== ДЕЙСТВИЯ =====
async function mission(){
if(player.energy<2) return log("❌ Нет энергии");

player.energy-=2;

let gain = 10 + player.agility;
player.points += gain;
player.agility++;

log("🗡 Миссия: +" + gain);

await save();
update();
}

async function activity(){
if(player.energy<1) return log("❌ Нет энергии");

player.energy--;

let gain = 8 + player.charisma;
player.points += gain;
player.charisma++;

log("🎉 Активность: +" + gain);

await save();
update();
}

// ===== АТАКА =====
let selectedClan=null;

function openAttack(){
openTab("attack");

let html="<h2>Выбери район</h2>";

for(let c in clansInfo){
if(c!==player.clan)
html+=`<button onclick="selectClan('${c}')">${c}</button>`;
}

document.getElementById("attackUI").innerHTML=html;
}

function selectClan(c){
selectedClan=c;

document.getElementById("attackUI").innerHTML=`
<button onclick="attackClan()">💣 Удар по району</button>
<button onclick="loadPlayers('${c}')">👤 Ограбить игрока</button>
<button onclick="openAttack()">⬅ Назад</button>
`;
}

async function loadPlayers(c){
let {data}=await db.from("players")
.select("*")
.eq("clan",c)
.order("points",{ascending:false});

let html="<h2>Игроки</h2>";

data.forEach(p=>{
if(p.id!==id){
html+=`<button onclick="attackPlayer('${p.id}')">
${p.username} (${p.points})
</button>`;
}
});

html+=`<button onclick="selectClan('${c}')">⬅ Назад</button>`;

document.getElementById("attackUI").innerHTML=html;
}

async function attackPlayer(pid){
if(player.energy<5) return log("❌ Нет энергии");

player.energy-=5;

let {data:enemy}=await db.from("players")
.select("*")
.eq("id",pid)
.single();

let steal = 10 + player.strength;

player.points += steal;

await db.from("players")
.update({points: Math.max(0, enemy.points - steal)})
.eq("id",pid);

log("💣 Ограбление: +" + steal);

await save();
update();
}

// ===== ТОП =====
async function showTop(){
openTab("top");

let {data}=await db.from("players")
.select("*")
.order("points",{ascending:false});

let clans={};

data.forEach(p=>{
if(!clans[p.clan]) clans[p.clan]=[];
clans[p.clan].push(p);
});

let html="<h2>🏆 ТОП</h2>";

Object.keys(clans).forEach(c=>{
let sum = clans[c].reduce((a,b)=>a+b.points,0);

html+=`<div><h3>${c} (${sum})</h3>`;

clans[c].forEach(p=>{
html+=`<div>${p.username} — ${p.points}</div>`;
});

html+="</div>";
});

document.getElementById("topList").innerHTML=html;
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

// ===== LOOP =====
setInterval(()=>{
regen();
update();
},1000);

load();