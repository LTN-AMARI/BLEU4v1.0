import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || {};

const missionsDiv = document.getElementById("missions");

let missions = {};

// ===========================
// CHARGEMENT FIREBASE
// ===========================

onValue(ref(db, "missions"), (snapshot) => {

    missions = snapshot.val() || {};

    // Mise à jour calendrier
    if (window.setCalendarMissions) {
        window.setCalendarMissions(missions);
    }

    renderMissions();
    renderDashboard();

});

// ===========================
// CREATION MISSION
// ===========================

window.createMission = function (mission) {

    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {

        id: id,

        title: mission.title || "",

        description: mission.description || "",

        start: mission.start || "",

        end: mission.end || "",

        location: mission.location || "",

        concerned: mission.concerned || "Tous",

        participants: {}

    });

};

// ===========================
// PARTICIPATION
// ===========================

window.participate = function (id, status) {

    if (!missions[id]) return;

    const login = user.login;

    if (!login) return;

    if (!missions[id].participants) {
        missions[id].participants = {};
    }

    missions[id].participants[login] = status;

    update(ref(db, "missions/" + id), {

        participants: missions[id].participants

    });

};

// ===========================
// SUPPRESSION
// ===========================

window.deleteMission = function (id) {

    if (confirm("Supprimer cette mission ?")) {

        remove(ref(db, "missions/" + id));

    }

};

// ===========================
// AFFICHAGE MISSIONS
// ===========================

function renderMissions() {

    if (!missionsDiv) return;

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        const participants = m.participants || {};

        const presents = Object.entries(participants)
            .filter(([_, s]) => s === "present")
            .map(([u]) => u);

        const absents = Object.entries(participants)
            .filter(([_, s]) => s === "absent")
            .map(([u]) => u);

        const card = document.createElement("div");

        card.className = "mission";

        card.innerHTML = `

            <h3>${m.title}</h3>

            <p>📅 ${m.start} → ${m.end}</p>

            <p>📍 ${m.location || "-"}</p>

            <div class="actions">

                <button class="btn-present"
                    onclick="participate('${m.id}','present')">
                    Je participe
                </button>

                <button class="btn-absent"
                    onclick="participate('${m.id}','absent')">
                    Indisponible
                </button>

            </div>

            <div class="list">

                <b>🟢 Présents (${presents.length})</b><br>

                ${presents.length ? presents.join("<br>") : "Aucun"}

                <br><br>

                <b>🔴 Indisponibles (${absents.length})</b><br>

                ${absents.length ? absents.join("<br>") : "Aucun"}

            </div>

            ${
                user.role === "commandement"
                ? `<br><button class="btn-delete"
                    onclick="deleteMission('${m.id}')">
                    Supprimer
                   </button>`
                : ""
            }

        `;

        missionsDiv.appendChild(card);

    });

}

// ===========================
// TABLEAU DE BORD
// ===========================

function renderDashboard() {

    const total = Object.keys(missions).length;

    let present = 0;
    let absent = 0;

    Object.values(missions).forEach(m => {

        const p = m.participants || {};

        Object.values(p).forEach(status => {

            if (status === "present") present++;

            if (status === "absent") absent++;

        });

    });

    const pending = 0;

    const totalEl = document.getElementById("statsTotal");
    const presentEl = document.getElementById("statsPresent");
    const absentEl = document.getElementById("statsAbsent");
    const pendingEl = document.getElementById("statsPending");

    if (totalEl) totalEl.innerText = total;
    if (presentEl) presentEl.innerText = present;
    if (absentEl) absentEl.innerText = absent;
    if (pendingEl) pendingEl.innerText = pending;

}
