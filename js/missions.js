
/* ==========================================
   BLEU4 2027 - MISSIONS
   Gestion des missions et des présences
   Profils : CDS / SOA / CDG1 / CDG2 / CDG3
========================================== */

import {
    setResponse,
    deleteMissionInDb,
    updateMissionInDb,
    setResponseDays,
    removeResponse
} from "./firebase.js";


/* ==========================================
   1. DONNEES DU PERSONNEL
========================================== */

let personnelList = [];

export function setPersonnelList(personnel) {
    personnelList = Array.isArray(personnel) ? personnel : [];
}


/* ==========================================
   2. IDENTIFICATION DES PROFILS
========================================== */

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

export function getUserGroup(user) {
    if (isCDG(user)) {
        return user.profile.replace("CDG", "");
    }

    return String(user?.group || "");
}


/* ==========================================
   3. DROITS D'ACCES
========================================== */

export function canCreateMission(user) {
    return isCDS(user) || isCDG(user);
}

export function canManageMission(mission, user) {

    if (!mission || !user) return false;

    if (isCDS(user)) return true;

    if (isCDG(user)) {
        if (!mission.group) return false;

        return (
            mission.group !== "all" &&
            String(mission.group) === getUserGroup(user)
        );
    }

    return false;
}

function canSeeMission(mission, user) {

    if (!mission || !user) return false;

    // CDS et SOA : toutes les missions
    if (isCDS(user) || isSOA(user)) {
        return true;
    }

    // CDG : son groupe et les missions communes
    if (isCDG(user)) {
        if (!mission.group) return true;

        return (
            mission.group === "all" ||
            String(mission.group) === getUserGroup(user)
        );
    }

    // Membres
    if (isMember(user)) {

        // Anciennes missions sans groupe
        if (!mission.group) {
            return isUserConcerned(mission, user);
        }

        return (
            mission.group === "all" ||
            String(mission.group) === getUserGroup(user)
        );
    }

    return false;
}


/* ==========================================
   4. PERSONNES CONCERNEES
========================================== */

export function isUserConcerned(mission, user) {

    if (!mission || !user) return false;

    const concerned = mission.concerned;

    if (
        !concerned ||
        concerned === "Tous" ||
        concerned === "tous" ||
        concerned === "TOUS"
    ) {
        return true;
    }

    const login = String(user.login || "").trim().toLowerCase();

    const concernedText = Array.isArray(concerned)
        ? concerned.join(",")
        : String(concerned);

    const names = concernedText
        .split(/[,;\n]+/)
        .map(name => name.trim().toLowerCase())
        .filter(Boolean);

    return names.includes(login);
}


/* ==========================================
   5. REPONSES DE PRESENCE
========================================== */

export function getStatus(response) {

    if (!response) return "";

    // Ancien format Firebase
    if (typeof response === "string") {
        return response;
    }

    // Nouveau format Firebase
    return response.status || "";
}

export function getDays(response) {

    if (!response || typeof response !== "object") {
        return [];
    }

    return Array.isArray(response.days)
        ? response.days
        : [];
}


/* ==========================================
   6. ETAT DES MISSIONS
========================================== */

export function isMissionFinished(mission) {

    if (!mission?.end) return false;

    const today = new Date();
    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    return mission.end < localToday;
}


/* ==========================================
   7. OUTILS HTML
========================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(iso) {

    if (!iso) return "";

    const parts = String(iso).split("-");

    if (parts.length !== 3) return iso;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getGroupLabel(mission) {

    if (!mission.group) return "ANCIENNE MISSION";

    if (mission.group === "all") return "TOUS GROUPES";

    return `GROUPE ${mission.group}`;
}

function getMissionDateLabel(mission) {

    if (mission.start === mission.end) {
        return formatDate(mission.start);
    }

    return `${formatDate(mission.start)} au ${formatDate(mission.end)}`;
}

function getElement(id) {
    return document.getElementById(id);
}


/* ==========================================
   8. TRI DES MISSIONS
========================================== */

function sortMissions(missions) {

    return [...missions].sort((a, b) => {
        return String(a.start || "").localeCompare(
            String(b.start || "")
        );
    });
}

function getActiveMissions(missions) {
    return missions.filter(mission => !isMissionFinished(mission));
}

function getArchivedMissions(missions) {
    return missions.filter(mission => isMissionFinished(mission));
}


/* ==========================================
   9. AFFICHAGE DES REPONSES
========================================== */

function renderResponseButtons(mission, user) {

    if (!isMember(user)) return "";

    if (!isUserConcerned(mission, user)) return "";

    const response = mission.responses?.[user.login];
    const status = getStatus(response);

    return `
        <div class="actions response-actions">

            <button
                type="button"
                class="btn-present ${status === "present" ? "active" : ""}"
                data-action="present"
                data-mission="${escapeHTML(mission.id)}">
                PRÉSENT
            </button>

            <button
                type="button"
                class="btn-absent ${status === "absent" ? "active" : ""}"
                data-action="absent"
                data-mission="${escapeHTML(mission.id)}">
                ABSENT
            </button>

        </div>
    `;
}


