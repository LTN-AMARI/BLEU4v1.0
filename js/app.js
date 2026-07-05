// ======================================
// BLEU4 v2 - APP (orchestrateur)
// Point d'entrée de app.html.
// Fait le lien entre firebase.js, calendar.js,
// missions.js et dashboard.js.
// ======================================

import { listenMissions, createMissionInDb } from "./firebase.js";
import { initCalendar, setCalendarMissions, getSelectedDate } from "./calendar.js";
import { renderMissionList } from "./missions.js";
import { updateDashboard } from "./dashboard.js";

// ======================================
// SECURITE / SESSION
// ======================================

const user = JSON.parse(localStorage.getItem("BLEU4_USER") || "null");

if (!user) {
    window.location.href = "index.html";
}

// ======================================
// HEADER
// ======================================

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

if (userInfo && user) {
    userInfo.textContent = `${user.login} — ${user.role.toUpperCase()}`;
}

logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.href = "index.html";
});

// ======================================
// AFFICHAGE SELON LE ROLE
// ======================================

const createBox = document.getElementById("createMissionBox");
const dashboard = document.getElementById("dashboard");

if (user && user.role === "commandement") {

    if (createBox) createBox.style.display = "block";
    if (dashboard) dashboard.style.display = "block";

} else {

    if (createBox) createBox.style.display = "none";
    if (dashboard) dashboard.style.display = "none";

}

// ======================================
// ETAT CENTRAL DES MISSIONS
// (seule source de vérité, alimentée par
// l'unique lecture Firebase de firebase.js)
// ======================================

let allMissions = [];

initCalendar((date) => {
    renderMissionList(allMissions, date, user);
});

listenMissions((missions) => {

    allMissions = missions;

    setCalendarMissions(missions);
    updateDashboard(missions);

    const selected = getSelectedDate();

    if (selected) {
        renderMissionList(allMissions, selected, user);
    }

});

// ======================================
// CREATION MISSION (commandement uniquement,
// mais le bouton n'existe même pas pour les
// membres puisque createBox est masqué)
// ======================================

const createBtn = document.getElementById("createBtn");

createBtn?.addEventListener("click", async () => {

    const mission = {
        title: document.getElementById("mTitle").value.trim(),
        description: document.getElementById("mDesc").value.trim(),
        start: document.getElementById("mStart").value,
        end: document.getElementById("mEnd").value,
        location: document.getElementById("mLocation").value.trim(),
        concerned: document.getElementById("mConcerned").value.trim() || "Tous"
    };

    if (!mission.title || !mission.start || !mission.end) {
        alert("Titre, date de début et date de fin obligatoires.");
        return;
    }

    if (mission.end < mission.start) {
        alert("La date de fin ne peut pas être avant la date de début.");
        return;
    }

    createBtn.disabled = true;

    try {

        await createMissionInDb(mission);

        document.getElementById("mTitle").value = "";
        document.getElementById("mDesc").value = "";
        document.getElementById("mStart").value = "";
        document.getElementById("mEnd").value = "";
        document.getElementById("mLocation").value = "";
        document.getElementById("mConcerned").value = "";

    } catch (err) {

        console.error(err);
        alert("Erreur lors de la création de la mission. Vérifie ta configuration Firebase.");

    } finally {

        createBtn.disabled = false;

    }

});

console.log("✅ BLEU4 v2 chargé");
