const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

userInfo.innerText = `${user.login} — ${user.role.toUpperCase()}`;

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.href = "index.html";
});

// IMPORT missions (global window via firebase module)
let selectedDate = null;

window.selectDate = function(date) {
    selectedDate = date;
    document.getElementById("selectedDateTitle").innerText =
        "MISSIONS DU " + date;

    if (window.renderMissionsByDate) {
        window.renderMissionsByDate(date);
    }
};

// calendrier simple mais cliquable
window.renderCalendar = function() {

    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    for (let i = 1; i <= 30; i++) {

        const date = `2026-07-${String(i).padStart(2, "0")}`;

        const day = document.createElement("div");
        day.className = "day";
        day.innerText = i;

        day.onclick = () => window.selectDate(date);

        calendar.appendChild(day);
    }
};
window.renderCalendar();
