
// ======================================
// BLEU4 2027 - MISSIONS
// Gestion des droits, affichage et réponses
// Conservation des anciennes missions
// ======================================

import {
    setResponse,
    setResponseDays,
    removeResponse,
    deleteMissionInDb,
    updateMissionInDb
} from "./firebase.js";

import { getTodayIso, isoToFr } from "./dateUtils.js";

// ======================================
// PERSONNEL
// ======================================

let personnelList = [];

export function setPersonnelList(personnel) {
    personnelList = Array.isArray(personnel) ? personnel : [];
}

function getPersonnelGroup(login) {
    const person = personnelList.find(
        p => normalize(p.login) === normalize(login)
    );

    return person ? String(person.group || "") : "";
}

// ======================================
// OUTILS
// ======================================

function normalize(value) {
    return String(value || "").trim().toUpperCase();
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function escapeAttr(value) {
    return escapeHtml(value);
}

export function getStatus(entry) {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") return entry.status || "";
    return "";
}

function getDays(entry, mission) {
    if (entry && typeof entry === "object" && Number(entry.days) > 0) {
        return Number(entry.days);
    }

    return missionDurationDays(mission);
}

function missionDurationDays(mission) {
    if (!mission.start || !mission.end) return 1;

    const start = new Date(`${mission.start}T12:00:00`);
    const end = new Date(`${mission.end}T12:00:00`);

    const duration = Math.round((end - start) / 86400000) + 1;

    return Math.max(1, duration);
}

export function isMissionFinished(mission) {
    return Boolean(mission.end && mission.end < getTodayIso());
}

// ======================================
// PROFILS ET DROITS
// ======================================

export function isCDS(user) {
    return user?.profile === "CDS";
}

export function isSOA(user) {
    return user?.profile === "SOA";
}

export function isCDG(user) {
    return ["CDG1", "CDG2", "CDG3"].includes(user?.profile);
}

export function isMember(user) {
    return user?.role === "membre";
}

function getUserGroup(user) {
    if (isCDG(user)) return String(user.profile.replace("CDG", ""));
    return String(user?.group || "");
}

export function canManageMission(mission, user) {
    if (!user || !mission) return false;

    if (isCDS(user)) return true;

    if (isCDG(user)) {
        return Boolean(
            mission.group &&
            mission.group !== "all" &&
            String(mission.group) === getUserGroup(user)
        );
    }

    return false;
}

export function canCreateMission(user) {
    return isCDS(user) || isCDG(user);
}

// ======================================
// PERSONNEL CONCERNE
// ======================================

export function isUserConcerned(mission, user) {
    if (!mission || !user) return false;

    const concerned = String(mission.concerned || "").trim();

    if (!concerned || normalize(concerned) === "TOUS") return true;

    const names = concerned.split(",").map(normalize);

    return names.includes(normalize(user.login));
}

// ======================================
// VISIBILITE DES MISSIONS
// ======================================

function canSeeMission(mission, user) {
    if (!mission || !user) return false;

    if (isCDS(user) || isSOA(user)) return true;

    if (isCDG(user)) {
        // Les anciennes missions sans groupe restent visibles
        // en consultation, mais ne sont pas administrables.
        if (!mission.group) return true;

        return (
            mission.group === "all" ||
            String(mission.group) === getUserGroup(user)
        );
    }

    if (isMember(user)) {
        // Anciennes missions sans groupe :
        // visibilité uniquement si le membre est concerné.
        if (!mission.group) return isUserConcerned(mission, user);

        const sameGroup =
            mission.group === "all" ||
            String(mission.group) === String(user.group);

        return sameGroup;
    }

    return false;
}

// ======================================
// REPONSES
// ======================================

async function submitResponse(mission, user, status) {
    if (!isUserConcerned(mission, user)) {
        alert("Tu ne fais pas partie du personnel concerné.");
        return;
    }

    try {
        await setResponse(mission.id, user.login, status);
    } catch (error) {
        console.error(error);
        alert("Impossible d'enregistrer ta réponse.");
    }
}

// ======================================
// AFFICHAGE : MISSIONS DU JOUR
// ======================================

export function renderMissionList(missions, selectedDate, user) {
    const container = document.getElementById("missions");
    const title = document.getElementById("selectedDateTitle");

    if (!container) return;

    if (title) {
        title.textContent = selectedDate ? isoToFr(selectedDate) : "";
    }

    const visible = (missions || []).filter(mission => {
        if (!canSeeMission(mission, user)) return false;

        return (
            mission.start &&
            mission.end &&
            selectedDate >= mission.start &&
            selectedDate <= mission.end
        );
    });

    container.innerHTML = "";

    if (visible.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune mission prévue ce jour.</p>';
        return;
    }

    visible.sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    visible.forEach(mission => {
        container.appendChild(createMissionCard(mission, user));
    });
}

// ======================================
// AFFICHAGE : MISSIONS EN COURS
// ======================================

export function renderAllMissions(missions, user) {
    const container = document.getElementById("allMissionsList");
    if (!container) return;

    const visible = (missions || []).filter(mission =>
        canSeeMission(mission, user) &&
        !mission.archived &&
        !isMissionFinished(mission)
    );

    container.innerHTML = "";

    if (!visible.length) {
        container.innerHTML = '<p class="empty-message">Aucune mission en cours.</p>';
        return;
    }

    visible.sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    visible.forEach(mission => {
        container.appendChild(createMissionCard(mission, user));
    });
}

// ======================================
// AFFICHAGE : MISSIONS ARCHIVEES
// ======================================

export function renderArchivedMissions(missions, user) {
    const container = document.getElementById("archivedMissionsList");
    if (!container) return;

    const visible = (missions || []).filter(mission =>
        canSeeMission(mission, user) &&
        (mission.archived || isMissionFinished(mission))
    );

    container.innerHTML = "";

    if (!visible.length) {
        container.innerHTML = '<p class="empty-message">Aucune mission archivée.</p>';
        return;
    }

    visible.sort((a, b) => (b.start || "").localeCompare(a.start || ""));

    visible.forEach(mission => {
        container.appendChild(createMissionCard(mission, user));
    });
}

// ======================================
// CREATION D'UNE CARTE MISSION
// ======================================

function createMissionCard(mission, user) {
    const card = document.createElement("article");
    card.className = "mission-card";

    const manageable = canManageMission(mission, user);
    const concerned = isUserConcerned(mission, user);
    const status = getStatus((mission.responses || {})[user.login]);

    const groupLabel = mission.group === "all"
        ? "Tous les groupes"
        : mission.group
            ? `Groupe ${mission.group}`
            : "Ancienne mission";

    const responses = mission.responses || {};

    const presentCount = Object.values(responses)
        .filter(entry => getStatus(entry) === "present").length;

    const absentCount = Object.values(responses)
        .filter(entry => getStatus(entry) === "absent").length;

    card.innerHTML = `
        <div class="mission-card-header">
            <h3>${escapeHtml(mission.title || "Mission sans titre")}</h3>
            <span class="mission-group">${escapeHtml(groupLabel)}</span>
        </div>

        ${mission.description ? `
            <p>${escapeHtml(mission.description)}</p>
        ` : ""}

        <div class="mission-details">
            ${mission.location ? `<p><strong>Lieu :</strong> ${escapeHtml(mission.location)}</p>` : ""}
            <p><strong>Début :</strong> ${isoToFr(mission.start)}</p>
            <p><strong>Fin :</strong> ${isoToFr(mission.end)}</p>
            <p><strong>Personnel concerné :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>
        </div>

        <div class="mission-response-summary">
            <span>Présents : ${presentCount}</span>
            <span>Absents : ${absentCount}</span>
        </div>

        ${isMember(user) ? `
            <div class="mission-response-actions">
                <button class="btn-present" data-status="present"
                    ${!concerned ? "disabled" : ""}>
                    PRÉSENT
                </button>
                <button class="btn-absent" data-status="absent"
                    ${!concerned ? "disabled" : ""}>
                    ABSENT
                </button>
                <p class="response-status">
                    ${
                        status === "present" ? "Ta réponse : présent" :
                        status === "absent" ? "Ta réponse : absent" :
                        "En attente de réponse"
                    }
                </p>
            </div>
        ` : ""}

        ${manageable ? `
            <div class="mission-admin-actions">
                <button class="btn-edit" data-action="edit">MODIFIER</button>
                <button class="btn-archive" data-action="archive">
                    ${mission.archived ? "DÉSARCHIVER" : "ARCHIVER"}
                </button>
                <button class="btn-delete" data-action="delete">SUPPRIMER</button>
            </div>
            <div class="mission-responses">
                <button class="btn-secondary" data-action="responses">
                    VOIR LES RÉPONSES
                </button>
                <div class="mission-responses-content hidden"></div>
            </div>
        ` : ""}
    `;

    // Réponse membre
    card.querySelectorAll("[data-status]").forEach(button => {
        button.addEventListener("click", () => {
            submitResponse(mission, user, button.dataset.status);
        });
    });

    // Actions commandement autorisées
    if (manageable) {
        card.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
            editMission(mission);
        });

        card.querySelector('[data-action="archive"]')?.addEventListener("click", () => {
            toggleArchive(mission);
        });

        card.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
            deleteMission(mission);
        });

        card.querySelector('[data-action="responses"]')?.addEventListener("click", () => {
            const content = card.querySelector(".mission-responses-content");
            content.classList.toggle("hidden");

            if (!content.dataset.loaded) {
                renderResponses(content, mission, user);
                content.dataset.loaded = "true";
            }
        });
    }

    return card;
}

