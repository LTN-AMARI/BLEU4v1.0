
// ======================================
// BLEU4 2027 - FIREBASE
// Missions + personnel
// Conservation des données existantes
// Firebase SDK 10.12.2
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
    return String(value ?? "")
        .trim()
        .replace(/[.#$\[\]\/]/g, "_");
}

// ======================================
// UTILITAIRE : VERIFICATION
// ======================================

function requireValue(value, message) {
    if (value === null || value === undefined || value === "") {
        throw new Error(message);
    }
}

// ======================================
// MISSIONS : LECTURE TEMPS REEL
// ======================================

export function listenMissions(callback) {

    return onValue(
        missionsRef,
        (snapshot) => {

            const data = snapshot.val() || {};

            const missions = Object.entries(data).map(([id, value]) => ({
                ...value,
                id
            }));

            callback(missions);
        },
        (error) => {
            console.error("Erreur lecture missions :", error);
        }
    );
}

// ======================================
// MISSIONS : CREATION
// ======================================

export async function createMissionInDb(mission) {

    requireValue(mission?.title, "Le titre de la mission est obligatoire.");
    requireValue(mission?.start, "La date de début est obligatoire.");
    requireValue(mission?.end, "La date de fin est obligatoire.");

    const data = {
        title: String(mission.title).trim(),
        description: String(mission.description || ""),
        start: String(mission.start),
        end: String(mission.end),
        location: String(mission.location || ""),
        concerned: String(mission.concerned || "Tous"),
        createdBy: String(mission.createdBy || ""),
        responses: {}
    };

    // Groupe : 1, 2, 3 ou all
    if (mission.group) {
        const group = String(mission.group);

        if (!["1", "2", "3", "all"].includes(group)) {
            throw new Error("Groupe de mission invalide.");
        }

        data.group = group;
    }

    if (mission.patracdr) {
        data.patracdr = mission.patracdr;
    }

    return push(missionsRef, data);
}

// ======================================
// MISSIONS : ENREGISTRER UNE REPONSE
// Compatible avec les anciennes réponses
// ======================================

export async function setResponse(missionId, login, status) {

    requireValue(missionId, "Identifiant de mission manquant.");
    requireValue(login, "Identifiant du membre manquant.");

    if (!["present", "absent"].includes(status)) {
        throw new Error("Statut de réponse invalide.");
    }

    const key = safeKey(login);

    if (!key) {
        throw new Error("Identifiant du membre invalide.");
    }

    const entryRef = ref(
        db,
        `missions/${missionId}/responses/${key}`
    );

    await update(entryRef, {
        status
    });
}

// ======================================
// MISSIONS : JOURS EFFECTUES
// Conserve le statut présent
// ======================================

export async function setResponseDays(missionId, login, days) {

    requireValue(missionId, "Identifiant de mission manquant.");
    requireValue(login, "Identifiant du membre manquant.");

    const key = safeKey(login);
    const value = Number(days);

    if (!Number.isFinite(value) || value < 0) {
        throw new Error("Nombre de jours invalide.");
    }

    const entryRef = ref(
        db,
        `missions/${missionId}/responses/${key}`
    );

    await update(entryRef, {
        status: "present",
        days: value
    });
}

// ======================================
// MISSIONS : SUPPRIMER UNE REPONSE
// ======================================

export async function removeResponse(missionId, login) {

    requireValue(missionId, "Identifiant de mission manquant.");
    requireValue(login, "Identifiant du membre manquant.");

    const key = safeKey(login);

    const entryRef = ref(
        db,
        `missions/${missionId}/responses/${key}`
    );

    await remove(entryRef);
}

// ======================================
// MISSIONS : MODIFICATION
// ======================================

export async function updateMissionInDb(missionId, fields) {

    requireValue(missionId, "Identifiant de mission manquant.");

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
        throw new Error("Données de modification invalides.");
    }

    await update(
        ref(db, `missions/${missionId}`),
        fields
    );
}

// ======================================
// MISSIONS : SUPPRESSION
// ======================================

export async function deleteMissionInDb(missionId) {

    requireValue(missionId, "Identifiant de mission manquant.");

    await remove(
        ref(db, `missions/${missionId}`)
    );
}

// ======================================
// PERSONNEL : LECTURE TEMPS REEL
// ======================================

export function listenPersonnel(callback) {

    return onValue(
        personnelRef,
        (snapshot) => {

            const data = snapshot.val() || {};

            const personnel = Object.entries(data).map(([id, value]) => ({
                ...value,
                id
            }));

            callback(personnel);
        },
        (error) => {
            console.error("Erreur lecture personnel :", error);
        }
    );
}

// ======================================
// PERSONNEL : AJOUT / MODIFICATION
// ======================================

export async function savePersonnel(person, originalLogin = null) {

    const login = String(person?.login || "")
        .trim()
        .toUpperCase();

    const group = String(person?.group || "");

    if (!login) {
        throw new Error("Le grade et le nom sont obligatoires.");
    }

    if (!["1", "2", "3"].includes(group)) {
        throw new Error("Groupe invalide.");
    }

    const newKey = safeKey(login);

    if (!newKey) {
        throw new Error("Identifiant invalide.");
    }

    const data = {
        login,
        group,
        active: person.active !== false
    };

    const oldKey = originalLogin
        ? safeKey(originalLogin)
        : null;

    if (oldKey && oldKey !== newKey) {

        // Vérifie que le nouveau login n'existe pas déjà.
        const existingRef = ref(db, `personnel/${newKey}`);

        // Ecriture du nouveau profil.
        await set(existingRef, data);

        // Suppression de l'ancien profil.
        await remove(ref(db, `personnel/${oldKey}`));

    } else {

        await set(
            ref(db, `personnel/${newKey}`),
            data
        );
    }
}

// ======================================
// PERSONNEL : SUPPRESSION
// Ne supprime pas les anciennes réponses
// aux missions.
// ======================================

export async function deletePersonnel(login) {

    requireValue(login, "Identifiant du membre manquant.");

    const key = safeKey(login);

    await remove(
        ref(db, `personnel/${key}`)
    );
}

// ======================================
// FIN FIREBASE
// ======================================

console.log("BLEU4 2027 - Firebase initialisé");
