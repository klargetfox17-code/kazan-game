// 1. ИНИЦИАЛИЗАЦИЯ
const SUPABASE_URL = "https://supabase.co"; // ПРОВЕРЕНО
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tg = window.Telegram.WebApp;
tg.expand();

// Попытка получить ID
let user = tg.initDataUnsafe?.user;
let id = user?.id?.toString() || localStorage.getItem("uid");

if (!id) {
    id = "test_" + Math.random().toString(36).substr(2, 5);
    localStorage.setItem("uid", id);
}

let username = user?.username || user?.first_name || "Игрок_" + id.slice(-3);

// Глобальные переменные
let points = 0, energy = 10, maxEnergy = 10, lastEnergy = Date.now();
let strength = 1, agility = 1, charisma = 1, clan = null;

const clans = {
    "Вахитовский": "🎉 +30% к активности",
    "Авиастрой": "💣 +40% к атакам",
    "Приволжский": "🗡 +30% к миссиям",
    "Советский": "📈 +10% ко всему",
    "Московский": "⚡ энергия x2 быстрее",
    "Кировский": "💣 атака дешевле",
    "Ново-Савиновский": "🔋 +3 к лимиту энергии"
};

// Функция вывода ошибок на экран (если вдруг упадет)
function showError(err) {
    const display = document.getElementById('error-display');
    display.style.display = 'block';
    display.innerText = "Ошибка: " + err;
}

function openTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    const target = document.getElementById(tabId);
    if (target) target.classList.add("active");
}

function log(text) {
    const l1 = document.getElementById("log"), l2 = document.getElementById("logActions");
    if(l1) l1.innerHTML = text + "<br>" + l1.innerHTML;
    if(l2) l2.innerHTML = text + "<br>" + l2.innerHTML;
}

// ОБНОВЛЕНИЕ ЭКРАНА
function updateUI() {
    if (!clan) return;
    try {
        document.getElementById("username").innerText = "@" + username;
        document.getElementById("clan").innerText = clan;
        document.getElementById("bonus").innerText = clans[clan] || "";
        document.getElementById("points").innerText = points;
        document.getElementById("energy").innerText = energy;
        document.getElementById("maxEnergy").innerText = maxEnergy;
        document.getElementById("m_strength").innerText = strength;
        document.getElementById("m_agility").innerText = agility;
        document.getElementById("m_charisma").innerText = charisma;

        let img = document.getElementById("character");
        if (img) {
            if (points > 100) img.src = "https://imgur.com"; 
            if (points > 500) img.src = "https://imgur.com";
        }
    } catch (e) { console.error("Ошибка UI:", e); }
}

// СОХРАНЕНИЕ
async function save() {
    const { error } = await db.from("players").upsert({
        id, username, points, energy, 
        max_energy: maxEnergy, 
        last_energy: lastEnergy, 
        clan, strength, agility, charisma
    }, { onConflict: 'id' });
    if (error) console.error("Ошибка Save:", error.message);
}

// ЗАГРУЗКА
async function load() {
    try {
        let { data, error } = await db.from("players").select("*").eq("id", id).maybeSingle();
        if (error) throw error;

        if (!data || !data.clan) {
            showStart();
            openTab("start");
        } else {
            points = data.points || 0;
            energy = data.energy || 0;
            maxEnergy = data.max_energy || 10;
            lastEnergy = data.last_energy || Date.now();
            clan = data.clan;
            strength = data.strength || 1;
            agility = data.agility || 1;
            charisma = data.charisma || 1;
            openTab("main");
            updateUI();
        }
    } catch (e) { 
        showError(e.message);
        showStart(); 
        openTab("start"); 
    }
}

function showStart() {
    let html = "<h2>Выбери район Казани</h2>";
    for (let c in clans) {
        html += `<button onclick="selectClan('${c}')">${c}<br><small>${clans[c]}</small></button>`;
    }
    document.getElementById("start").innerHTML = html;
}

async function selectClan(c) {
    clan = c;
    if (c === "Ново-Савиновский") maxEnergy = 13;
    energy = maxEnergy;
    lastEnergy = Date.now();
    await save();
    openTab("main");
    updateUI();
}

// ДЕЙСТВИЯ
function mission() {
    if (energy < 2) return log("❌ Нет энергии");
    energy -= 2;
    let gain = 10 + agility;
    if (clan === "Приволжский") gain *= 1.3;
    points += Math.floor(gain); agility++;
    save(); updateUI();
    log(`🗡 Миссия: +${Math.floor(gain)}`);
}

function activity() {
    if (energy < 1) return log("❌ Нет энергии");
    energy--;
    let gain = 8 + charisma;
    if (clan === "Вахитовский") gain *= 1.3;
    points += Math.floor(gain); charisma++;
    save(); updateUI();
    log(`🎉 Активность: +${Math.floor(gain)}`);
}

function openAttack() {
    let html = "<h4>Ударить по району:</h4>";
    for (let c in clans) {
        if (c !== clan) html += `<button onclick="attackClan('${c}')" style="background:#f59e0b;padding:10px;margin-top:5px;">${c}</button>`;
    }
    document.getElementById("attackUI").innerHTML = html;
}

async function attackClan(target) {
    let cost = (clan === "Кировский") ? 4 : 5;
    if (energy < cost) return log("❌ Нет сил");
    energy -= cost;
    let dmg = 50 + strength;
    if (clan === "Авиастрой") dmg *= 1.4;
    
    const { error } = await db.rpc('damage_clan', { clan_name: target, damage: Math.floor(dmg) });
    if (!error) {
        points += 20; strength++;
        log(`💣 Напал на ${target}!`);
    } else {
        log("❌ Ошибка функции");
        console.error(error);
    }
    save(); updateUI();
}

async function loadTop() {
    openTab("top");
    let { data } = await db.from("players").select("username, points, clan").order("points", { ascending: false }).limit(10);
    let html = "";
    if(data) {
        data.forEach((p, i) => {
            html += `<div class="card" style="font-size:14px;">#${i+1} <b>${p.username}</b>: ${p.points} (${p.clan})</div>`;
        });
    }
    document.getElementById("topList").innerHTML = html;
}

function resetGame() { if(confirm("Сбросить персонажа?")) { localStorage.clear(); location.reload(); } }

function regen() {
    let now = Date.now();
    let speed = (clan === "Московский") ? 30000 : 60000;
    let diff = Math.floor((now - lastEnergy) / speed);
    if (diff > 0) {
        energy = Math.min(maxEnergy, energy + diff);
        lastEnergy += diff * speed;
        save();
    }
    let next = speed - (now - lastEnergy);
    let t = document.getElementById("timer");
    if (t) t.innerText = Math.max(0, Math.floor(next / 1000)) + " сек";
}

// Цикл
setInterval(() => { if (clan) { regen(); updateUI(); } }, 1000);

// СТАРТ
window.onload = load;
