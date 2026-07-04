const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

// =======================
// UI HEADER
// =======================
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

userInfo.innerText = `${user.login} — ${user.role.toUpperCase()}`;

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.href = "index.html";
});

// =======================
// DATE SELECTION
// =======================
window.selectedDate = null;

// =======================
// CALENDAR RENDER
// =======================
window.renderCalendar = function (missions = {}) {

    const calendar = document.getElementById("calendar");
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

        // highlight si mission
        const hasMission = Object.values(missions).some(m => m.date === date);

        if (hasMission) {
            day.style.background = "#f5d76e";
            day.style.color = "#000";
            day.style.fontWeight = "bold";
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

// =======================
// INITIAL LOAD
// =======================
window.onload = function () {

    if (window.renderCalendar) {
        window.renderCalendar({});
    }
};
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

// cacher si pas commandement
const box = document.getElementById("createMissionBox");

if (user.role !== "commandement") {
    box.style.display = "none";
}

// bouton création
document.getElementById("createBtn").addEventListener("click", () => {

    const mission = {
        title: document.getElementById("mTitle").value,
        description: document.getElementById("mDesc").value,
        date: document.getElementById("mDate").value,
        time: document.getElementById("mTime").value,
        location: document.getElementById("mLocation").value,
        concerned: document.getElementById("mConcerned").value
    };

    if (!mission.title || !mission.date) {
        alert("Titre + date obligatoires");
        return;
    }

    // appel firebase (via missions.js)
    if (window.createMission) {
        window.createMission(mission);
    }

    alert("Mission créée");

    // reset
    document.getElementById("mTitle").value = "";
    document.getElementById("mDesc").value = "";
    document.getElementById("mDate").value = "";
    document.getElementById("mTime").value = "";
    document.getElementById("mLocation").value = "";
    document.getElementById("mConcerned").value = "";
});
