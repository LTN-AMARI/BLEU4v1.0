// ======================================
// BLEU4 v2 - FIREBASE
// Point d'entrée UNIQUE vers Realtime Database.
// Tous les autres fichiers passent par ici
// pour lire/écrire des données.
// ======================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase,
    ref,
    onValue,
    push,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ======================================
// CONFIG BLEU4
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

// ======================================
// LECTURE (unique, temps réel)
// ======================================
// Tout le reste de l'app reçoit les missions
// via ce seul flux — pas de lecture dupliquée
// ailleurs dans le code.

export function listenMissions(callback) {

    return onValue(missionsRef, (snapshot) => {

        const data = snapshot.val() || {};

        const missions = Object.entries(data).map(([id, value]) => ({
            id,
            ...value
        }));

        callback(missions);

    }, (error) => {

        console.error("Erreur lecture Realtime Database :", error);

    });

}

// ======================================
// ECRITURE
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

    // le PATRACDR est optionnel : on ne l'ajoute que
    // si le commandement a coché la case et rempli des infos
    if (mission.patracdr) {
        data.patracdr = mission.patracdr;
    }

    return push(missionsRef, data);

}

export async function setResponse(missionId, login, status) {

    // clé Realtime DB : impossible d'utiliser certains
    // caractères (. # $ [ ]) — on les nettoie par sécurité
    const safeLogin = login.replace(/[.#$\[\]]/g, "_");

    const responsesRef = ref(db, `missions/${missionId}/responses`);

    await update(responsesRef, {
        [safeLogin]: status
    });

}

export async function deleteMissionInDb(missionId) {

    const missionRef = ref(db, `missions/${missionId}`);

    await remove(missionRef);

}

export async function updateMissionInDb(missionId, fields) {

    // ne touche que les champs fournis (titre, dates, lieu...),
    // les réponses des membres ne sont jamais écrasées ici
    const missionRef = ref(db, `missions/${missionId}`);

    await update(missionRef, fields);

}
