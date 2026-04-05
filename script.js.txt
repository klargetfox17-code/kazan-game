let tg = window.Telegram.WebApp;

// ====== ЗАГРУЗКА ДАННЫХ ======
let points = parseInt(localStorage.getItem("points")) || 0;
let strength = parseInt(localStorage.getItem("strength")) || 1;
let agility = parseInt(localStorage.getItem("agility")) || 1;
let charisma = parseInt(localStorage.getItem("charisma")) || 1;
let clan = localStorage.getItem("clan");

// ====== ВЫБОР КЛАНА ======
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

// ====== ФУНКЦИИ ======

function selectClan(c) {
    clan = c;
    localStorage.setItem("clan", clan);
    showGame();
}

function showGame() {
    document.getElementById("clanBlock").innerHTML = `<h3>Клан: ${clan}</h3>`;
    updateUI();
}

function mission() {
    let reward = Math.floor(Math.random() * 15) + 10;

    points += reward;
    agility += 1;

    save();
    updateUI();

    alert("Миссия выполнена!\n+" + reward + " очков\n+1 ловкость");
}

function updateUI() {
    document.getElementById("points").innerText = "Очки: " + points;
    document.getElementById("strength").innerText = strength;
    document.getElementById("agility").innerText = agility;
    document.getElementById("charisma").innerText = charisma;
}

function save() {
    localStorage.setItem("points", points);
    localStorage.setItem("strength", strength);
    localStorage.setItem("agility", agility);
    localStorage.setItem("charisma", charisma);
}