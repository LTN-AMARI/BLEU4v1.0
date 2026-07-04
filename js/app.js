
// =======================
// USER SESSION
// =======================
const userData = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!userData) {
    window.location.href = "index.html";
}

// =======================
// HEADER
// =======================
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

if (userInfo) {
    userInfo.innerText = `${userData.login} — ${userData.role.toUpperCase()}`;
}

if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.removeItem("BLEU4_USER");
        window.location.href = "index.html";
    };
}

// =======================
// STATE
// =======================
let currentDate = new Date();
window.selectedDate = null;

// =======================
// CALENDAR SAFE
// =======================
window.renderCalendar = function (missions = {}) {

    const calendar = document.getElementById("calendar");
    if (!calendar) return;

    calendar.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Janvier","Février","Mars","Avril","Mai","Juin",
        "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
    ];

    // HEADER
    const header = document.createElement("div");
    header.style.textAlign = "center";
    header.style.marginBottom = "10px";

    header.innerHTML = `
        <button id="prev">◀</button>
        <b>${monthNames[month]} ${year}</b>
        <button id="next">▶</button>
    `;

    calendar.appendChild(header);

    setTimeout(() => {
        const prev = document.getElementById("prev");
        const next = document.getElementById("next");

        if (prev) {
            prev.onclick = () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar(missions);
            };
        }

        if (next) {
            next.onclick = () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar(missions);
            };
        }
    }, 0);

    // GRID
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 1fr)";
    grid.style.gap = "5px";

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {

        const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

        const cell = document.createElement("div");
        cell.innerText = day;
        cell.style.padding = "10px";
        cell.style.border = "1px solid #ccc";
        cell.style.textAlign = "center";
        cell.style.cursor = "pointer";

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

        grid.appendChild(cell);
    }

    calendar.appendChild(grid);
};

// =======================
// DAY VIEW
// =======================
function renderDay(date, missions) {

    const missionsDiv = document.getElementById("missions");
    if (!missionsDiv) return;

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

            <details>
                <summary>Détails</summary>
                <p>${m.startDate} → ${m.endDate}</p>
            </details>
        `;

        missionsDiv.appendChild(div);
    });
}

// =======================
// INIT
// =======================
window.addEventListener("load", () => {
    if (window.renderCalendar) {
        window.renderCalendar({});
    }
});