// ======================================
// MODIFICATION MISSION
// ======================================

async function editMission(mission) {
    const title = prompt("Titre de la mission :", mission.title || "");
    if (title === null) return;

    if (!title.trim()) {
        alert("Le titre ne peut pas être vide.");
        return;
    }

    const description = prompt("Description :", mission.description || "");
    if (description === null) return;

    const location = prompt("Lieu :", mission.location || "");
    if (location === null) return;

    const concerned = prompt(
        "Personnel concerné (Tous ou noms séparés par des virgules) :",
        mission.concerned || "Tous"
    );
    if (concerned === null) return;

    try {
        await updateMissionInDb(mission.id, {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            concerned: concerned.trim() || "Tous"
        });
    } catch (error) {
        console.error(error);
        alert("La modification de la mission a échoué.");
    }
}

// ======================================
// ARCHIVAGE / DESARCHIVAGE
// ======================================

async function toggleArchive(mission) {
    const archived = !mission.archived;

    if (!confirm(
        archived
            ? "Archiver cette mission ?"
            : "Réactiver cette mission ?"
    )) return;

    try {
        await updateMissionInDb(mission.id, { archived });
    } catch (error) {
        console.error(error);
        alert("Impossible de modifier l'archivage.");
    }
}

// ======================================
// SUPPRESSION MISSION
// ======================================

