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
    // Проверка: открыто ли в ТГ
    if (!userId) {
        document.getElementById("username").innerText = "Открой в Telegram";
        return; 
    }

    document.getElementById("username").innerText = "@" + username;

    try {
        let { data, error } = await client
            .from("players")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.error("Ошибка запроса:", error.message);
            return;
        }

        if (!data) {
            console.log("Создаю игрока...");
            let { error: insertError } = await client
                .from("players")
                .insert({
                    id: userId,
                    username: username,
                    clan: null,
                    points: 0,
                    strength: 1,
                    agility: 1,
                    charisma: 1,
                    last_day: ""
                });

            if (insertError) {
                console.error("Ошибка вставки:", insertError.message);
                alert("Ошибка БД при создании: " + insertError.message);
                return;
            }
            // Вместо повторного вызова функции — перезагрузка
            location.reload(); 
            return;
        }

        // Загрузка данных
        clan = data.clan;
        points = data.points || 0;
        strength = data.strength || 1;
        agility = data.agility || 1;
        charisma = data.charisma || 1;
        lastActionDate = data.last_day || "";

        showGame();

    } catch (e) {
        console.error("Критический сбой:", e);
    }
}

// ===== UI =====
function showGame() {

    if (!clan) {
        document.getElementById("clanBlock").innerHTML = `
        <h3>Выбери район:</h3>

        <button onclick="selectClan('Авиастрой')">✈️ Авиастрой (+2 ловкость)</button><br><br>
        <button onclick="selectClan('Кировский')">💪 Кировский (+2 сила)</button><br><br>
        <button onclick="selectClan('Московский')">🗣 Московский (+2 харизма)</button>
        `;
        updateUI();
        return;
    }

    document.getElementById("clanBlock").innerHTML =
        `<h3>Твой район: ${clan}</h3>`;

    updateUI();
}

// ===== ВЫБОР КЛАНА =====
function selectClan(c) {

    clan = c;

    if (c === "Авиастрой") agility += 2;
    if (c === "Кировский") strength += 2;
    if (c === "Московский") charisma += 2;

    save();
    showGame();
}

// ===== ПРОВЕРКА =====
function canPlayToday() {
    let today = new Date().toDateString();
    return lastActionDate !== today;
}

// ===== ДЕЙСТВИЯ =====
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

    try {

        let { data, error } = await client
            .from("players")
            .select("*")
            .order("points", { ascending: false })
            .limit(10);

        if (error) {
            alert("Ошибка загрузки топа");
            return;
        }

        if (!data || data.length === 0) {
            alert("Пока нет игроков");
            return;
        }

        let text = "🏆 ТОП ИГРОКОВ\n\n";

        data.forEach((p, i) => {
            text += `${i+1}. @${p.username} — ${p.points} (${p.clan || "без клана"})\n`;
        });

        alert(text);

    } catch (e) {
        alert("Ошибка");
    }
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

    try {
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

    } catch (e) {
        console.log("Ошибка сохранения");
    }
}

// ===== СТАРТ =====
loadPlayer();