
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) window.location.href = "index.html";

// HEADER

const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

// attendre DOM
window.addEventListener("DOMContentLoaded", () => {

    const userInfo = document.getElementById("userInfo");
    const logoutBtn = document.getElementById("logoutBtn");

    if (userInfo) {
        userInfo.innerText = `${user.login} — ${user.role}`;
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem("BLEU4_USER");
            window.location.href = "index.html";
        };
    }

});

// SHOW CREATE ONLY FOR COMMAND
if (user.role !== "commandement") {
    document.getElementById("createMissionBox").style.display = "none";
}

// CREATE BUTTON
document.getElementById("createBtn").addEventListener("click", () => {

    const mission = {
        title: document.getElementById("mTitle").value,
        description: document.getElementById("mDesc").value,
        startDate: document.getElementById("mStartDate").value,
        endDate: document.getElementById("mEndDate").value,
        location: document.getElementById("mLocation").value
    };

    if (!mission.title || !mission.startDate || !mission.endDate) {
        alert("Remplis tout");
        return;
    }

    if (window.createMission) {
        window.createMission(mission);
        alert("Mission créée");
    } else {
        alert("Erreur mission");
    }
});