/* ==========================================
   10. AFFICHAGE DES REPONSES COMMANDEMENT
========================================== */

function getPersonnelGroup(login) {

    const person = personnelList.find(personnel => {
        return String(personnel.login || "").toLowerCase() ===
            String(login || "").toLowerCase();
    });

    return person ? String(person.group || "") : "";
}

function renderResponses(mission, user) {

    if (isMember(user)) return "";

    const responses = mission.responses || {};

    const entries = Object.entries(responses).filter(([login]) => {

        // SOA et CDS voient toutes les réponses
        if (isCDS(user) || isSOA(user)) {
            return true;
        }

        // CDG : uniquement les membres de son groupe
        if (isCDG(user)) {
            return getPersonnelGroup(login) === getUserGroup(user);
        }

        return false;
    });

    const present = entries.filter(([, response]) => {
        return getStatus(response) === "present";
    });

    const absent = entries.filter(([, response]) => {
        return getStatus(response) === "absent";
    });

    const responseRows = entries.map(([login, response]) => {

        const status = getStatus(response);
        const label = status === "present" ? "PRÉSENT" :
            status === "absent" ? "ABSENT" : "NON RENSEIGNÉ";

        const days = getDays(response);

        return `
            <div class="response-row">
                <span>${escapeHTML(login)}</span>
                <strong>${label}</strong>
                ${
                    days.length
                        ? `<small>${days.map(escapeHTML).join(", ")}</small>`
                        : ""
                }
            </div>
        `;

    }).join("");

    return `
        <div class="mission-responses">

            <div class="presence-split">
                <span>PRÉSENTS : ${present.length}</span>
                <span>ABSENTS : ${absent.length}</span>
            </div>

            <div class="response-list">
                ${responseRows || "<p>Aucune réponse enregistrée.</p>"}
            </div>

        </div>
    `;
}


/* ==========================================
   11. CARTE MISSION
========================================== */

function renderMissionCard(mission, user, options = {}) {

    const canManage = canManageMission(mission, user);
    const responseButtons = renderResponseButtons(mission, user);

    const description = mission.description
        ? `<p>${escapeHTML(mission.description)}</p>`
        : "";

    const location = mission.location
        ? `<p><strong>Lieu :</strong> ${escapeHTML(mission.location)}</p>`
        : "";

    const patracdr = mission.patracdr
        ? renderPatracdr(mission.patracdr)
        : "";

    const responses = renderResponses(mission, user);

    const managementButtons = canManage
        ? `
            <div class="actions management-actions">
                <button
                    type="button"
                    class="btn-secondary"
                    data-action="edit"
                    data-mission="${escapeHTML(mission.id)}">
                    MODIFIER
                </button>

                <button
                    type="button"
                    class="btn-delete"
                    data-action="delete"
                    data-mission="${escapeHTML(mission.id)}">
                    SUPPRIMER
                </button>
            </div>
        `
        : "";

    return `
        <article class="mission" data-id="${escapeHTML(mission.id)}">

            <div class="mission-summary">

                <div>
                    <h3>${escapeHTML(mission.title)}</h3>
                    <p class="mission-date">
                        ${getMissionDateLabel(mission)}
                    </p>
                </div>

                <span class="mission-group">
                    ${getGroupLabel(mission)}
                </span>

            </div>

            <div class="mission-body">

                ${description}
                ${location}

                ${patracdr}

                ${responseButtons}
                ${managementButtons}
                ${responses}

            </div>

        </article>
    `;
}


/* ==========================================
   12. PATRACDR
========================================== */

function renderPatracdr(patracdr) {

    if (!patracdr || typeof patracdr !== "object") {
        return "";
    }

    const labels = {
        personnel: "Personnel",
        armement: "Armement",
        tenue: "Tenue",
        radio: "Radio",
        alimentation: "Alimentation",
        camouflage: "Camouflage",
        divers: "Divers",
        rassemblement: "Rassemblement"
    };

    const rows = Object.entries(labels)
        .filter(([key]) => patracdr[key])
        .map(([key, label]) => `
            <p>
                <strong>${label} :</strong>
                ${escapeHTML(patracdr[key])}
            </p>
        `)
        .join("");

    if (!rows) return "";

    return `
        <div class="patracdr-container">
            <h4>PATRACDR</h4>
            ${rows}
        </div>
    `;
}


/* ==========================================
   13. EVENEMENTS DES CARTES
========================================== */

