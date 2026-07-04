const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) window.location.href = "index.html";

document.getElementById("userInfo").innerText =
  `${user.login} - ${user.role}`;

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("BLEU4_USER");
  location.reload();
};

// HIDE CREATE FOR MEMBERS
if (user.role !== "commandement") {
  document.getElementById("createMissionBox").style.display = "none";
}

// CREATE BUTTON
document.getElementById("createBtn").onclick = () => {

  const m = {
    title: document.getElementById("mTitle").value.trim(),
    description: document.getElementById("mDesc").value.trim(),
    start: document.getElementById("mStart").value,
    end: document.getElementById("mEnd").value,
    location: document.getElementById("mLocation").value.trim()
  };

  if (!m.title || !m.start || !m.end) {
    alert("Remplir tout");
    return;
  }

  window.createMission(m);
};

// CALENDAR SIMPLE
let month = new Date().getMonth();
let year = new Date().getFullYear();

document.getElementById("prevMonth").onclick = () => {
  month--;
  if (month < 0) { month = 11; year--; }
  renderCalendar(window.missions || {});
};

document.getElementById("nextMonth").onclick = () => {
  month++;
  if (month > 11) { month = 0; year++; }
  renderCalendar(window.missions || {});
};

window.renderCalendar = function (missions = {}) {

  const cal = document.getElementById("calendar");
  const title = document.getElementById("monthTitle");

  title.innerText = `${month + 1}/${year}`;

  cal.innerHTML = "";

  const days = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= days; d++) {

    const date = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    const div = document.createElement("div");
    div.innerText = d;

    const has = Object.values(missions).some(m =>
      date >= m.start && date <= m.end
    );

    if (has) div.style.background = "yellow";

    cal.appendChild(div);
  }
};
