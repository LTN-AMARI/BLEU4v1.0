import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

const missionsDiv = document.getElementById("missions");

let missions = {};

// CHARGEMENT REALTIME
onValue(ref(db, "missions"), (snap) => {
    missions = snap.val() || {};

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

// CREER MISSION
window.createMission = function (m) {

    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {
        id,
        title: m.title,
        description: m.description,
        date: m.date,
        time: m.time,
        location: m.location,
        concerned: m.concerned,
        participants: {},
        absent: {},
        createdAt: Date.now()
    });

    if (window.createNotification) {
        window.createNotification("Nouvelle mission le " + m.date);
    }
};

// PARTICIPATION
window.participate = function (id, status) {

    const m = missions[id];
    if (!m) return;

    if (status === "present") {
        m.participants[user.login] = user;
        delete m.absent[user.login];
    }

    if (status === "absent") {
        m.absent[user.login] = user;
        delete m.participants[user.login];
    }

    update(ref(db, "missions/" + id), m);
};

// SUPPRESSION
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// AFFICHAGE PAR DATE
function renderByDate(date) {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (m.date !== date) return;

        const div = document.createElement("div");
        div.className = "mission";

        const isCommand = user.role === "commandement";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>
            <p>${m.time || ""} - ${m.location || ""}</p>

            <button onclick="participate('${m.id}', 'present')">Je participe</button>
            <button onclick="participate('${m.id}', 'absent')">Indisponible</button>

            ${isCommand ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>` : ""}
        `;

        missionsDiv.appendChild(div);
    });
}

// EXPORT POUR APP
window.renderMissionsByDate = renderByDate;
window.renderDashboard = function () {

    const user = JSON.parse(localStorage.getItem("BLEU4_USER"));
    if (user.role !== "commandement") return;

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
