import { db, ref, push, set, onValue, update } from "./firebase.js";

// utilisateur connecté
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

// DOM
const missionsDiv = document.getElementById("missions");

// MISSIONS LOCAL CACHE
let missions = {};

// CHARGEMENT REALTIME FIREBASE
onValue(ref(db, "missions"), (snapshot) => {

    missions = snapshot.val() || {};

    renderMissions();

    if (window.renderCalendar) {
        window.renderCalendar();
    }
});

// CREER UNE MISSION (commandement uniquement)
window.createMission = function (mission) {

    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {
        id: id,
        title: mission.title,
        description: mission.description,
        startDate: mission.startDate,
        endDate: mission.endDate,
        time: mission.time,
        location: mission.location,
        concerned: mission.concerned,
        participants: {},
        absent: {},
        createdAt: Date.now()
        
    });
    window.createNotification("Nouvelle mission le " + mission.startDate);

};

// PARTICIPATION
window.participate = function (missionId, status) {

    const m = missions[missionId];
    if (!m) return;

    if (status === "present") {
        m.participants[user.login] = user;
        delete m.absent[user.login];
    }

    if (status === "absent") {
        m.absent[user.login] = user;
        delete m.participants[user.login];
    }

    update(ref(db, "missions/" + missionId), m);
};

// AFFICHAGE MISSIONS
function renderMissions() {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        const div = document.createElement("div");
        div.className = "mission";

        const isCommand = user.role === "commandement";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>
            <p>${m.startDate} → ${m.endDate}</p>
            <p>${m.location || ""}</p>

            <button onclick="participate('${m.id}', 'present')">Je participe</button>
            <button onclick="participate('${m.id}', 'absent')">Indisponible</button>

            ${isCommand ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>` : ""}
        `;

        missionsDiv.appendChild(div);
    });
}

// SUPPRESSION (commandement)
window.deleteMission = function (id) {
    update(ref(db, "missions/" + id), null);
};
window.renderMissionsByDate = function(date) {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (m.startDate !== date) return;

        const div = document.createElement("div");
        div.className = "mission";

        const isCommand = user.role === "commandement";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>
            <p>${m.location || ""}</p>

            <button onclick="participate('${m.id}', 'present')">Je participe</button>
            <button onclick="participate('${m.id}', 'absent')">Indisponible</button>

            ${isCommand ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>` : ""}
        `;

        missionsDiv.appendChild(div);
    });
};
