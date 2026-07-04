import { db, ref, set, onValue, update, remove } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER")) || {};
let missions = {};

const missionsDiv = document.getElementById("missions");

// LOAD
onValue(ref(db, "missions"), (snap) => {
  missions = snap.val() || {};
  if (window.renderCalendar) window.renderCalendar(missions);
  renderMissions();
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
    });
};

// PARTICIPATION
window.participate = function (id, status) {
  const m = missions[id];
  if (!m) return;

  const name = user.login || "user";

  if (!m.participants) m.participants = {};

  m.participants[name] = status;

  update(ref(db, "missions/" + id), m);
};

// DELETE
window.deleteMission = function (id) {
  remove(ref(db, "missions/" + id));
};

// RENDER LIST
function renderMissions() {
  if (!missionsDiv) return;

  missionsDiv.innerHTML = "";

  Object.values(missions).forEach(m => {
    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${m.title}</h3>
      <p>${m.start} → ${m.end}</p>

      <button onclick="participate('${m.id}','present')">OK</button>
      <button onclick="participate('${m.id}','absent')">NO</button>

      ${user.role === "commandement"
        ? `<button onclick="deleteMission('${m.id}')">Delete</button>`
        : ""
      }
    `;

    missionsDiv.appendChild(div);
  });
}
