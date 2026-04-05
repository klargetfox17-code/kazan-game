const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

let userId = user?.id?.toString();
let username = user?.username || "Игрок";

// данные
let points = 0;
let strength = 1;
let agility = 1;
let charisma = 1;
let clan = null;
let lastActionDate = "";

// ===== ЗАГРУЗКА =====
async function loadPlayer() {

    document.getElementById("username").innerText = "@" + username;

    let { data } = await client
        .from("players")
        .select("*")
        .eq("id", userId)
        .single();

    if (!data) {

        await client.from("players").insert({
            id: userId,
            username: username,
            clan: null,
            points: 0,
            strength: 1,
            agility: 1,
            charisma: 1,
            last_day: ""
        });

        return loadPlayer();
    }

    clan = data.clan;
    points = data.points;
    strength = data.strength;
    agility = data.agility;
    charisma = data.charisma;
    lastActionDate = data.last_day;

    showGame();

    document.getElementById("loading").style.display = "none";
}

// ===== UI =====
function showGame() {

    if (!clan) {
        document.getElementById("clanBlock").innerHTML = `
        <h3>Выбери район:</h3>

        <button onclick="selectClan('Авиастрой')">✈️ Авиастрой (+ловкость)</button><br><br>
        <button onclick="selectClan('Кировский')">💪 Кировский (+сила)</button><br><br>
        <button onclick="selectClan('Московский')">🗣 Московский (+харизма)</button>
        `;
        return;
    }

    document.getElementById("clanBlock").innerHTML = `<h3>Твой район: ${clan}</h3>`;
    updateUI();
}

function selectClan(c) {

    clan = c;

    if (c === "Авиастрой") agility += 2;
    if (c === "Кировский") strength += 2;
    if (c === "Московский") charisma += 2;

    save();
    showGame();
}

// ===== ДЕЙСТВИЯ =====

function canPlayToday() {
    let today = new Date().toDateString();
    return lastActionDate !== today;
}

function mission() {
    if (!canPlayToday()) return alert("Уже играл сегодня");

    let reward = 10 + Math.floor(Math.random() * agility);

    points += reward;
    agility += 1;
    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Миссия +" + reward);
}

function attack() {
    if (!canPlayToday()) return alert("Уже играл сегодня");

    let reward = 10 + strength;

    points += reward;
    strength += 1;
    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Пакость +" + reward);
}

function activity() {
    if (!canPlayToday()) return alert("Уже играл сегодня");

    points += 12;
    charisma += 1;
    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Активность +12");
}

// ===== ТОП =====
async function leaderboard() {

    let { data } = await client
        .from("players")
        .select("*")
        .order("points", { ascending: false })
        .limit(10);

    let text = "🏆 ТОП ИГРОКОВ\n\n";

    data.forEach((p, i) => {
        text += `${i+1}. @${p.username} — ${p.points}\n`;
    });

    alert(text);
}

// ===== UI =====
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
            username,
            points,
            strength,
            agility,
            charisma,
            last_day: lastActionDate,
            clan
        })
        .eq("id", userId);
}

loadPlayer();