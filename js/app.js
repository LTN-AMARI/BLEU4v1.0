// ======================================
// BLEU4 v2 - APP (orchestrateur)
// Point d'entrée de app.html.
// Fait le lien entre firebase.js, calendar.js
// et missions.js.
// ======================================

import { listenMissions, createMissionInDb } from "./firebase.js";
import { initCalendar, setCalendarMissions, getSelectedDate } from "./calendar.js";
import { renderMissionList, renderAllMissions } from "./missions.js";
import { frToIso, autoFormatDateInput, isoToFr } from "./dateUtils.js";
import {
    playAlertSound,
    showMissionBanner,
    requestNotificationPermission,
    showSystemNotification
} from "./notify.js";

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
        setTimeout(() => splash.remove(), 850);
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

// autorise (si possible) les notifications système —
// sans effet si le navigateur/l'appareil ne les supporte pas
requestNotificationPermission();

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

// suivi des missions déjà vues, pour ne notifier
// que les VRAIES nouveautés (pas celles déjà existantes
// au premier chargement de la page)
let knownMissionIds = null;

// suivi des réponses (présent/absent) par mission,
// pour notifier le COMMANDEMENT quand un membre répond
let knownResponses = null;

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

    // ===========================
    // DETECTION NOUVELLE MISSION
    // (alerte tout le monde, sauf le créateur)
    // ===========================

    const currentIds = new Set(missions.map((m) => m.id));

    if (knownMissionIds === null) {

        // premier chargement : on mémorise sans alerter,
        // sinon toutes les missions existantes déclencheraient
        // une alerte à l'ouverture de l'appli
        knownMissionIds = currentIds;

    } else {

        const newOnes = missions.filter((m) => !knownMissionIds.has(m.id));

        newOnes.forEach((mission) => {

            // la personne qui vient de créer la mission
            // ne reçoit pas sa propre alerte
            if (user && mission.createdBy === user.login) return;

            const message = `Nouvelle mission du ${isoToFr(mission.start)}, valide rapidement ta présence`;

            playAlertSound();
            showMissionBanner(message);
            showSystemNotification("Nouvelle mission BLEU4", message);

        });

        knownMissionIds = currentIds;

    }

    // ===========================
    // DETECTION REPONSE MEMBRE
    // (alerte uniquement le commandement)
    // ===========================

    const currentResponses = new Map();

    missions.forEach((m) => {
        currentResponses.set(m.id, { ...(m.responses || {}) });
    });

    if (knownResponses === null) {

        // premier chargement : on mémorise sans alerter
        knownResponses = currentResponses;

    } else {

        if (user && user.role === "commandement") {

            missions.forEach((mission) => {

                const prev = knownResponses.get(mission.id) || {};
                const curr = currentResponses.get(mission.id) || {};

                Object.entries(curr).forEach(([login, status]) => {

                    if (prev[login] === status) return; // pas de changement

                    const label = status === "present" ? "présent" : "absent";

                    const message =
                        `${login} s'est déclaré ${label} pour la mission "${mission.title}" (${isoToFr(mission.start)})`;

                    playAlertSound();
                    showMissionBanner(message);
                    showSystemNotification("Réponse à une mission", message);

                });

            });

        }

        knownResponses = currentResponses;

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

// ===========================
// PATRACDR (optionnel)
// ===========================

const patracdrToggle = document.getElementById("patracdrToggle");
const patracdrFields = document.getElementById("patracdrFields");

patracdrToggle?.addEventListener("change", () => {
    patracdrFields.classList.toggle("hidden", !patracdrToggle.checked);
});

function collectPatracdrFromForm() {

    if (!patracdrToggle || !patracdrToggle.checked) return null;

    return {
        personnel: document.getElementById("pPersonnel").value.trim(),
        armement: document.getElementById("pArmement").value.trim(),
        tenue: document.getElementById("pTenue").value.trim(),
        radio: document.getElementById("pRadio").value.trim(),
        alimentation: document.getElementById("pAlimentation").value.trim(),
        camouflage: document.getElementById("pCamouflage").value.trim(),
        divers: document.getElementById("pDivers").value.trim(),
        rassemblement: document.getElementById("pRassemblement").value.trim()
    };

}

function resetPatracdrForm() {

    if (!patracdrToggle) return;

    patracdrToggle.checked = false;
    patracdrFields.classList.add("hidden");

    ["pPersonnel", "pArmement", "pTenue", "pRadio", "pAlimentation", "pCamouflage", "pDivers", "pRassemblement"]
        .forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

}

createBtn?.addEventListener("click", async () => {

    const startIso = frToIso(mStartInput.value);
    const endIso = frToIso(mEndInput.value);

    const mission = {
        title: document.getElementById("mTitle").value.trim(),
        description: document.getElementById("mDesc").value.trim(),
        start: startIso,
        end: endIso,
        location: document.getElementById("mLocation").value.trim(),
        concerned: document.getElementById("mConcerned").value.trim() || "Tous",
        createdBy: user ? user.login : "",
        patracdr: collectPatracdrFromForm()
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
        resetPatracdrForm();

    } catch (err) {

        console.error(err);
        alert("Erreur lors de la création de la mission. Vérifie ta configuration Firebase.");

    } finally {

        createBtn.disabled = false;

    }

});

console.log("✅ BLEU4 v2 chargé");
