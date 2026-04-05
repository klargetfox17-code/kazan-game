let tg = window.Telegram.WebApp;

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

function updateUI() {
    document.getElementById("points").innerText = "Очки: " + points;
    document.getElementById("strength").innerText = strength;
    document.getElementById("agility").innerText = agility;
    document.getElementById("charisma").innerText = charisma;

    if (!canPlayToday()) {
        document.querySelector("button").innerText = "⏳ Уже сыграно сегодня";
    }
}

// ===== SAVE =====

function save() {
    localStorage.setItem("points", points);
    localStorage.setItem("strength", strength);
    localStorage.setItem("agility", agility);
    localStorage.setItem("charisma", charisma);
    localStorage.setItem("lastActionDate", lastActionDate);
}