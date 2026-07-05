
import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || {};

let missions = {};

const missionsDiv = document.getElementById("missions");

// LOAD
onValue(ref(db, "missions"), (snap) => {
    missions = snap.val() || {};

    if (window.renderCalendar) {
        window.renderCalendar(missions);
    }

    render();
});

// CREATE
window.createMission = function (m) {
    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {
        id,
        title: m.title || "",
        start: m.start || "",
        end: m.end || "",
        location: m.location || "",
        participants: {}
    });
};

// PARTICIPATE
window.participate = function (id, status) {
    const m = missions[id];
    if (!m) return;

    const name = user.login || "user";

    if (!m.participants) m.participants = {};

    m.participants[name] = status;

    update(ref(db, "missions/" + id), {
        participants: m.participants
    });

    render();
};

// DELETE
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// RENDER
function render() {

    if (!missionsDiv) return;

    missionsDiv.innerHTML = "";

    Object.values(missions || {}).forEach(m => {

        const p = m.participants || {};

        const present = Object.entries(p).filter(([_,v]) => v === "present");
        const absent = Object.entries(p).filter(([_,v]) => v === "absent");

        const div = document.createElement("div");

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.start} → ${m.end}</p>

            <button onclick="participate('${m.id}','present')">✔</button>
            <button onclick="participate('${m.id}','absent')">❌</button>

            <div>🟢 ${present.map(x => x[0]).join(", ") || "Aucun"}</div>
            <div>🔴 ${absent.map(x => x[0]).join(", ") || "Aucun"}</div>

            ${user.role === "commandement"
                ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
                : ""
            }
        `;

        missionsDiv.appendChild(div);
    });
}

function renderDashboard() {

    let total = Object.keys(missions).length;

    let present = 0;
    let absent = 0;
    let pending = 0;

    Object.values(missions).forEach(m => {

        const p = m.participants || {};

        Object.values(p).forEach(status => {

            if (status === "present") present++;

            else if (status === "absent") absent++;

        });

    });

    pending = 0;

    document.getElementById("statsTotal").innerText = total;
    document.getElementById("statsPresent").innerText = present;
    document.getElementById("statsAbsent").innerText = absent;
    document.getElementById("statsPending").innerText = pending;

}
