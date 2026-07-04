
import { db, ref, set, onValue, update, remove } from "./firebase.js";

// =======================
// USER
// =======================
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

const missionsDiv = document.getElementById("missions");

let missions = {};

// =======================
// REALTIME LISTENER
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
// CREATE MISSION
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

    // notification simple (si existant)
    if (window.createNotification) {
        window.createNotification(
            `Nouvelle mission du ${m.startDate} au ${m.endDate}`
        );
    }
};

// =======================
// PARTICIPATION
// =======================

window.pendingAction = null;

// =======================
// CHOIX UTILISATEUR (UI TEMPORAIRE)
// =======================
window.selectParticipation = function (id, status) {

    window.pendingAction = {
        id,
        status
    };

    alert(`Choix enregistré : ${status}. Clique sur VALIDER pour confirmer.`);
};

// =======================
// VALIDATION ACTION
// =======================
window.validateParticipation = function () {

    if (!window.pendingAction) {
        alert("Aucune action à valider");
        return;
    }

    const { id, status } = window.pendingAction;

    const m = missions[id];
    if (!m) return;

    const login = user.login;

    if (status === "present") {
        m.participants[login] = user;
        delete m.absent[login];
    }

    if (status === "absent") {
        m.absent[login] = user;
        delete m.participants[login];
    }

    update(ref(db, "missions/" + id), m);

    window.pendingAction = null;

    alert("Participation validée !");
};

// =======================
// DELETE MISSION
// =======================
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// =======================
// RENDER BY DATE
// =======================
function renderByDate(date) {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (!m.startDate || !m.endDate) return;

        // mission active sur la date
        const isInRange = date >= m.startDate && date <= m.endDate;

        if (!isInRange) return;

        const div = document.createElement("div");
        div.className = "mission";

        const isCommand = user.role === "commandement";

        
div.innerHTML = `
    <h3>${m.title}</h3>
    <p>${m.description || ""}</p>

    <p>📅 Du ${m.startDate} au ${m.endDate}</p>
    <p>📍 ${m.location || ""}</p>

    <button onclick="selectParticipation('${m.id}', 'present')">Je participe</button>
    <button onclick="selectParticipation('${m.id}', 'absent')">Indisponible</button>

    <button onclick="validateParticipation()">Valider</button>

    <hr>

    <p><strong>👥 Présents :</strong></p>
    <ul>
        ${Object.keys(m.participants || {}).map(u => `<li>🟢 ${u}</li>`).join("")}
    </ul>

    <p><strong>❌ Absents :</strong></p>
    <ul>
        ${Object.keys(m.absent || {}).map(u => `<li>🔴 ${u}</li>`).join("")}
    </ul>

    ${isCommand ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>` : ""}
`;

        missionsDiv.appendChild(div);
    });
}

// =======================
// EXPORT
// =======================
window.renderMissionsByDate = renderByDate;

// =======================
// DASHBOARD
// =======================
window.renderDashboard = function () {

    const user = JSON.parse(localStorage.getItem("BLEU4_USER"));
    if (!user || user.role !== "commandement") return;

    let total = 0;
    let present = 0;
    let absent = 0;

    Object.values(missions).forEach(m => {

        total++;

        present += Object.keys(m.participants || {}).length;
        absent += Object.keys(m.absent || {}).length;
    });

    const pending = Math.max(0, total * 2 - (present + absent));

    const t = document.getElementById("statsTotal");
    const p = document.getElementById("statsPresent");
    const a = document.getElementById("statsAbsent");
    const s = document.getElementById("statsPending");

    if (!t) return;

    t.innerText = `Missions : ${total}`;
    p.innerText = `Présents : ${present}`;
    a.innerText = `Absents : ${absent}`;
    s.innerText = `Sans réponse : ${pending}`;
};
