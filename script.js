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

// ===== ДАННЫЕ =====
let points=0, energy=10, maxEnergy=10, lastEnergy=Date.now();
let strength=1, agility=1, charisma=1;
let clan=null;

// ===== КЛАНЫ =====
const clans = {
"Вахитовский": "🎉 Бонус: больше очков за активность",
"Авиастрой": "💣 Бонус: сильнее атаки",
"Приволжский": "🗡 Бонус: больше очков за миссии",
"Советский": "📈 Бонус: небольшой буст ко всему",
"Московский": "⚡ Бонус: энергия быстрее восстанавливается",
"Кировский": "💣 Бонус: атака дешевле",
"Ново-Савиновский": "🔋 Бонус: больше максимум энергии"
};

// ===== LVL =====
function getLevel(){
return 1 + Math.floor((strength + agility + charisma)/10);
}

// ===== ШАНС =====
function chance(stat){
return Math.min(95, 60 + stat*2);
}

function roll(stat){
return Math.random()*100 < chance(stat);
}

// ===== UI =====
function openTab(id){
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

// ===== LOG =====
function log(text){
let a = document.getElementById("attackLog");
let b = document.getElementById("actionsLog");

if(a) a.innerHTML = text + "<br>" + a.innerHTML;
if(b) b.innerHTML = text + "<br>" + b.innerHTML;
}

// ===== ТАЙМЕР =====
function regen(){
let now=Date.now();
let speed = clan==="Московский"?30000:60000;

if(now<lastEnergy) lastEnergy=now;

let diff=Math.floor((now-lastEnergy)/speed);

if(diff>0){
energy=Math.min(maxEnergy,energy+diff);
lastEnergy=now;
}

let next=speed-(now-lastEnergy);
if(next<0) next=speed;

document.getElementById("timer").innerText=Math.floor(next/1000)+" сек";
}

// ===== ДЕЙСТВИЯ =====
function mission(){
if(energy<2) return log("❌ Нет энергии");

energy-=2;

if(!roll(agility)){
log("❌ Миссия провалена");
return save();
}

let gain=10+agility;
points+=gain;
agility++;

log(`🗡 Миссия успешна +${gain}`);
save(); update();
}

function activity(){
if(energy<1) return log("❌ Нет энергии");

energy--;

if(!roll(charisma)){
log("❌ Активность провалена");
return save();
}

let gain=8+charisma;
points+=gain;
charisma++;

log(`🎉 Активность успешна +${gain}`);
save(); update();
}

// ===== АТАКА =====
let selectedClan=null;

function openAttack(){
openTab("attack");

let html="<h2>Выбери район</h2>";

for(let c in clans){
if(c!==clan)
html+=`<button onclick="selectAttackClan('${c}')">${c}</button>`;
}

document.getElementById("attackUI").innerHTML=html;
}

function selectAttackClan(c){
selectedClan=c;

document.getElementById("attackUI").innerHTML=`
<button onclick="attackClan()">
💣 Удар по району (-5 энергии)<br>
<small>Ослабляет район (шанс от СИЛЫ)</small>
</button>

<button onclick="loadPlayers('${c}')">
👤 Удар по игроку (-5 энергии)<br>
<small>Грабишь игрока и крадёшь очки</small>
</button>

<button onclick="openTab('actions')">⬅ Назад</button>
`;
}

async function loadPlayers(c){
let {data}=await db.from("players")
.select("*").eq("clan",c);

let html="<h2>Цели</h2>";

data.forEach(p=>{
if(p.id!==id){
let lvl=1+Math.floor((p.strength+p.agility+p.charisma)/10);

html+=`<button onclick="attackPlayer('${p.id}','${p.username}')">
${p.username} (${p.clan}) lvl ${lvl} - ${p.points}
</button>`;
}
});

document.getElementById("attackUI").innerHTML=html;
}

async function attackPlayer(pid,name){
if(energy<5) return log("❌ Нет энергии");

energy-=5;

if(!roll(strength)){
log("❌ Атака провалена");
return save();
}

let {data}=await db.from("players")
.select("points").eq("id",pid).single();

let steal=15+strength;

await db.from("players")
.update({points:Math.max(0,data.points-steal)})
.eq("id",pid);

points+=steal;
strength++;

log(`💣 Ограблен ${name} +${steal}`);
save(); update();
}

function attackClan(){
if(energy<5) return log("❌ Нет энергии");

energy-=5;

if(!roll(strength)){
log("❌ Атака района провалена");
return save();
}

log(`💣 Удар по району ${selectedClan}`);
save(); update();
}

// ===== ТОП ПО КЛАНАМ =====
async function showTop(){
openTab("top");

let {data}=await db.from("players").select("*");

let grouped = {};

data.forEach(p=>{
if(!grouped[p.clan]) grouped[p.clan]=[];
grouped[p.clan].push(p);
});

let html="<h2>🏆 ТОП по кланам</h2>";

for(let c in grouped){

html+=`<h3>${c}</h3>`;

grouped[c]
.sort((a,b)=>b.points-a.points)
.slice(0,10)
.forEach((p,i)=>{

let lvl=1+Math.floor((p.strength+p.agility+p.charisma)/10);

html+=`<div>
${i+1}. ${p.username} (lvl ${lvl}) - ${p.points}
</div>`;
});
}

document.getElementById("topList").innerHTML=html;
}

// ===== SAVE =====
async function save(){
await db.from("players").upsert({
id,username,points,energy,max_energy:maxEnergy,
last_energy:lastEnergy,clan,strength,agility,charisma
},{onConflict:"id"});
}

// ===== LOAD =====
async function load(){

let {data}=await db.from("players")
.select("*").eq("id",id).maybeSingle();

if(!data){
await db.from("players").insert({
id,username,points:0,energy:10,max_energy:10,
last_energy:Date.now(),strength:1,agility:1,charisma:1,clan:null
});
return showStart();
}

points=data.points;
energy=data.energy;
maxEnergy=data.max_energy;
lastEnergy=data.last_energy;
clan=data.clan;

strength=data.strength;
agility=data.agility;
charisma=data.charisma;

if(!clan) return showStart();

openTab("main");
update();
}

// ===== UPDATE =====
function update(){

document.getElementById("username").innerText=username;
document.getElementById("clan").innerText=clan;
document.getElementById("bonus").innerText=clans[clan];

document.getElementById("lvl").innerText=getLevel();

document.getElementById("points").innerText=points;
document.getElementById("energy").innerText=energy;
document.getElementById("maxEnergy").innerText=maxEnergy;

document.getElementById("m_strength").innerText=strength;
document.getElementById("m_agility").innerText=agility;
document.getElementById("m_charisma").innerText=charisma;

document.getElementById("actionsStats").innerHTML=`
Энергия: ${energy}/${maxEnergy}<br>
Уровень: ${getLevel()}<br>
💪 ${strength} ⚡ ${agility} 🎭 ${charisma}
`;
}

// ===== LOOP =====
setInterval(()=>{regen();update();},1000);

load();