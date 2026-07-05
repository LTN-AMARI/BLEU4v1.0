// ======================================
// BLEU4 v2 - APP (orchestrateur)
// Point d'entrée de app.html.
// Fait le lien entre firebase.js, calendar.js
// et missions.js.
// ======================================

import { listenMissions, createMissionInDb } from "./firebase.js";
import { initCalendar, setCalendarMissions, getSelectedDate } from "./calendar.js";
import { renderMissionList, renderAllMissions } from "./missions.js";
import { frToIso, autoFormatDateInput } from "./dateUtils.js";

// ======================================
// ECRAN DE DEMARRAGE (SPLASH)
// Reste visible au moins 2s, puis fondu.
// Se cache dès la première réponse Firebase
// (ou après 8s max en cas de souci réseau).
// ======================================

const SPLASH_MIN_DURATION = 2000;
const SPLASH_MAX_DURATION = 8000;

const splashStart = Date.now();
let splashHidden = false;

function hideSplashScreen() {

    if (splashHidden) return;
    splashHidden = true;

    const splash = document.getElementById("splashScreen");
    if (!splash) return;

    const elapsed = Date.now() - splashStart;
    const remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);

    setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => splash.remove(), 700);
    }, remaining);

}

// sécurité : si Firebase ne répond jamais (mauvaise config, réseau…)
// on ne bloque pas l'utilisateur indéfiniment derrière le logo
setTimeout(hideSplashScreen, SPLASH_MAX_DURATION);

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
const allMissionsBox = document.getElementById("allMissionsBox");

if (user && user.role === "commandement") {

    if (createBox) createBox.style.display = "block";
    if (allMissionsBox) allMissionsBox.style.display = "block";

} else {

    if (createBox) createBox.style.display = "none";
    if (allMissionsBox) allMissionsBox.style.display = "none";

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

    if (user && user.role === "commandement") {
        renderAllMissions(allMissions, user);
    }

    const selected = getSelectedDate();

    if (selected) {
        renderMissionList(allMissions, selected, user);
    }

    hideSplashScreen();

});

// ======================================
// CREATION MISSION (commandement uniquement,
// mais le bouton n'existe même pas pour les
// membres puisque createBox est masqué)
// ======================================

const createBtn = document.getElementById("createBtn");
const mStartInput = document.getElementById("mStart");
const mEndInput = document.getElementById("mEnd");

// formatage automatique "JJ/MM/AAAA" pendant la saisie
autoFormatDateInput(mStartInput);
autoFormatDateInput(mEndInput);

createBtn?.addEventListener("click", async () => {

    const startIso = frToIso(mStartInput.value);
    const endIso = frToIso(mEndInput.value);

    const mission = {
        title: document.getElementById("mTitle").value.trim(),
        description: document.getElementById("mDesc").value.trim(),
        start: startIso,
        end: endIso,
        location: document.getElementById("mLocation").value.trim(),
        concerned: document.getElementById("mConcerned").value.trim() || "Tous"
    };

    if (!mission.title) {
        alert("Le titre est obligatoire.");
        return;
    }

    if (!startIso || !endIso) {
        alert("Les dates doivent être valides et au format JJ/MM/AAAA.");
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
        mStartInput.value = "";
        mEndInput.value = "";
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
