// 1. ПОДКЛЮЧЕНИЕ (URL ИСПРАВЛЕН!)
const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let tg = window.Telegram.WebApp;
tg.expand();

let user = tg.initDataUnsafe?.user;
let id = localStorage.getItem("uid") || (user?.id ? "tg_" + user.id : "user_" + Math.random().toString(36).substr(2, 9));
localStorage.setItem("uid", id);

let username = user?.username || user?.first_name || "Игрок";

// Данные
let points = 0, energy = 10, maxEnergy = 10, lastEnergy = Date.now();
let strength = 1, agility = 1, charisma = 1, clan = null;

const clans = {
    "Вахитовский": "🎉 +30% к активности",
    "Авиастрой": "💣 +40% к атакам",
    "Приволжский": "🗡 +30% к миссиям",
    "Советский": "📈 +10% ко всему",
    "Московский": "⚡ энергия в 2 раза быстрее",
    "Кировский": "💣 атака дешевле",
    "Ново-Савиновский": "🔋 +3 к лимиту энергии"
};

// UI функции
function openTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    const target = document.getElementById(tabId);
    if (target) target.classList.add("active");
    updateUI();
}

function log(text) {
    const l1 = document.getElementById("log"), l2 = document.getElementById("logActions");
    if(l1) l1.innerHTML = text + "<br>" + l1.innerHTML;
    if(l2) l2.innerHTML = text + "<br>" + l2.innerHTML;
}

// ПРАВИЛЬНЫЙ ТАЙМЕР
function regen() {
    let now = Date.now();
    let speed = clan === "Московский" ? 30000 : 60000;

    if (energy >= maxEnergy) {
        lastEnergy = now;
        const t = document.getElementById("timer");
        if(t) t.innerText = "Заряжен ⚡";
        return;
    }

    // Если в базе было 0 или кривое время - фиксим (чтобы не было огромных цифр)
    if (!lastEnergy || lastEnergy < 1000000000000) lastEnergy = now;

    let diff = Math.floor((now - lastEnergy) / speed);
    if (diff > 0) {
        energy = Math.min(maxEnergy, energy + diff);
        lastEnergy += diff * speed;
        save();
    }

    let next = speed - (now - lastEnergy);
    let seconds = Math.floor(next / 1000);
    const t = document.getElementById("timer");
    if(t) t.innerText = `До энергии: ${seconds} сек`;
}

function updateUI() {
    // Обновление характеристик
    const ids = ["points", "energy", "maxEnergy", "m_strength", "m_agility", "m_charisma"];
    ids.forEach(el => {
        let e = document.getElementById(el);
        if(e) {
            let val;
            if(el === "points") val = points;
            else if(el === "energy") val = energy;
            else if(el === "maxEnergy") val = maxEnergy;
            else if(el === "m_strength") val = strength;
            else if(el === "m_agility") val = agility;
            else if(el === "m_charisma") val = charisma;
            e.innerText = val;
        }
    });

    // Синхронизация энергии во вкладке Действия
    const actE = document.getElementById("act_energy");
    const actM = document.getElementById("act_maxEnergy");
    if(actE) actE.innerText = energy;
    if(actM) actM.innerText = maxEnergy;

    if(clan) {
        document.getElementById("username").innerText = "@" + username;
        document.getElementById("clan").innerText = clan;
        document.getElementById("bonus").innerText = clans[clan];
    }
}

async function save() {
    if(!db) return;
    await db.from("players").upsert({
        id, username, points, energy, max_energy: maxEnergy, 
        last_energy: lastEnergy, clan, strength, agility, charisma
    }, { onConflict: "id" });
}

async function load() {
    if(!db) return;
    let { data } = await db.from("players").select("*").eq("id", id).maybeSingle();
    
    if (!data || !data.clan) {
        showStart();
        openTab("start");
    } else {
        points = data.points || 0; 
        energy = data.energy || 10;
        maxEnergy = data.max_energy || 10; 
        lastEnergy = Number(data.last_energy) || Date.now();
        clan = data.clan; 
        strength = data.strength || 1;
        agility = data.agility || 1; 
        charisma = data.charisma || 1;
        openTab("main");
        updateUI();
    }
}

function showStart() {
    const startDiv = document.getElementById("start");
    if(startDiv) startDiv.querySelector('h2').innerText = "Выбери свой район";
    
    let html = "";
    for (let c in clans) {
        html += `<button onclick="selectClan('${c}')">${c}<br><small style="font-weight:normal; font-size:12px;">${clans[c]}</small></button>`;
    }
    const clanList = document.getElementById("clanList");
    if(clanList) clanList.innerHTML = html;
}

async function selectClan(c) {
    clan = c;
    if (c === "Ново-Савиновский") maxEnergy = 13;
    energy = maxEnergy; 
    lastEnergy = Date.now();
    await save();
    openTab("main");
}

function mission() {
    if (energy < 2) return log("❌ Нет энергии");
    if (energy >= maxEnergy) lastEnergy = Date.now();
    energy -= 2;
    let gain = 10 + agility;
    if (clan === "Приволжский") gain *= 1.3;
    points += Math.floor(gain); agility++;
    save(); updateUI();
    log(`🗡 Миссия: +${Math.floor(gain)} очков`);
}

function activity() {
    if (energy < 1) return log("❌ Нет энергии");
    if (energy >= maxEnergy) lastEnergy = Date.now();
    energy--;
    let gain = 8 + charisma;
    if (clan === "Вахитовский") gain *= 1.3;
    points += Math.floor(gain); charisma++;
    save(); updateUI();
    log(`🎉 Активность: +${Math.floor(gain)} очков`);
}

function resetGame() {
    if(confirm("Весь авторитет и район будут удалены! Уверен?")) {
        db.from("players").delete().eq("id", id).then(() => {
            localStorage.clear();
            location.reload();
        });
    }
}

// Цикл обновлений
setInterval(() => { if (clan) { regen(); updateUI(); } }, 1000);

// Запуск при загрузке окна
window.onload = load;
