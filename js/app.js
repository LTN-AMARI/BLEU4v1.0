
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
  window.location.href = "index.html";
}

// =======================
// HEADER
// =======================
document.getElementById("userInfo").innerText =
  `${user.login} - ${user.role}`;

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("BLEU4_USER");
  location.reload();
};

// =======================
// STATE CALENDAR
// =======================
let currentDate = new Date();
let missionsGlobal = {};

// =======================
// NAV MONTH
// =======================
function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar(missionsGlobal);
}

document.getElementById("prevMonth")?.addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth")?.addEventListener("click", () => changeMonth(1));

// =======================
// CALENDAR RENDER
// =======================
window.renderCalendar = function (missions = {}) {

  missionsGlobal = missions;

  const cal = document.getElementById("calendar");
  const title = document.getElementById("monthTitle");

  if (!cal) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  title.innerText = `${year} - ${month + 1}`;

  cal.innerHTML = "";

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const day = document.createElement("div");
    day.className = "day";
    day.innerText = d;

    // highlight mission
    const hasMission = Object.values(missions).some(m =>
      m.start && m.end &&
      dateStr >= m.start &&
      dateStr <= m.end
    );

    if (hasMission) {
      day.style.background = "#ffd54f";
    }

    day.onclick = () => {
      renderDay(dateStr, missions);
    };

    cal.appendChild(day);
  }
};

// =======================
// DAY VIEW
// =======================
function renderDay(date, missions) {

  const box = document.getElementById("missions");
  box.innerHTML = `<h3>${date}</h3>`;

  Object.values(missions).forEach(m => {

    if (!m.start || !m.end) return;
    if (date < m.start || date > m.end) return;

    const div = document.createElement("div");

    div.innerHTML = `
      <h4>${m.title}</h4>
      <p>${m.start} → ${m.end}</p>

      <button onclick="participate('${m.id}','present')">✔ OK</button>
      <button onclick="participate('${m.id}','absent')">❌ NO</button>
    `;

    box.appendChild(div);
  });
}

// =======================
// INIT MONTH
// =======================
window.addEventListener("load", () => {
  if (window.renderCalendar) {
    window.renderCalendar({});
  }
});
