import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || {};

let missions = {};
const missionsDiv = document.getElementById("missions");

// =======================
// LOAD DATA
// =======================
onValue(ref(db, "missions"), (snap) => {

    missions = snap.val() || {};

    if (window.renderCalendar) {
        window.renderCalendar(missions);
    }

    renderList();
});

// =======================
// CREATE
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
        participants: {}
    });
};

// =======================
// PARTICIPATION
// =======================
window.participate = function (id, status) {

    const m = missions[id];
    if (!m) return;

    const login = user.login || "user";

    if (!m.participants) m.participants = {};

    m.participants[login] = status;

    update(ref(db, "missions/" + id), m);
};

// =======================
// DELETE
// =======================
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// =======================
// LIST SIMPLE
// =======================
function renderList() {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>
            <p>${m.startDate} → ${m.endDate}</p>

            <button onclick="participate('${m.id}','present')">Je participe</button>
            <button onclick="participate('${m.id}','absent')">Indisponible</button>

            ${user.role === "commandement"
                ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
                : ""
            }
        `;

        missionsDiv.appendChild(div);
    });
}
