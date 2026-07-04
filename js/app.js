// Récupération utilisateur
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

// UI header
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

userInfo.innerText = `${user.login} — ${user.role.toUpperCase()}`;

// logout
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.href = "index.html";
});

// fake calendar simple (temporaire)
const calendar = document.getElementById("calendar");

function renderCalendar() {
    calendar.innerHTML = "";

    for (let i = 1; i <= 30; i++) {
        const day = document.createElement("div");
        day.className = "day";
        day.innerText = "Jour " + i;

        calendar.appendChild(day);
    }
}

renderCalendar();

// missions placeholder
const missionsDiv = document.getElementById("missions");
missionsDiv.innerHTML = "<p>Aucune mission (étape Firebase à venir)</p>";
