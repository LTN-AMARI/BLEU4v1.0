
// =======================
// USER
// =======================
const userData = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!userData) {
    window.location.href = "index.html";
}

// =======================
// HEADER
// =======================
document.getElementById("userInfo").innerText =
    `${userData.login} — ${userData.role.toUpperCase()}`;

document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.href = "index.html";
};

// =======================
// STATE CALENDAR
// =======================
let currentDate = new Date();
window.selectedDate = null;

// =======================
// ROLE UI LOCK
// =======================
window.addEventListener("load", () => {
    const box = document.getElementById("createMissionBox");

    if (box && userData.role !== "commandement") {
        box.style.display = "none";
    }
});

// =======================
// CALENDAR RENDER
// =======================
window.renderCalendar = function (missions = {}) {

    const calendar = document.getElementById("calendar");
    const title = document.getElementById("monthTitle");

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const months = [
        "Janvier","Février","Mars","Avril","Mai","Juin",
        "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
    ];

    title.innerText = `${months[month]} ${year}`;

    calendar.innerHTML = "";

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {

        const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;

        const cell = document.createElement("div");
        cell.className = "day";
        cell.innerText = i;

        const hasMission = Object.values(missions).some(m =>
            m.startDate && m.endDate &&
            dateStr >= m.startDate && dateStr <= m.endDate
        );

        if (hasMission) {
            cell.style.background = "#f5d76e";
        }

        cell.onclick = () => {
            window.selectedDate = dateStr;
            renderDay(dateStr, missions);
        };

        calendar.appendChild(cell);
    }
};

// =======================
// DAY VIEW
// =======================
function renderDay(date, missions) {

    const missionsDiv = document.getElementById("missions");
    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (!m.startDate || !m.endDate) return;
        if (date < m.startDate || date > m.endDate) return;

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>
            <p>📍 ${m.location || ""}</p>

            <button onclick="participate('${m.id}','present')"
            style="background:green;color:white;">Je participe</button>

            <button onclick="participate('${m.id}','absent')"
            style="background:red;color:white;">Indisponible</button>

            ${userData.role === "commandement"
                ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
                : ""
            }
        `;

        missionsDiv.appendChild(div);
    });
}

// =======================
// NAVIGATION MONTH
// =======================
document.getElementById("prevMonth").onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    window.renderCalendar(window.missions || {});
};

document.getElementById("nextMonth").onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    window.renderCalendar(window.missions || {});
};

// =======================
// INIT CALENDAR
// =======================
window.addEventListener("load", () => {
    if (window.renderCalendar) {
        window.renderCalendar({});
    }
});
