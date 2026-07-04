import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

const missionsDiv = document.getElementById("missions");

let missions = {};

// =======================
// CHARGEMENT FIREBASE
// =======================
onValue(ref(db, "missions"), (snapshot) => {

    missions = snapshot.val() || {};

    if (window.renderCalendar) {
        window.renderCalendar(missions);
    }

    if (window.renderDashboard) {
        window.renderDashboard();
    }

    if (window.selectedDate) {
        renderByDate(window.selectedDate);
    }
});

// =======================
// CREER MISSION
// =======================
window.createMission = function (m) {

    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {
        id,
        title: m.title,
        description: m.description,
        startDate: m.startDate,
        endDate: m.endDate,
        location: m.location,
        concerned: m.concerned,

        participants: {},
        absent: {},

        createdAt: Date.now()
    });
};

// =======================
// PARTICIPATION
// =======================

window.participate = function (id, status) {

    const m = missions[id];
    if (!m) return;

    const login = user.login;

    // sécurité structure
    if (!m.participants) m.participants = {};
    if (!m.absent) m.absent = {};

    // reset
    delete m.participants[login];
    delete m.absent[login];

    // action directe
    if (status === "present") {
        m.participants[login] = true;
    }

    if (status === "absent") {
        m.absent[login] = true;
    }

    update(ref(db, "missions/" + id), m);
};

// =======================
// SUPPRESSION
// =======================
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// =======================
// AFFICHAGE
// =======================
function renderByDate(date) {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (!m.startDate || !m.endDate) return;

        const inRange = date >= m.startDate && date <= m.endDate;

        if (!inRange) return;

        const participants = Object.keys(m.participants || {});
        const absents = Object.keys(m.absent || {});

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>

            <p>📅 Du ${m.startDate} au ${m.endDate}</p>
            <p>📍 ${m.location || ""}</p>

            
<button onclick="participate('${m.id}','present')"
style="background:green;color:white;">
Je participe
</button>

<button onclick="participate('${m.id}','absent')"
style="background:red;color:white;">
Indisponible
</button>

            <hr>

            <p><b>🟢 Présents</b></p>
            ${participants.length ? participants.map(u => `<div>${u}</div>`).join("") : "<div>Aucun</div>"}

            <p><b>🔴 Absents</b></p>
            ${absents.length ? absents.map(u => `<div>${u}</div>`).join("") : "<div>Aucun</div>"}

            ${user.role === "commandement"
                ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
                : ""
            }
        `;

        missionsDiv.appendChild(div);
    });
}
onValue(ref(db, "missions"), (snapshot) => {
    console.log("🔥 FIREBASE RAW DATA :", snapshot.val());
});

window.renderMissionsByDate = renderByDate;
