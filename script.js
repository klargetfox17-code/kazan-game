const SUPABASE_URL = "https://ddmwufcuskblflvuuixo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbXd1ZmN1c2tibGZsdnV1aXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDIxOTIsImV4cCI6MjA5MDk3ODE5Mn0.pKutYZa4eJ3qXkmeZrJ-VswZOxTj992lRPhdW41Un0E";

// Используем window.supabase для надежности
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== USER =====
let tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

let user = tg.initDataUnsafe?.user;
let id = user?.id?.toString(); 

if (!id) {
  id = localStorage.getItem("uid") || "test_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("uid", id);
}

let username = user?.username || user?.first_name || "Игрок_" + id.slice(-4);

// ===== ДАННЫЕ =====
let points = 0;
let energy = 10;
let maxEnergy = 10;
let lastEnergy = Date.now();
let strength = 1;
let agility = 1;
let charisma = 1;
let clan = null;

const clans = {
  "Вахитовский": "🎉 +30% к активности",
  "Авиастрой": "💣 +40% к атакам",
  "Приволжский": "🗡 +30% к миссиям",
  "Советский": "📈 +10% ко всему",
  "Московский": "⚡ энергия быстрее x2",
  "Кировский": "💣 атака дешевле",
  "Ново-Савиновский": "🔋 +3 энергия максимум"
};

// ===== UI =====
function openTab(tabId) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");
}

function log(text) {
  console.log(text);
  let main = document.getElementById("log");
  if (main) main.innerHTML = text + "<br>" + main.innerHTML;
}

function updateUI() {
  const elements = {
    "username": username,
    "clan": clan || "Не выбран",
    "points": points,
    "energy": energy,
    "maxEnergy": maxEnergy,
    "m_strength": strength,
    "m_agility": agility,
    "m_charisma": charisma
  };

  for (let key in elements) {
    let el = document.getElementById(key);
    if (el) el.innerText = elements[key];
  }

  let bonusEl = document.getElementById("bonus");
  if (bonusEl && clan) bonusEl.innerText = clans[clan];
}

// ===== ЭНЕРГИЯ =====
function regen() {
  let now = Date.now();
  let speed = clan === "Московский" ? 30000 : 60000;
  let diff = Math.floor((now - lastEnergy) / speed);

  if (diff > 0) {
    energy = Math.min(maxEnergy, energy + diff);
    lastEnergy += diff * speed;
    save(); // Сохраняем восстановленную энергию
  }

  let next = speed - (now - lastEnergy);
  let timerEl = document.getElementById("timer");
  if (timerEl) timerEl.innerText = Math.max(0, Math.floor(next / 1000)) + " сек";
}

// ===== СИСТЕМА =====
async function save() {
  try {
    const { error } = await db.from("players").upsert({
      id: id,
      username: username,
      points: points,
      energy: energy,
      max_energy: maxEnergy,
      last_energy: lastEnergy,
      clan: clan,
      strength: strength,
      agility: agility,
      charisma: charisma
    }, { onConflict: 'id' });

    if (error) throw error;
    console.log("Данные сохранены");
  } catch (err) {
    console.error("Ошибка сохранения:", err.message);
  }
}

async function load() {
  try {
    let { data, error } = await db
      .from("players")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data || !data.clan) {
      console.log("Новый игрок или клан не выбран");
      showStart();
      openTab("start");
      return;
    }

    points = data.points || 0;
    energy = data.energy || 0;
    maxEnergy = data.max_energy || 10;
    lastEnergy = data.last_energy || Date.now();
    clan = data.clan;
    strength = data.strength || 1;
    agility = data.agility || 1;
    charisma = data.charisma || 1;

    openTab("mainScreen"); // Проверь, чтобы в HTML был id="mainScreen"
    updateUI();
  } catch (err) {
    console.error("Ошибка загрузки:", err.message);
    showStart();
    openTab("start");
  }
}

function showStart() {
  let html = "<h2>Выбери район Казани</h2>";
  for (let c in clans) {
    html += `<button onclick="selectClan('${c}')"><b>${c}</b><br><small>${clans[c]}</small></button>`;
  }
  let startEl = document.getElementById("start");
  if (startEl) startEl.innerHTML = html;
}

async function selectClan(c) {
  clan = c;
  if (c === "Ново-Савиновский") maxEnergy = 13;
  energy = maxEnergy;
  lastEnergy = Date.now();
  
  await save();
  openTab("mainScreen");
  updateUI();
}

// ===== ДЕЙСТВИЯ =====
function mission() {
  if (energy < 2) return log("❌ Нет суеты (энергии)");
  energy -= 2;
  let gain = 10 + agility;
  if (clan === "Приволжский") gain *= 1.3;
  points += Math.floor(gain);
  agility++;
  save();
  updateUI();
  log(`🗡 Прошел миссию: +${Math.floor(gain)} очков`);
}

// Запуск
setInterval(() => {
  if (clan) {
    regen();
    updateUI();
  }
}, 1000);

load();
