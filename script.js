const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "ТВОЙ_КЛЮЧ";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

let userId = user?.id?.toString();
let startParam = tg.initDataUnsafe?.start_param;

// ===== ДАННЫЕ =====
let points = 0;
let strength = 1;
let agility = 1;
let charisma = 1;
let clan = null;
let lastActionDate = "";

// ===== ЗАГРУЗКА ИГРОКА =====

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

    // ЕСЛИ НЕТ ИГРОКА — СОЗДАЁМ
    if (!data) {

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

        // бонус рефералу
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
        }

        return loadPlayer();
    }

    // ЕСЛИ ЕСТЬ — ЗАГРУЖАЕМ
    clan = data.clan;
    points = data.points;
    strength = data.strength;
    agility = data.agility;
    charisma = data.charisma;
    lastActionDate = data.last_day;

    showGame();
}

// ===== UI =====

function showGame() {

    if (!clan) {
        document.getElementById("clanBlock").innerHTML = `
        <h3>Выбери клан:</h3>
        <button onclick="selectClan('Авиастрой')">Авиастрой</button><br><br>
        <button onclick="selectClan('Кировский')">Кировский</button><br><br>
        <button onclick="selectClan('Московский')">Московский</button>
        `;
        return;
    }

    document.getElementById("clanBlock").innerHTML = `<h3>Клан: ${clan}</h3>`;
    updateUI();
}

function selectClan(c) {
    clan = c;
    save();
    showGame();
}

// ===== ПРОВЕРКА ДНЯ =====

function canPlayToday() {
    let today = new Date().toDateString();
    return lastActionDate !== today;
}

// ===== ДЕЙСТВИЯ =====

function mission() {
    if (!canPlayToday()) {
        alert("Ты уже сделал действие сегодня");
        return;
    }

    let reward = Math.floor(Math.random() * 15) + 10;

    points += reward;
    agility += 1;
    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Миссия: +" + reward);
}

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

    alert("Пакость: +" + reward);
}

function activity() {
    if (!canPlayToday()) {
        alert("Ты уже сделал действие сегодня");
        return;
    }

    points += 12;
    charisma += 1;
    lastActionDate = new Date().toDateString();

    save();
    updateUI();

    alert("Активность: +12");
}

// ===== ТОП =====

async function leaderboard() {
    let { data } = await client
        .from("players")
        .select("*")
        .order("points", { ascending: false })
        .limit(10);

    let text = "🏆 ТОП\n\n";

    data.forEach((p, i) => {
        text += `${i + 1}. ${p.points}\n`;
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
            points,
            strength,
            agility,
            charisma,
            last_day: lastActionDate,
            clan
        })
        .eq("id", userId);
}

// ===== ЭФФЕКТ =====

function clickEffect(btn) {
    btn.style.transform = "scale(0.95)";
    setTimeout(() => btn.style.transform = "scale(1)", 100);
}

// ===== ЗАПУСК =====

loadPlayer();