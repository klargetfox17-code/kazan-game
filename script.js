const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

let userId = user?.id?.toString();
let startParam = tg.initDataUnsafe?.start_param;

// ===== ДАННЫЕ =====
let points = parseInt(localStorage.getItem("points")) || 0;
let strength = parseInt(localStorage.getItem("strength")) || 1;
let agility = parseInt(localStorage.getItem("agility")) || 1;
let charisma = parseInt(localStorage.getItem("charisma")) || 1;
let clan = localStorage.getItem("clan");

let lastActionDate = localStorage.getItem("lastActionDate");

// ===== ВЫБОР КЛАНА =====
if (!clan) {
    document.getElementById("clanBlock").innerHTML = `
    <h3>Выбери клан:</h3>
    <button onclick="selectClan('Авиастрой')">Авиастрой</button><br><br>
    <button onclick="selectClan('Кировский')">Кировский</button><br><br>
    <button onclick="selectClan('Московский')">Московский</button>
    `;
} else {
    showGame();
}

// ===== ФУНКЦИИ =====

async function leaderboard() {
    let { data } = await client
        .from("players")
        .select("*")
        .order("points", { ascending: false })
        .limit(10);

    let text = "🏆 ТОП ИГРОКОВ\n\n";

    data.forEach((p, i) => {
        text += `${i+1}. ${p.points} очков\n`;
    });

    alert(text);
}

async function loadPlayer() {

if (!userId) {
    alert("Открой игру через Telegram");
    return;
}
    let { data } = await client
        .from("players")
        .select("*")
        .eq("id", userId)
        .single();

    if (!data) {
        // создаём нового игрока
        await client.from("players").insert({
            id: userId,
            clan: null,
            points: 0,
            strength: 1,
            agility: 1,
            charisma: 1,
            last_day: "",
            ref_by: startParam || null
        });

    if (startParam) {
        let { data: refUser } = await client
    .from("players")
    .select("points")
    .eq("id", startParam)
    .single();

if (refUser) {
    await client
        .from("players")
        .update({
            points: refUser.points + 20
        })
        .eq("id", startParam);
}

        return loadPlayer();
    }

    // записываем в переменные
    clan = data.clan;
    points = data.points;
    strength = data.strength;
    agility = data.agility;
    charisma = data.charisma;
    lastActionDate = data.last_day;

    showGame();
}

function selectClan(c) {
    clan = c;
    localStorage.setItem("clan", clan);
    showGame();
}

function showGame() {
    document.getElementById("clanBlock").innerHTML = `<h3>Клан: ${clan}</h3>`;
    updateUI();
}

// ===== ПРОВЕРКА ДНЯ =====

function canPlayToday() {
    let today = new Date().toDateString();
    return lastActionDate !== today;
}

// ===== МИССИЯ =====

function mission() {

    if (!canPlayToday()) {
        alert("Ты уже сделал действие сегодня. Приходи завтра!");
        return;
    }

    let reward = Math.floor(Math.random() * 15) + 10;

    points += reward;
    agility += 1;

    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Миссия выполнена!\n+" + reward + " очков\n+1 ловкость");
}

// ===== UI =====

function clickEffect(btn) {
    btn.style.transform = "scale(0.95)";
    setTimeout(() => btn.style.transform = "scale(1)", 100);
}

function updateUI() {
    document.getElementById("points").innerText = "Очки: " + points;
    document.getElementById("strength").innerText = strength;
    document.getElementById("agility").innerText = agility;
    document.getElementById("charisma").innerText = charisma;
}

// ===== SAVE =====

async function save() {
    await client
        .from("players")
        .update({
            points,
            strength,
            agility,
            charisma,
            last_day: lastActionDate,
            clan
        })
        .eq("id", userId);
}

// ===== ПАКОСТЬ =====

function attack() {

    if (!canPlayToday()) {
        alert("Ты уже сделал действие сегодня");
        return;
    }

    let reward = 10 + strength * Math.floor(Math.random() * 3 + 1);

    points += reward;
    strength += 1;

    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Пакость удалась!\n+" + reward + " очков\n+1 сила");
}

// ===== АКТИВНОСТЬ =====

function activity() {

    if (!canPlayToday()) {
        alert("Ты уже сделал действие сегодня");
        return;
    }

    let reward = 12;

    points += reward;
    charisma += 1;

    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Активность выполнена!\n+" + reward + " очков\n+1 харизма");
}

loadPlayer();