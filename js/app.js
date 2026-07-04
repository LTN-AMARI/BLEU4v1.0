
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
// GLOBAL STATE
// =======================
window.selectedDate = null;

// =======================
// CALENDAR (multi-days support)
// =======================
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

        // check mission overlap (start/end)
        const hasMission = Object.values(missions).some(m => {
            if (!m.startDate || !m.endDate) return false;
            return date >= m.startDate && date <= m.endDate;
        });

        if (hasMission) {
            day.style.background = "#f5d76e";
            day.style.color = "#000";
            day.style.fontWeight = "bold";
        }

        day.addEventListener("click", () => {
            window.selectedDate = date;
            if (window.renderMissionsByDate) {
                window.renderMissionsByDate(date);
            }
        });

        calendar.appendChild(day);
    }
};

// =======================
// CREATE MISSION UI
// =======================
const box = document.getElementById("createMissionBox");

if (box && userData.role !== "commandement") {
    box.style.display = "none";
}

const createBtn = document.getElementById("createBtn");

if (createBtn) {
    createBtn.addEventListener("click", () => {

        const mission = {
            title: document.getElementById("mTitle")?.value || "",
            description: document.getElementById("mDesc")?.value || "",
            startDate: document.getElementById("mStartDate")?.value || "",
            endDate: document.getElementById("mEndDate")?.value || "",
            location: document.getElementById("mLocation")?.value || "",
            concerned: document.getElementById("mConcerned")?.value || ""
        };

        if (!mission.title || !mission.startDate || !mission.endDate) {
            alert("Titre + date début + date fin obligatoires");
            return;
        }

        if (window.createMission) {
            window.createMission(mission);
        }

        alert(`Mission créée du ${mission.startDate} au ${mission.endDate}`);

        // reset
        ["mTitle","mDesc","mStartDate","mEndDate","mLocation","mConcerned"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
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