function attachMissionEvents(container, missions, user) {

    if (!container) return;

    container.querySelectorAll("[data-action]").forEach(button => {

        button.addEventListener("click", async () => {

            const action = button.dataset.action;
            const missionId = button.dataset.mission;

            const mission = missions.find(item => {
                return String(item.id) === String(missionId);
            });

            if (!mission) return;

            try {

                if (action === "present" || action === "absent") {

                    if (!isMember(user)) return;

                    if (!isUserConcerned(mission, user)) return;

                    await setResponse(
                        mission.id,
                        user.login,
                        action
                    );

                    return;
                }

                if (action === "delete") {

                    if (!canManageMission(mission, user)) return;

                    const confirmed = confirm(
                        `Supprimer la mission "${mission.title}" ?`
                    );

                    if (!confirmed) return;

                    await deleteMissionInDb(mission.id);

                    return;
                }

                if (action === "edit") {

                    if (!canManageMission(mission, user)) return;

                    editMission(mission);

                }

            } catch (error) {

                console.error("Erreur action mission :", error);

                alert(
                    "Une erreur est survenue. Vérifie la connexion Firebase."
                );

            }

        });

    });

}


/* ==========================================
   14. MODIFICATION D'UNE MISSION
========================================== */

async function editMission(mission) {

    const title = prompt(
        "Titre de la mission :",
        mission.title || ""
    );

    if (title === null) return;

    if (!title.trim()) {
        alert("Le titre ne peut pas être vide.");
        return;
    }

    const description = prompt(
        "Description :",
        mission.description || ""
    );

    if (description === null) return;

    const location = prompt(
        "Lieu :",
        mission.location || ""
    );

    if (location === null) return;

    const concerned = prompt(
        "Personnel concerné (Tous ou identifiants séparés par des virgules) :",
        mission.concerned || "Tous"
    );

    if (concerned === null) return;

    await updateMissionInDb(mission.id, {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        concerned: concerned.trim() || "Tous"
    });
}


/* ==========================================
   15. MISSIONS DU JOUR - CALENDRIER
========================================== */

export function renderMissionList(missions, selectedDate, user) {

    const container = getElement("missions");

    if (!container) return;

    const visible = sortMissions(missions).filter(mission => {

        if (!canSeeMission(mission, user)) return false;

        if (!selectedDate) return true;

        return (
            mission.start <= selectedDate &&
            mission.end >= selectedDate
        );

    });

    if (!visible.length) {
        container.innerHTML = `
            <p class="empty-message">
                Aucune mission prévue pour cette date.
            </p>
        `;
        return;
    }

    container.innerHTML = visible.map(mission => {
        return renderMissionCard(mission, user);
    }).join("");

    attachMissionEvents(container, visible, user);
}


/* ==========================================
   16. TOUTES LES MISSIONS
========================================== */

export function renderAllMissions(missions, user) {

    const container = getElement("allMissionsList");

    if (!container) return;

    const active = sortMissions(
        getActiveMissions(missions)
    ).filter(mission => canSeeMission(mission, user));

    if (!active.length) {
        container.innerHTML = `
            <p class="empty-message">
                Aucune mission en cours ou à venir.
            </p>
        `;
        return;
    }

    container.innerHTML = active.map(mission => {
        return renderMissionCard(mission, user);
    }).join("");

    attachMissionEvents(container, active, user);
}


/* ==========================================
   17. MISSIONS ARCHIVEES
========================================== */

export function renderArchivedMissions(missions, user) {

    const container = getElement("archivedMissionsList");

    if (!container) return;

    const archived = sortMissions(
        getArchivedMissions(missions)
    ).filter(mission => canSeeMission(mission, user));

    if (!archived.length) {
        container.innerHTML = `
            <p class="empty-message">
                Aucune mission archivée.
            </p>
        `;
        return;
    }

    container.innerHTML = archived.map(mission => {
        return renderMissionCard(mission, user);
    }).join("");

    attachMissionEvents(container, archived, user);
}


/* ==========================================
   18. COMPTEUR DE PRESENCE
========================================== */

export function renderPresenceCounter(missions, user) {

    const container = getElement("presenceCounterList");

    if (!container) return;

    const visible = sortMissions(missions).filter(mission => {
        return canSeeMission(mission, user);
    });

    if (!visible.length) {
        container.innerHTML = `
            <p class="empty-message">
                Aucune donnée de présence.
            </p>
        `;
        return;
    }

    container.innerHTML = visible.map(mission => {

        const responses = Object.entries(
            mission.responses || {}
        ).filter(([login]) => {

            if (isCDS(user) || isSOA(user)) {
                return true;
            }

            if (isCDG(user)) {
                return getPersonnelGroup(login) === getUserGroup(user);
            }

            return false;
        });

        const present = responses.filter(([, response]) => {
            return getStatus(response) === "present";
        }).length;

        const absent = responses.filter(([, response]) => {
            return getStatus(response) === "absent";
        }).length;

        return `
            <div class="response-row">
                <strong>${escapeHTML(mission.title)}</strong>
                <span>Présents : ${present}</span>
                <span>Absents : ${absent}</span>
            </div>
        `;

    }).join("");
}
