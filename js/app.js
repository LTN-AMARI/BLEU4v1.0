const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) window.location.href = "index.html";

document.getElementById("userInfo").innerText =
  `${user.login} - ${user.role}`;

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("BLEU4_USER");
  location.reload();
};

let year = new Date().getFullYear();

// YEAR NAV
document.getElementById("prevYear").onclick = () => {
  year--;
  renderCalendar(window.missions || {});
};

document.getElementById("nextYear").onclick = () => {
  year++;
  renderCalendar(window.missions || {});
};

// CREATE BUTTON
document.getElementById("createBtn").onclick = () => {
  const m = {
    title: document.getElementById("mTitle").value,
    description: document.getElementById("mDesc").value,
    start: document.getElementById("mStart").value,
    end: document.getElementById("mEnd").value
  };

  window.createMission(m);
};

// CALENDAR YEAR SIMPLE
window.renderCalendar = function (missions = {}) {

  const cal = document.getElementById("calendar");
  const title = document.getElementById("yearTitle");

  title.innerText = year;
  cal.innerHTML = "";

  for (let month = 0; month < 12; month++) {

    const box = document.createElement("div");
    box.innerHTML = `<h3>${month + 1}</h3>`;

    cal.appendChild(box);
  }
};
