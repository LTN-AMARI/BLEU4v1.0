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
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("BLEU4_USER");
        window.location.href = "index.html";
    });
}

// =======================
// CALENDAR STATE
// =======================
let currentDate = new Date();
window.selectedDate = null;

// =======================
// RENDER CALENDAR MONTH
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

    // HEADER MONTH
    const header = document.createElement("div");
    header.style.textAlign = "center";
    header.style.fontSize = "20px";
    header.style.marginBottom = "10px";
    header.innerHTML = `
        <button id="prevMonth">◀</button>
        <b style="margin:0 15px">${monthNames[month]} ${year}</b>
        <button id="nextMonth">▶</button>
    `;

    calendar.appendChild(header);

    document.getElementById("prevMonth").onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(missions);
    };

    document.getElementById("nextMonth").onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(missions);
    };

    // DAYS HEADER
    const daysRow = document.createElement("div");
    daysRow.style.display = "grid";
    daysRow.style.gridTemplateColumns = "repeat(7, 1fr)";
    daysRow.style.textAlign = "center";
    daysRow.style.fontWeight = "bold";
    daysRow.innerHTML = "<div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D>";
    calendar.appendChild(daysRow);

    // GRID
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 1fr)";
    grid.style.gap = "5px";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {

        const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

        const cell = document.createElement("div");
        cell.style.padding = "10px";
        cell.style.border = "1px solid #ddd";
        cell.style.cursor = "pointer";
        cell.style.textAlign = "center";

        const hasMission = Object.values(missions).some(m =>
            dateStr >= m.startDate && dateStr <= m.endDate
        );

        if (hasMission) {
            cell.style.background = "#f5d76e";
        }

        const today = new Date().toISOString().split("T")[0];
        if (dateStr === today) {
            cell.style.border = "2px solid black";
        }

        cell.innerText = day;

        cell.onclick = () => {
            window.selectedDate = dateStr;
            renderDayMissions(dateStr, missions);
        };

        grid.appendChild(cell);
    }

    calendar.appendChild(grid);
};

// =======================
// DAY MISSIONS (DÉROULÉ)
// =======================
function renderDayMissions(date, missions) {

    const missionsDiv = document.getElementById("missions");
    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (date < m.startDate || date > m.endDate) return;

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>
            <p>📍 ${m.location || ""}</p>

            <details>
                <summary>Voir détails</summary>
                <p>Début: ${m.startDate}</p>
                <p>Fin: ${m.endDate}</p>
                <p>Concernés: ${m.concerned || ""}</p>
            </details>

            <button onclick="participate('${m.id}','present')"
                style="background:green;color:white;">
                Je participe
            </button>

            <button onclick="participate('${m.id}','absent')"
                style="background:red;color:white;">
                Indisponible
            </button>
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
