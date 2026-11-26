
// ======================================
// BLEU4 2027 - FIREBASE
// Missions + personnel
// Conservation des données existantes
// ======================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue,
    push,
    update,
    remove,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ======================================
// CONFIGURATION
// ======================================

const firebaseConfig = {
    apiKey: "AIzaSyCOTja98aA-0umXrqm2c2k4frUFn6why1o",
    authDomain: "bleu-4.firebaseapp.com",
    databaseURL: "https://bleu-4-default-rtdb.firebaseio.com",
    projectId: "bleu-4",
    storageBucket: "bleu-4.firebasestorage.app",
    messagingSenderId: "788139266954",
    appId: "1:788139266954:web:c1896f25eb57687846ae73"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const missionsRef = ref(db, "missions");
const personnelRef = ref(db, "personnel");

// ======================================
// UTILITAIRE : CLE FIREBASE
// ======================================

export function safeKey(value) {
    return String(value || "")
        .trim()
        .replace(/[.#$\[\]\/]/g, "_");
}

// ======================================
// MISSIONS : LECTURE TEMPS REEL
// ======================================

export function listenMissions(callback) {
    return onValue(missionsRef, (snapshot) => {
        const data = snapshot.val() || {};

        const missions = Object.entries(data).map(([id, value]) => ({
            id,
            ...value
        }));

        callback(missions);
    }, (error) => {
        console.error("Erreur lecture missions :", error);
    });
}

// ======================================
// MISSIONS : CREATION
// ======================================

export async function createMissionInDb(mission) {
    const data = {
        title: mission.title,
        description: mission.description || "",
        start: mission.start,
        end: mission.end,
        location: mission.location || "",
        concerned: mission.concerned || "Tous",
        createdBy: mission.createdBy || "",
        responses: {}
    };

    // Groupe : 1, 2, 3 ou all
    if (mission.group) {
        data.group = String(mission.group);
    }

    if (mission.patracdr) {
        data.patracdr = mission.patracdr;
    }

    return push(missionsRef, data);
}

// ======================================
// MISSIONS : REPONSES
// ======================================

export async function setResponse(missionId, login, status) {
    const key = safeKey(login);
    const entryRef = ref(db, `missions/${missionId}/responses/${key}`);

    await update(entryRef, { status });
}

export async function setResponseDays(missionId, login, days) {
    const key = safeKey(login);
    const entryRef = ref(db, `missions/${missionId}/responses/${key}`);

    await update(entryRef, { days });
}

export async function removeResponse(missionId, login) {
    const key = safeKey(login);
    const entryRef = ref(db, `missions/${missionId}/responses/${key}`);

    await update(entryRef, {
    status: "present",
    days
});
}

// ======================================
// MISSIONS : MODIFICATION / SUPPRESSION
// ======================================

export async function deleteMissionInDb(missionId) {
    await remove(ref(db, `missions/${missionId}`));
}

export async function updateMissionInDb(missionId, fields) {
    await update(ref(db, `missions/${missionId}`), fields);
}

// ======================================
// PERSONNEL : LECTURE TEMPS REEL
// ======================================

export function listenPersonnel(callback) {
    return onValue(personnelRef, (snapshot) => {
        const data = snapshot.val() || {};

        const personnel = Object.entries(data).map(([id, value]) => ({
            id,
            ...value
        }));

        callback(personnel);
    }, (error) => {
        console.error("Erreur lecture personnel :", error);
    });
}

// ======================================
// PERSONNEL : AJOUT / MODIFICATION
// ======================================

export async function savePersonnel(person, originalLogin = null) {
    const login = String(person.login || "").trim().toUpperCase();
    const group = String(person.group || "");

    if (!login) {
        throw new Error("Le grade et le nom sont obligatoires.");
    }

    if (!["1", "2", "3"].includes(group)) {
        throw new Error("Groupe invalide.");
    }

    const newKey = safeKey(login);

    const data = {
        login,
        group,
        active: person.active !== false
    };

    const oldKey = originalLogin
        ? safeKey(originalLogin)
        : null;

    // Si le login change, on déplace la fiche.
    if (oldKey && oldKey !== newKey) {
        await set(ref(db, `personnel/${newKey}`), data);
        await remove(ref(db, `personnel/${oldKey}`));
    } else {
        await set(ref(db, `personnel/${newKey}`), data);
    }
}

// ======================================
// PERSONNEL : SUPPRESSION
// ======================================

export async function deletePersonnel(login) {
    const key = safeKey(login);
    await remove(ref(db, `personnel/${key}`));
}
