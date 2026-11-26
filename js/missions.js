
/* ==========================================
   BLEU4 2027 - MISSIONS
   Missions + présences + archives 2026
========================================== */

import {
    setResponse,
    deleteMissionInDb,
    updateMissionInDb
} from "./firebase.js";


/* ==========================================
   1. PERSONNEL
========================================== */

let personnelList = [];

export function setPersonnelList(personnel) {
    personnelList = Array.isArray(personnel) ? personnel : [];
}


/* ==========================================
   2. PROFILS
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
   3. DROITS
========================================== */

// Création et modification des missions : CDS uniquement
export function canCreateMission(user) {
    return isCDS(user);
}

// Modification / suppression des missions : CDS uniquement
export function canManageMission(mission, user) {
    return Boolean(mission && user && isCDS(user));
}

// Consultation des missions
function canSeeMission(mission, user) {

    if (!mission || !user) return false;

    if (isCDS(user) || isSOA(user)) return true;

    if (isCDG(user)) {
        if (!mission.group) return true;

        return (
            mission.group === "all" ||
            String(mission.group) === getUserGroup(user)
        );
    }

    if (isMember(user)) {

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

// Gestion des présences par le commandement
function canManagePresence(user, person) {

    if (!user || !person) return false;

    if (isCDS(user) || isSOA(user)) return true;

    if (isCDG(user)) {
        return String(person.group) === getUserGroup(user);
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
        ["Tous", "tous", "TOUS"].includes(concerned)
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
   5. REPONSES
========================================== */

export function getStatus(response) {

    if (!response) return "";

    if (typeof response === "string") {
        return response;
    }

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

function responseKey(login) {
    return String(login ?? "")
        .trim()
        .replace(/[.#$[\]/]/g, "_");
}

function getResponseFor(mission, login) {

    const responses = mission.responses || {};
    const key = responseKey(login);

    return responses[key] ?? responses[login] ?? null;
}


/* ==========================================
   6. DATES ET ARCHIVES
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

function isArchive2026(mission) {
    const startYear = String(mission.start || "").slice(0, 4);
    const endYear = String(mission.end || "").slice(0, 4);

    return startYear === "2026" || endYear === "2026";
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


/* ==========================================
   9. PERSONNEL CONCERNE PAR UNE MISSION
========================================== */

function getMissionPersonnel(mission, user) {

    let people = personnelList.filter(person => (
        person.active !== false
    ));

    // Une mission de groupe ne concerne que ce groupe
    if (mission.group && mission.group !== "all") {
        people = people.filter(person => (
            String(person.group) === String(mission.group)
        ));
    }

    // Un CDG ne gère que son groupe
    if (isCDG(user)) {
        people = people.filter(person => (
            String(person.group) === getUserGroup(user)
        ));
    }

    return people.sort((a, b) => (
        String(a.login || "").localeCompare(
            String(b.login || ""),
            "fr"
        )
    ));
}


/* ==========================================
   10. BOUTONS DE REPONSE
========================================== */

function renderStatusButtons(mission, login) {

    const status = getStatus(getResponseFor(mission, login));

    return `
        <div class="actions response-actions">

            <button
                type="button"
                class="btn-present ${status === "present" ? "active" : ""}"
                data-action="present"
                data-mission="${escapeHTML(mission.id)}"
                data-person="${escapeHTML(login)}">
                PRÉSENT
            </button>

            <button
                type="button"
                class="btn-absent ${status === "absent" ? "active" : ""}"
                data-action="absent"
                data-mission="${escapeHTML(mission.id)}"
                data-person="${escapeHTML(login)}">
                ABSENT
            </button>

        </div>
    `;
}


/* ==========================================
   11. REPONSE DU MEMBRE
========================================== */

function renderMemberResponse(mission, user) {

    if (!isMember(user)) return "";

    if (!isUserConcerned(mission, user)) return "";

    return `
        <div class="presence-editor">
            <h4>MA RÉPONSE</h4>
            <p>${escapeHTML(user.login)}</p>
            ${renderStatusButtons(mission, user.login)}
        </div>
    `;
}


/* ==========================================
   12. REPONSE PERSONNELLE DU COMMANDEMENT
========================================== */

function renderCommandSelfResponse(mission, user) {

    if (!isCDS(user) && !isSOA(user) && !isCDG(user)) {
        return "";
    }

    const displayName = String(
        user.displayName || user.login || ""
    ).trim();

    if (!displayName) return "";

    return `
        <div class="presence-editor command-self-response">
            <h4>MA PRÉSENCE</h4>
            <p>${escapeHTML(displayName)}</p>
            ${renderStatusButtons(mission, displayName)}
        </div>
    `;
}


/* ==========================================
   13. LISTE DES PRESENCES
========================================== */

function renderResponses(mission, user) {

    if (isMember(user)) return "";

    const people = getMissionPersonnel(mission, user);

    const rows = people.map(person => {

        const login = person.login;
        const status = getStatus(getResponseFor(mission, login));

        const label = status === "present"
            ? "PRÉSENT"
            : status === "absent"
                ? "ABSENT"
                : "NON RENSEIGNÉ";

        const editable = canManagePresence(user, person);

        return `
            <div class="response-row">

                <div class="response-person">
                    <strong>${escapeHTML(login)}</strong>
                    <small>${label}</small>
                </div>

                ${editable
                    ? renderStatusButtons(mission, login)
                    : `<strong>${label}</strong>`
                }

            </div>
        `;
    }).join("");

    const present = people.filter(person => (
        getStatus(getResponseFor(mission, person.login)) === "present"
    )).length;

    const absent = people.filter(person => (
        getStatus(getResponseFor(mission, person.login)) === "absent"
    )).length;

    return `
        <div class="mission-responses">

            <h4>GESTION DES PRÉSENCES</h4>

            <div class="presence-split">
                <span>PRÉSENTS : ${present}</span>
                <span>ABSENTS : ${absent}</span>
                <span>TOTAL : ${people.length}</span>
            </div>

            <div class="response-list">
                ${rows || "<p>Aucun personnel actif dans ce groupe.</p>"}
            </div>

        </div>
    `;
}


/* ==========================================
   14. PATRACDR
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
   15. CARTE MISSION REPLIABLE
========================================== */

function renderMissionCard(mission, user) {

    const canManage = canManageMission(mission, user);

    const description = mission.description
        ? `<p>${escapeHTML(mission.description)}</p>`
        : "";

    const location = mission.location
        ? `<p><strong>Lieu :</strong> ${escapeHTML(mission.location)}</p>`
        : "";

    const patracdr = mission.patracdr
        ? renderPatracdr(mission.patracdr)
        : "";

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

            <details class="mission-details">

                <summary class="mission-summary">

                    <div>
                        <h3>${escapeHTML(mission.title)}</h3>

                        <p class="mission-date">
                            ${getMissionDateLabel(mission)}
                        </p>
                    </div>

                    <span class="mission-group">
                        ${getGroupLabel(mission)}
                    </span>

                </summary>

                <div class="mission-body">

                    ${description}
                    ${location}
                    ${patracdr}

                    ${renderMemberResponse(mission, user)}
                    ${renderCommandSelfResponse(mission, user)}
                    ${renderResponses(mission, user)}

                    ${managementButtons}

                </div>

            </details>

        </article>
    `;
}


/* ==========================================
   16. EVENEMENTS DES MISSIONS
========================================== */

function attachMissionEvents(container, missions, user) {

    if (!container) return;

    container.querySelectorAll("[data-action]").forEach(button => {

        button.addEventListener("click", async event => {

            event.preventDefault();
            event.stopPropagation();

            const action = button.dataset.action;
            const missionId = button.dataset.mission;
            const personLogin = button.dataset.person;

            const mission = missions.find(item => (
                String(item.id) === String(missionId)
            ));

            if (!mission) return;

            try {

                // Présence ou absence
                if (action === "present" || action === "absent") {

                    if (isMember(user)) {

                        if (!isUserConcerned(mission, user)) return;

                        if (personLogin !== user.login) return;

                    } else {

                        if (personLogin === String(user.displayName || user.login)) {
                            // Le commandement peut répondre pour lui-même.
                        } else {

                            const person = personnelList.find(item => (
                                String(item.login) === String(personLogin)
                            ));

                            if (!person || !canManagePresence(user, person)) {
                                return;
                            }
                        }
                    }

                    button.disabled = true;

                    await setResponse(
                        mission.id,
                        personLogin,
                        action
                    );

                    return;
                }

                // Suppression
                if (action === "delete") {

                    if (!canManageMission(mission, user)) return;

                    if (!confirm(`Supprimer la mission "${mission.title}" ?`)) {
                        return;
                    }

                    await deleteMissionInDb(mission.id);
                    return;
                }

                // Modification
                if (action === "edit") {

                    if (!canManageMission(mission, user)) return;

                    await editMission(mission);
                }

            } catch (error) {

                console.error("Erreur action mission :", error);

                alert(
                    "Une erreur est survenue. Vérifie la connexion Firebase."
                );

            } finally {
                button.disabled = false;
            }
        });
    });
}


/* ==========================================
   17. MODIFICATION D'UNE MISSION
========================================== */

async function editMission(mission) {

    const title = prompt("Titre de la mission :", mission.title || "");

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

    const location = prompt("Lieu :", mission.location || "");

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
   18. MISSIONS DU JOUR - CALENDRIER
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

    container.innerHTML = visible.map(mission => (
        renderMissionCard(mission, user)
    )).join("");

    attachMissionEvents(container, visible, user);
}


/* ==========================================
   19. TOUTES LES MISSIONS
========================================== */

export function renderAllMissions(missions, user) {

    const container = getElement("allMissionsList");

    if (!container) return;

    const active = sortMissions(
        missions.filter(mission => !isMissionFinished(mission))
    ).filter(mission => canSeeMission(mission, user));

    if (!active.length) {
        container.innerHTML = `
            <p class="empty-message">
                Aucune mission en cours ou à venir.
            </p>
        `;
        return;
    }

    container.innerHTML = active.map(mission => (
        renderMissionCard(mission, user)
    )).join("");

    attachMissionEvents(container, active, user);
}


/* ==========================================
   20. ARCHIVES 2026 - CDS UNIQUEMENT
========================================== */

export function renderArchivedMissions(missions, user) {

    const container = getElement("archivedMissionsList");

    if (!container || !isCDS(user)) return;

    const archived = sortMissions(
        missions.filter(isArchive2026)
    );

    if (!archived.length) {
        container.innerHTML = `
            <p class="empty-message">
                Aucune mission de 2026 dans les archives.
            </p>
        `;
        return;
    }

    container.innerHTML = archived.map(mission => (
        renderMissionCard(mission, user)
    )).join("");

    attachMissionEvents(container, archived, user);
}
