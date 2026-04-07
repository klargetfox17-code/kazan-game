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
let points=0, energy=10, maxEnergy=10, lastEnergy=Date.now();
let strength=1, agility=1, charisma=1;
let clan=null;

// ===== CLANS =====
const clansInfo = {
"Вахитовский": "🎉 Активность даёт +30% очков",
"Авиастрой": "💣 Атаки наносят +40% урона",
"Приволжский": "🗡 Миссии дают +30% очков",
"Советский": "📈 +10% ко всем наградам",
"Московский": "⚡ энергия восстанавливается в 2 раза быстрее",
"Кировский": "💣 атаки дешевле (-1 энергия)",
"Ново-Савиновский": "🔋 +3 к максимуму энергии"
};

// ===== LEVEL =====
function getLevel(){
return 1 + Math.floor((strength+agility+charisma)/10);
}

// ===== CHANCE =====
function chance(stat){
return Math.min(95, 60 + stat*2);
}

// ===== DEFENCE =====
function defence(){
return charisma * 1.5;
}

function roll(stat, enemyDef=0){
return Math.random()*100 < (chance(stat) - enemyDef);
}

// ===== UI =====
function openTab(id){
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

function log(text){
["actionsLog","attackLog"].forEach(id=>{
let el=document.getElementById(id);
if(el) el.innerHTML=text+"<br>"+el.innerHTML;
});
}

// ===== RESET (ФИКС) =====
async function resetGame(){
await db.from("players").delete().eq("id",id);
localStorage.removeItem("uid");
location.reload();
}

// ===== ENERGY =====
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

// ===== ACTIONS =====
async function mission(){
if(energy<2) return log("❌ Нет энергии");

energy-=2;

if(!roll(agility)){
log("❌ Провал миссии");
return save();
}

let gain=10+agility;
if(clan==="Приволжский") gain*=1.3;

points+=Math.floor(gain);
agility++;

await db.rpc("add_clan_points",{c:clan,val:gain});

log(`🗡 +${Math.floor(gain)} очков`);
save(); update();
}

async function activity(){
if(energy<1) return log("❌ Нет энергии");

energy--;

if(!roll(charisma)){
log("❌ Провал активности");
return save();
}

let gain=8+charisma;
if(clan==="Вахитовский") gain*=1.3;

points+=Math.floor(gain);
charisma++;

await db.rpc("add_clan_points",{c:clan,val:gain});

log(`🎉 +${Math.floor(gain)} очков`);
save(); update();
}

// ===== ATTACK =====
let selectedClan=null;

function openAttack(){
openTab("attack");

let html="<h2>Выбери район</h2>";
for(let c in clansInfo){
if(c!==clan)
html+=`<button onclick="selectAttackClan('${c}')">${c}</button>`;
}
document.getElementById("attackUI").innerHTML=html;
}

function selectAttackClan(c){
selectedClan=c;

document.getElementById("attackUI").innerHTML=`
<button onclick="attackClan()">
💣 Удар по району (-5)<br>
<small>Ослабляет район и даёт очки твоему</small>
</button>

<button onclick="loadPlayers('${c}')">
👤 Ограбить игрока (-5)<br>
<small>Кража очков с учётом защиты</small>
</button>

<button onclick="openTab('actions')">⬅ Назад</button>
`;
}

async function attackClan(){
if(energy<5) return log("❌ Нет энергии");

energy-=5;

if(!roll(strength)){
log("❌ Атака провалена");
return save();
}

let dmg=20+strength;

await db.rpc("add_clan_points",{c:selectedClan,val:-dmg});
await db.rpc("add_clan_points",{c:clan,val:dmg});

log(`💣 Район ${selectedClan} потерял ${dmg}`);
save(); update();
}

async function loadPlayers(c){
let {data}=await db.from("players").select("*").eq("clan",c);

let html="<h2>Цели</h2>";

data.forEach(p=>{
if(p.id!==id){
let lvl=1+Math.floor((p.strength+p.agility+p.charisma)/10);
html+=`<button onclick="attackPlayer('${p.id}')">
${p.username} lvl ${lvl} (${p.points})
</button>`;
}
});

document.getElementById("attackUI").innerHTML=html;
}

async function attackPlayer(pid){
if(energy<5) return log("❌ Нет энергии");

energy-=5;

let {data:enemy}=await db.from("players").select("*").eq("id",pid).single();

if(!roll(strength, enemy.charisma*1.5)){
log("🛡 Игрок защитился");
return save();
}

let steal=15+strength;

await db.from("players")
.update({points:Math.max(0,enemy.points-steal)})
.eq("id",pid);

points+=steal;
strength++;

log(`💣 Успех! +${steal}`);
save(); update();
}

// ===== CLAN TOP =====
async function showClanTop(){
openTab("clans");

let {data}=await db.from("clans").select("*").order("points",{ascending:false});

let html="<h2>🏆 Районы</h2>";

data.forEach((c,i)=>{
html+=`<div>${i+1}. ${c.name} — ${c.points}</div>`;
});

document.getElementById("clanList").innerHTML=html;
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
let {data}=await db.from("players").select("*").eq("id",id).maybeSingle();

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
document.getElementById("bonus").innerText=clansInfo[clan];
document.getElementById("lvl").innerText=getLevel();

document.getElementById("points").innerText=points;
document.getElementById("energy").innerText=energy;
document.getElementById("maxEnergy").innerText=maxEnergy;

document.getElementById("m_strength").innerText=strength;
document.getElementById("m_agility").innerText=agility;
document.getElementById("m_charisma").innerText=charisma;

document.getElementById("actionsStats").innerHTML=`
Энергия: ${energy}/${maxEnergy}<br>
Уровень: ${getLevel()}
`;
}

// ===== LOOP =====
setInterval(()=>{regen();update();},1000);

load();