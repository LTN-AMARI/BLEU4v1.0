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

// RENDER
function render() {

  missionsDiv.innerHTML = "";

  Object.values(missions).forEach(m => {

    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${m.title}</h3>
      <p>${m.start} → ${m.end}</p>

      <button onclick="participate('${m.id}','present')">✔</button>
      <button onclick="participate('${m.id}','absent')">❌</button>

      ${user.role === "commandement"
        ? `<button onclick="deleteMission('${m.id}')">Supprimer</button>`
        : ""
      }
    `;

    missionsDiv.appendChild(div);
  });
}
