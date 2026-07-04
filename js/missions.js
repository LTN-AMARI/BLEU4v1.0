
import { db, ref, set, onValue, update, remove } from "./firebase.js";

// =======================
// USER SAFE
// =======================
const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || { login: "unknown", role: "membre" };

const missionsDiv = document.getElementById("missions");

let missions = {};

// =======================
// FIREBASE LISTENER (UNIQUE)
// =======================
onValue(ref(db, "missions"), (snapshot) => {

    missions = snapshot.val() || {};

    console.log("🔥 FIREBASE DATA :", missions);

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
};

// =======================
// PARTICIPATION (1 CLICK DIRECT)
// =======================
window.participate = function (id, status) {

    const m = missions[id];
    if (!m) return;

    const login = user.login;

    if (!m.participants) m.participants = {};
    if (!m.absent) m.absent = {};

    delete m.participants[login];
    delete m.absent[login];

    if (status === "present") {
        m.participants[login] = true;
    }

    if (status === "absent") {
        m.absent[login] = true;
    }

    update(ref(db, "missions/" + id), m);
};

// =======================
// DELETE
// =======================
window.deleteMission = function (id) {
    remove(ref(db, "missions/" + id));
};

// =======================
// RENDER
// =======================

function renderByDate(date) {

    missionsDiv.innerHTML = "";

    Object.values(missions).forEach(m => {

        if (!m.startDate || !m.endDate) return;

        const inRange = date >= m.startDate && date <= m.endDate;
        if (!inRange) return;

        const participants = Object.keys(m.participants || {});
        const absents = Object.keys(m.absent || {});

        const isPresent = m.participants && m.participants[user.login];
        const isAbsent = m.absent && m.absent[user.login];

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ""}</p>

            <p>📅 Du ${m.startDate} au ${m.endDate}</p>
            <p>📍 ${m.location || ""}</p>

            <!-- BOUTON PRESENT -->
            <button onclick="participate('${m.id}','present')"
                style="
                    background:${isPresent ? '#00c853' : 'green'};
                    color:white;
                    padding:8px;
                    margin-right:5px;
                ">
                🟢 Je participe
            </button>

            <!-- BOUTON ABSENT -->
            <button onclick="participate('${m.id}','absent')"
                style="
                    background:${isAbsent ? '#d50000' : 'red'};
                    color:white;
                    padding:8px;
                ">
                🔴 Indisponible
            </button>

            <hr>

            <p><b>🟢 Présents</b></p>
            ${participants.length > 0
                ? participants.map(u => `<div>${u}</div>`).join("")
                : "<div>Aucun</div>"
            }

            <p><b>🔴 Absents</b></p>
            ${absents.length > 0
                ? absents.map(u => `<div>${u}</div>`).join("")
                : "<div>Aucun</div>"
            }

            ${user.role === "commandement"
                ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
                : ""
            }
        `;

        missionsDiv.appendChild(div);
    });
}
        missionsDiv.appendChild(div);
    });
}

window.renderMissionsByDate = renderByDate;
