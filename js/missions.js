import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || {};

let missions = {};
const missionsDiv = document.getElementById("missions");

// =======================
// FIREBASE LISTENER (SAFE)
// =======================
onValue(ref(db, "missions"), (snapshot) => {

    missions = snapshot.val() || {};

    // calendrier
    if (window.renderCalendar) {
        window.renderCalendar(missions);
    }

    // dashboard si existe
    if (window.renderDashboard) {
        window.renderDashboard();
    }

    // refresh jour
    if (window.selectedDate && window.renderMissionsByDate) {
        window.renderMissionsByDate(window.selectedDate);
    }
});

// =======================
// CREATE MISSION (SAFE)
// =======================
window.createMission = function (m) {

    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {
        id,
        title: m.title || "",
        description: m.description || "",
        startDate: m.startDate || "",
        endDate: m.endDate || "",
        location: m.location || "",
        concerned: m.concerned || "",
        participants: {},
        absent: {},
        createdAt: Date.now()
    });
};

// =======================
// PARTICIPATION (SAFE)
// =======================
window.participate = function (id, status) {

    const m = missions[id];
    if (!m) return;

    const login = user.login;

    if (!m.participants) m.participants = {};
    if (!m.absent) m.absent = {};

    delete m.participants[login];
    delete m.absent[login];

    if (status === "present") m.participants[login] = true;
    if (status === "absent") m.absent[login] = true;

    update(ref(db, "missions/" + id), m);
};

// =======================
// DELETE (COMMANDMENT)
// =======================
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// =======================
// RENDER DAY (SAFE)
// =======================
window.renderMissionsByDate = function (date) {

    if (!missionsDiv) return;
    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (!m.startDate || !m.endDate) return;
        if (date < m.startDate || date > m.endDate) return;

        const div = document.createElement("div");
        div.className = "mission";

        const participants = Object.keys(m.participants || {});
        const absents = Object.keys(m.absent || {});

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description}</p>
            <p>📍 ${m.location}</p>

            <button onclick="participate('${m.id}','present')"
            style="background:green;color:white;">
            Je participe</button>

            <button onclick="participate('${m.id}','absent')"
            style="background:red;color:white;">
            Indisponible</button>

            <hr>

            <p>🟢 ${participants.join(", ") || "Aucun"}</p>
            <p>🔴 ${absents.join(", ") || "Aucun"}</p>

            ${user.role === "commandement"
                ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
                : ""
            }
        `;

        missionsDiv.appendChild(div);
    });
};
