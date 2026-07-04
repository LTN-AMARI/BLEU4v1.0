import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || {};
let missions = {};

const missionsDiv = document.getElementById("missions");

// LOAD DATA
onValue(ref(db, "missions"), (snap) => {
  missions = snap.val() || {};
  if (window.renderCalendar) window.renderCalendar(missions);
  render();
});

// CREATE
window.createMission = function (m) {

    const id = Date.now().toString();

    set(ref(db, "missions/" + id), {
        id,
        title: m.title || "",
        description: m.description || "",
        start: m.start || "",
        end: m.end || "",
        location: m.location || "",
        concerned: m.concerned || "",
        participants: {}
    }).then(() => {
        console.log("✔ Mission créée");
    }).catch(err => {
        console.error("❌ Firebase error:", err);
    });
};

// PARTICIPATION
window.participate = function (id, status) {

    const m = missions[id];
    if (!m) return;

    const name = user.login || "user";

    if (!m.participants) {
        m.participants = {};
    }

    // on stocke directement le statut
    m.participants[name] = status; 
    // status = "present" OU "absent"

    update(ref(db, "missions/" + id), {
        participants: m.participants
    })
    .then(() => {
        console.log("✔ statut enregistré :", status);
        render(); // refresh UI
    })
    .catch(err => console.error(err));
};

// DELETE
window.deleteMission = function (id) {
  remove(ref(db, "missions/" + id));
};

// RENDER
function render() {

const missionsDiv = document.getElementById("missions");
if (!missionsDiv) return;

missionsDiv.innerHTML = "";

const list = Object.values(missions || {});

list.forEach(m => {

const p = m.participants || {};

const present = Object.entries(p).filter(([_,v]) => v === "present");
const absent = Object.entries(p).filter(([_,v]) => v === "absent");

const div = document.createElement("div");

div.innerHTML = `
<h3>${m.title || ""}</h3>
<p>${m.start || ""} → ${m.end || ""}</p>

<button onclick="participate('${m.id}','present')">✔ Présent</button>
<button onclick="participate('${m.id}','absent')">❌ Indisponible</button>

<div>
<b>🟢 Présents</b><br>
${present.length ? present.map(x => x[0]).join("<br>") : "Aucun"}
</div>

<div>
<b>🔴 Absents</b><br>
${absent.length ? absent.map(x => x[0]).join("<br>") : "Aucun"}
</div>
`;

missionsDiv.appendChild(div);
});

}
