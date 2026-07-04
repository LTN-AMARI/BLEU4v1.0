const userData = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!userData) {
    window.location.href = "index.html";
}

// HEADER
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

window.selectedDate = null;

// CALENDAR
window.renderCalendar = function (missions = {}) {

    const calendar = document.getElementById("calendar");
    if (!calendar) return;

    calendar.innerHTML = "";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {

        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

        const day = document.createElement("div");
        day.className = "day";
        day.innerText = i;

        const hasMission = Object.values(missions).some(m => m.date === date);

        if (hasMission) {
            day.style.background = "#f5d76e";
        }

        day.onclick = () => {
            window.selectedDate = date;
            if (window.renderMissionsByDate) {
                window.renderMissionsByDate(date);
            }
        };

        calendar.appendChild(day);
    }
};

// CREATE BUTTON
const createBtn = document.getElementById("createBtn");

if (createBtn) {
    createBtn.addEventListener("click", () => {

        const mission = {
            title: document.getElementById("mTitle")?.value,
            date: document.getElementById("mDate")?.value,
            description: document.getElementById("mDesc")?.value,
            time: document.getElementById("mTime")?.value,
            location: document.getElementById("mLocation")?.value,
            concerned: document.getElementById("mConcerned")?.value
        };

        if (!mission.title || !mission.date) {
            alert("Titre + date obligatoires");
            return;
        }

        if (window.createMission) {
            window.createMission(mission);
        }

        alert("Mission créée");
    });
};