async function deleteMission(mission) {
    if (!confirm(
        `Supprimer définitivement la mission "${mission.title}" et ses réponses ?`
    )) return;

    try {
        await deleteMissionInDb(mission.id);
    } catch (error) {
        console.error(error);
        alert("La suppression de la mission a échoué.");
    }
}

// ======================================
// AFFICHAGE DES REPONSES
// ======================================

function renderResponses(container, mission, user) {
    const entries = Object.entries(mission.responses || {});

    if (!entries.length) {
        container.innerHTML = "<p>Aucune réponse enregistrée.</p>";
        return;
    }

    const filtered = entries.filter(([login]) => {
        if (!isCDG(user)) return true;

        const group = getPersonnelGroup(login);

        // Pour une mission du groupe du CDG, les réponses
        // de l'ensemble de cette mission sont affichées.
        return group === getUserGroup(user);
    });

    if (!filtered.length) {
        container.innerHTML = "<p>Aucune réponse connue pour ce groupe.</p>";
        return;
    }

    container.innerHTML = "";

    filtered.forEach(([login, entry]) => {
        const status = getStatus(entry);
        const days = getDays(entry, mission);

        const row = document.createElement("div");
        row.className = "response-row";

        row.innerHTML = `
            <strong>${escapeHtml(login)}</strong>
            <span>${status === "present" ? "Présent" : status === "absent" ? "Absent" : "Sans statut"}</span>
            ${status === "present" ? `<span>${days} jour(s)</span>` : ""}
            ${canManageMission(mission, user) ? `
                <button class="btn-delete" data-remove>RETIRER</button>
            ` : ""}
        `;

        row.querySelector("[data-remove]")?.addEventListener("click", async () => {
            if (!confirm(`Retirer la réponse de ${login} ?`)) return;

            try {
                await removeResponse(mission.id, login);
            } catch (error) {
                console.error(error);
                alert("Impossible de retirer cette réponse.");
            }
        });

        container.appendChild(row);
    });
}

// ======================================
// COMPTEUR DE PRESENCE
// ======================================

export function renderPresenceCounter(missions, user = null) {
    const container = document.getElementById("presenceCounterList");
    if (!container) return;

    let visible = (missions || []).filter(mission =>
        canSeeMission(mission, user)
    );

    if (isCDG(user)) {
        visible = visible.filter(mission =>
            mission.group &&
            String(mission.group) === getUserGroup(user)
        );
    }

    const totals = {
        present: 0,
        absent: 0,
        unanswered: 0
    };

    visible.forEach(mission => {
        const responses = mission.responses || {};

        if (isCDG(user)) {
            Object.entries(responses).forEach(([login, entry]) => {
                if (getPersonnelGroup(login) !== getUserGroup(user)) return;

                const status = getStatus(entry);

                if (status === "present") totals.present++;
                else if (status === "absent") totals.absent++;
            });
        } else {
            Object.values(responses).forEach(entry => {
                const status = getStatus(entry);

                if (status === "present") totals.present++;
                else if (status === "absent") totals.absent++;
            });
        }
    });

    container.innerHTML = `
        <div class="presence-summary">
            <div class="presence-item">
                <strong>${totals.present}</strong>
                <span>Présences</span>
            </div>
            <div class="presence-item">
                <strong>${totals.absent}</strong>
                <span>Absences</span>
            </div>
        </div>
    `;
}

console.log("BLEU4 2027 - Module missions chargé");
