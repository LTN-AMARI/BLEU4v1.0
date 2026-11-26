
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
    set,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ======================================
// CONFIGURATION FIREBASE
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
export const db = getDatabase(app);

// ======================================
// OUTILS
// ======================================

const VALID_GROUPS = ["1", "2", "3", "all"];

export function safeKey(value) {
    return String(value ?? "")
        .trim()
        .replace(/[.#$[\]/]/g, "_");
}

function requireValue(value, message) {
    if (value === undefined || value === null || value === "") {
        throw new Error(message);
    }
}

function cleanObject(object) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined)
    );
}

// ======================================
// MISSIONS - ECOUTE EN TEMPS REEL
// ======================================

export function listenMissions(callback) {
    const missionsRef = ref(db, "missions");

    return onValue(missionsRef, (snapshot) => {
        const data = snapshot.val() || {};

        const missions = Object.entries(data).map(([id, value]) => ({
            ...value,
            id
        }));

        callback(missions);
    }, (error) => {
        console.error("Erreur lecture missions :", error);
    });
}

// ======================================
// MISSIONS - CREATION
// ======================================

export async function createMissionInDb(mission) {
    requireValue(mission?.title?.trim(), "Le titre est obligatoire.");
    requireValue(mission?.start, "La date de début est obligatoire.");
    requireValue(mission?.end, "La date de fin est obligatoire.");

    if (mission.end < mission.start) {
        throw new Error("La date de fin est antérieure à la date de début.");
    }

    if (
        mission.group !== undefined &&
        !VALID_GROUPS.includes(String(mission.group))
    ) {
        throw new Error("Groupe de mission invalide.");
    }

    const data = cleanObject({
        title: mission.title.trim(),
        description: mission.description || "",
        start: mission.start,
        end: mission.end,
        location: mission.location || "",
        concerned: mission.concerned || "Tous",
        createdBy: mission.createdBy || "",
        group: mission.group,
        patracdr: mission.patracdr || null,
        responses: {}
    });

    const newMissionRef = push(ref(db, "missions"));
    await set(newMissionRef, data);

    return newMissionRef.key;
}

// ======================================
// MISSIONS - MODIFICATION
// ======================================

export async function updateMissionInDb(missionId, updates) {
    requireValue(missionId, "Identifiant de mission manquant.");

    const data = cleanObject({ ...updates });

    delete data.id;
    delete data.responses;

    if (data.group !== undefined &&
        !VALID_GROUPS.includes(String(data.group))) {
        throw new Error("Groupe de mission invalide.");
    }

    await update(ref(db, `missions/${missionId}`), data);
}

// ======================================
// MISSIONS - SUPPRESSION
// ======================================

export async function deleteMissionInDb(missionId) {
    requireValue(missionId, "Identifiant de mission manquant.");

    await remove(ref(db, `missions/${missionId}`));
}

// ======================================
// REPONSES - PRESENT / ABSENT
// Compatible avec les anciennes réponses texte
// et les nouvelles réponses sous forme d'objet.
// ======================================

export async function setResponse(missionId, login, status) {
    requireValue(missionId, "Mission manquante.");
    requireValue(login, "Identifiant personnel manquant.");

    if (!["present", "absent"].includes(status)) {
        throw new Error("Statut de réponse invalide.");
    }

    const key = safeKey(login);
    const responseRef = ref(db, `missions/${missionId}/responses/${key}`);

    const result = await runTransaction(responseRef, (current) => {
        if (typeof current === "string") {
            return { status };
        }

        if (current && typeof current === "object") {
            return { ...current, status };
        }

        return { status };
    });

    if (!result.committed) {
        throw new Error("La réponse n'a pas pu être enregistrée.");
    }
}

// ======================================
// REPONSES - NOMBRE DE JOURS
// Préserve le statut existant.
// ======================================

export async function setResponseDays(missionId, login, days) {
    requireValue(missionId, "Mission manquante.");
    requireValue(login, "Identifiant personnel manquant.");

    const value = Number(days);

    if (!Number.isFinite(value) || value < 1) {
        throw new Error("Nombre de jours invalide.");
    }

    const key = safeKey(login);
    const responseRef = ref(db, `missions/${missionId}/responses/${key}`);

    const result = await runTransaction(responseRef, (current) => {
        if (typeof current === "string") {
            return {
                status: current,
                days: value
            };
        }

        if (current && typeof current === "object") {
            return {
                ...current,
                days: value
            };
        }

        return { days: value };
    });

    if (!result.committed) {
        throw new Error("Le nombre de jours n'a pas pu être enregistré.");
    }
}

// ======================================
// REPONSES - SUPPRESSION
// ======================================

export async function removeResponse(missionId, login) {
    requireValue(missionId, "Mission manquante.");
    requireValue(login, "Identifiant personnel manquant.");

    const key = safeKey(login);

    await remove(
        ref(db, `missions/${missionId}/responses/${key}`)
    );
}

// ======================================
// PERSONNEL - ECOUTE EN TEMPS REEL
// ======================================

export function listenPersonnel(callback) {
    const personnelRef = ref(db, "personnel");

    return onValue(personnelRef, (snapshot) => {
        const data = snapshot.val() || {};

        const personnel = Object.entries(data).map(([id, value]) => ({
            ...value,
            id
        }));

        callback(personnel);
    }, (error) => {
        console.error("Erreur lecture personnel :", error);
    });
}

// ======================================
// PERSONNEL - AJOUT / MODIFICATION
// Le renommage ne doit jamais écraser
// une fiche déjà existante.
// ======================================

export async function savePersonnel(person, originalLogin = null) {
    requireValue(person?.login?.trim(), "Identifiant personnel obligatoire.");

    const login = person.login.trim();
    const newKey = safeKey(login);
    const oldKey = originalLogin ? safeKey(originalLogin) : null;
    const group = String(person.group || "");

    if (!["1", "2", "3"].includes(group)) {
        throw new Error("Groupe personnel invalide.");
    }

    const data = cleanObject({
        ...person,
        login,
        group,
        active: person.active !== false
    });

    // Modification sans changement d'identifiant
    if (oldKey && oldKey === newKey) {
        await set(ref(db, `personnel/${newKey}`), data);
        return;
    }

    // Ajout ou renommage : réservation de la nouvelle clé
    const newRef = ref(db, `personnel/${newKey}`);

    const result = await runTransaction(newRef, (current) => {
        if (current !== null) {
            return;
        }

        return data;
    });

    if (!result.committed) {
        throw new Error(
            "Cet identifiant existe déjà. Aucun personnel n'a été écrasé."
        );
    }

    // Suppression de l'ancienne fiche uniquement après
    // confirmation de l'enregistrement de la nouvelle.
    if (oldKey) {
        await remove(ref(db, `personnel/${oldKey}`));
    }
}

// ======================================
// PERSONNEL - SUPPRESSION
// ======================================

export async function deletePersonnel(login) {
    requireValue(login, "Identifiant personnel manquant.");

    const key = safeKey(login);

    await remove(ref(db, `personnel/${key}`));
}

console.log("BLEU4 2027 - Firebase connecté");
