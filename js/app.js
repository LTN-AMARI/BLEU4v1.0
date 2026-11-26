
/* ==========================================
   BLEU4 2027 - APPLICATION PRINCIPALE
   Missions + Calendrier + Personnel
   Gestion automatique des archives
========================================== */

import {
    listenMissions,
    listenPersonnel,
    createMissionInDb,
    savePersonnel,
    deletePersonnel
} from "./firebase.js";

import {
    initCalendar,
    setCalendarMissions,
    getSelectedDate
} from "./calendar.js";

import {
    setPersonnelList,
    renderMissionList,
    renderAllMissions,
    renderArchivedMissions,
    isUserConcerned,
    getStatus,
    isCDS,
    isSOA,
    isCDG,
    isMember,
    canCreateMission
} from "./missions.js";

import {
    frToIso,
    autoFormatDateInput,
    isoToFr,
    getTodayIso
} from "./dateUtils.js";

import {
    playAlertSound,
    showMissionBanner,
    requestNotificationPermission,
    showSystemNotification
} from "./notify.js";


/* ==========================================
   1. SESSION
========================================== */

const user = JSON.parse(
    localStorage.getItem("BLEU4_USER") || "null"
);

if (!user) {
    window.location.replace("index.html");
    throw new Error("Session utilisateur absente.");
}

const memberMode = isMember(user);
const commandMode = !memberMode;
const canCreate = canCreateMission(user);

function getUserGroup() {
    if (isCDG(user)) {
        return String(user.profile.replace("CDG", ""));
    }

    return String(user.group || "");
}

function getProfileLabel() {
    if (memberMode) {
        return `MEMBRE — GROUPE ${getUserGroup()}`;
    }

    return user.profile || "COMMANDEMENT";
}


/* ==========================================
   2. OUTIL HTML
========================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================
   3. ENTETE
========================================== */

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

if (userInfo) {
    userInfo.innerHTML = `
        <strong>${escapeHTML(getProfileLabel())}</strong>
        <br>
        <span>${escapeHTML(user.displayName || user.login || "")}</span>
    `;
}

logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.replace("index.html");
});


/* ==========================================
   4. ECRAN DE CHARGEMENT
========================================== */

const splashStart = Date.now();
let splashHidden = false;

function hideSplashScreen() {
    if (splashHidden) return;

    splashHidden = true;

    const splash = document.getElementById("splashScreen");
    if (!splash) return;

    const remaining = Math.max(
        0,
        2000 - (Date.now() - splashStart)
    );

    setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => splash.remove(), 850);
    }, remaining);
}

setTimeout(hideSplashScreen, 8000);


/* ==========================================
   5. ELEMENTS HTML
========================================== */

const createBox = document.getElementById("createMissionBox");
const allMissionsBox = document.getElementById("allMissionsBox");
const archivedMissionsBox = document.getElementById("archivedMissionsBox");
const presenceCounterBox = document.getElementById("presenceCounterBox");

const createBtn = document.getElementById("createBtn");

const mTitle = document.getElementById("mTitle");
const mDesc = document.getElementById("mDesc");
const mStart = document.getElementById("mStart");
const mEnd = document.getElementById("mEnd");
const mLocation = document.getElementById("mLocation");
const mConcerned = document.getElementById("mConcerned");
const missionGroupSelect = document.getElementById("mGroup");


/* ==========================================
   6. AFFICHAGE SELON LE PROFIL
========================================== */

// Création réservée au CDS
if (createBox) {
    createBox.style.display = canCreate ? "block" : "none";
}

// Gestion des missions : commandement
if (allMissionsBox) {
    allMissionsBox.style.display =
        commandMode ? "block" : "none";
}

// Archives : CDS uniquement
if (archivedMissionsBox) {
    archivedMissionsBox.style.display =
        isCDS(user) ? "block" : "none";
}

// Ancien compteur global : masqué
if (presenceCounterBox) {
    presenceCounterBox.style.display = "none";
}

if (missionGroupSelect) {
    if (isCDG(user)) {
        missionGroupSelect.value = getUserGroup();
        missionGroupSelect.disabled = true;
    }

    if (isSOA(user) || memberMode) {
        missionGroupSelect.disabled = true;
    }
}


/* ==========================================
   7. VISIBILITE DES MISSIONS
========================================== */

function canSeeMissionForUser(mission) {

    if (isCDS(user) || isSOA(user)) {
        return true;
    }

    if (isCDG(user)) {
        if (!mission.group) return true;

        return (
            mission.group === "all" ||
            String(mission.group) === getUserGroup()
        );
    }

    if (memberMode) {
        if (!mission.group) {
            return isUserConcerned(mission, user);
        }

        return (
            mission.group === "all" ||
            String(mission.group) === getUserGroup()
        );
    }

    return false;
}


/* ==========================================
   8. SECTIONS REPLIABLES
========================================== */

document.querySelectorAll(".section-toggle").forEach(title => {
    title.addEventListener("click", () => {
        title.nextElementSibling?.classList.toggle("hidden");
    });
});


/* ==========================================
   9. ETAT GENERAL
========================================== */

let allMissions = [];
let activeMissions = [];
let archivedMissions = [];
let visibleMissions = [];
let personnelData = [];

let missionsLoaded = false;
let knownMissionIds = null;
let knownResponses = null;


/* ==========================================
   10. SEPARATION AUTOMATIQUE
========================================== */

// Une mission reste dans la gestion jusqu'à
// la date de fin incluse.
//
// Dès le lendemain de sa date de fin,
// elle apparaît dans les archives.
//
// Aucun déplacement ou effacement Firebase.

function separateMissionsByDate(missions) {

    const today = getTodayIso();

    activeMissions = [];
    archivedMissions = [];

    missions.forEach(mission => {

        const endDate = String(
            mission.end || mission.start || ""
        );

        // Une mission sans date exploitable reste
        // dans la gestion pour éviter de la masquer.
        if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            activeMissions.push(mission);
            return;
        }

        if (endDate < today) {
            archivedMissions.push(mission);
        } else {
            activeMissions.push(mission);
        }
    });

    activeMissions.sort((a, b) => {
        return String(a.start || "").localeCompare(
            String(b.start || "")
        );
    });

    archivedMissions.sort((a, b) => {
        return String(b.end || b.start || "").localeCompare(
            String(a.end || a.start || "")
        );
    });
}


/* ==========================================
   11. RAFRAICHISSEMENT
========================================== */

function refreshViews() {

    separateMissionsByDate(allMissions);

    // Calendrier : missions en cours et à venir
    visibleMissions = activeMissions.filter(
        mission => canSeeMissionForUser(mission)
    );

    setCalendarMissions(visibleMissions);

    const selectedDate = getSelectedDate();

    if (selectedDate) {
        renderMissionList(activeMissions, selectedDate, user);
    }

    // Gestion : uniquement missions non terminées
    if (commandMode) {
        renderAllMissions(activeMissions, user);
    }

    // Archives : uniquement CDS
    if (isCDS(user)) {
        renderArchivedMissions(archivedMissions, user);
    }
}


/* ==========================================
   12. CALENDRIER
========================================== */

initCalendar(date => {
    renderMissionList(activeMissions, date, user);
});

document.addEventListener("bleu4-date-selected", event => {
    const date = event.detail?.date;

    if (date) {
        renderMissionList(activeMissions, date, user);
    }
});


/* ==========================================
   13. GESTION DU PERSONNEL
========================================== */

const personnelBox = document.getElementById("personnelBox");
const personnelFormBox = document.getElementById("personnelFormBox");
const personnelActions = document.getElementById("personnelActions");
const personnelListContainer = document.getElementById("personnelList");

const personnelLoginInput = document.getElementById("personnelLogin");
const personnelGroupInput = document.getElementById("personnelGroup");
const personnelOriginalLogin = document.getElementById("personnelOriginalLogin");

const personnelFilter = document.getElementById("personnelFilter");

const addPersonnelBtn = document.getElementById("addPersonnelBtn");
const savePersonnelBtn = document.getElementById("savePersonnelBtn");
const cancelPersonnelBtn = document.getElementById("cancelPersonnelBtn");

const personnelFormTitle = document.getElementById("personnelFormTitle");

if (personnelBox) {
    personnelBox.style.display =
        commandMode ? "block" : "none";
}

if (isCDS(user)) {
    personnelActions?.classList.remove("hidden");
} else {
    personnelActions?.classList.add("hidden");
}

if (isCDG(user) && personnelFilter) {
    personnelFilter.value = getUserGroup();
    personnelFilter.disabled = true;
}

if (isSOA(user) && personnelFilter) {
    personnelFilter.disabled = false;
}


function openPersonnelForm(person = null) {

    if (!isCDS(user) || !personnelFormBox) return;

    personnelFormBox.classList.remove("hidden");

    if (person) {
        personnelFormTitle.textContent = "MODIFIER UN MEMBRE";
        personnelLoginInput.value = person.login || "";
        personnelGroupInput.value = String(person.group || "1");
        personnelOriginalLogin.value = person.login || "";
    } else {
        personnelFormTitle.textContent = "AJOUTER UN MEMBRE";
        personnelLoginInput.value = "";
        personnelGroupInput.value = "1";
        personnelOriginalLogin.value = "";
    }

    personnelLoginInput?.focus();
}


function closePersonnelForm() {
    personnelFormBox?.classList.add("hidden");

    if (personnelLoginInput) personnelLoginInput.value = "";
    if (personnelGroupInput) personnelGroupInput.value = "1";
    if (personnelOriginalLogin) personnelOriginalLogin.value = "";
}

addPersonnelBtn?.addEventListener("click", () => {
    openPersonnelForm();
});

cancelPersonnelBtn?.addEventListener("click", closePersonnelForm);


savePersonnelBtn?.addEventListener("click", async () => {

    if (!isCDS(user)) return;

    const login = personnelLoginInput?.value.trim().toUpperCase() || "";
    const group = String(personnelGroupInput?.value || "");
    const originalLogin = personnelOriginalLogin?.value || null;

    if (!login) {
        alert("Saisis le grade et le nom du membre.");
        return;
    }

    if (!["1", "2", "3"].includes(group)) {
        alert("Sélectionne un groupe valide.");
        return;
    }

    const duplicate = personnelData.some(person => (
        person.login?.toUpperCase() === login &&
        person.login !== originalLogin
    ));

    if (duplicate) {
        alert("Ce membre existe déjà dans le personnel.");
        return;
    }

    savePersonnelBtn.disabled = true;

    try {
        await savePersonnel({
            login,
            group,
            active: true
        }, originalLogin);

        closePersonnelForm();
        alert("Personnel enregistré.");

    } catch (error) {
        console.error("Erreur enregistrement personnel :", error);
        alert("Impossible d'enregistrer ce membre. Vérifie les règles Firebase.");

    } finally {
        savePersonnelBtn.disabled = false;
    }
});


function editPersonnel(login) {

    if (!isCDS(user)) return;

    const person = personnelData.find(item => item.login === login);

    if (person) openPersonnelForm(person);
}


async function removePersonnel(login) {

    if (!isCDS(user)) return;

    if (!confirm(`Supprimer définitivement ${login} du personnel ?`)) {
        return;
    }

    try {
        await deletePersonnel(login);
        alert("Membre supprimé.");

    } catch (error) {
        console.error("Erreur suppression personnel :", error);
        alert("Impossible de supprimer ce membre. Vérifie les règles Firebase.");
    }
}


function renderPersonnel() {

    if (!personnelListContainer || !commandMode) return;

    let filtered = personnelData.filter(person => person.active !== false);

    if (isCDG(user)) {
        filtered = filtered.filter(person => (
            String(person.group) === getUserGroup()
        ));
    } else {
        const selected = personnelFilter?.value || "all";

        if (selected !== "all") {
            filtered = filtered.filter(person => (
                String(person.group) === selected
            ));
        }
    }

    filtered.sort((a, b) => (
        String(a.login || "").localeCompare(String(b.login || ""), "fr")
    ));

    if (!filtered.length) {
        personnelListContainer.innerHTML = `
            <p class="empty-message">Aucun membre dans ce groupe.</p>
        `;
        return;
    }

    const groups = isCDG(user)
        ? [getUserGroup()]
        : ["1", "2", "3"];

    personnelListContainer.innerHTML = groups.map(group => {

        const members = filtered.filter(person => (
            String(person.group) === group
        ));

        if (!members.length) return "";

        return `
            <div class="personnel-group">
                <h3>GROUPE ${group}</h3>

                ${members.map(person => `
                    <div class="response-row personnel-row">
                        <strong>${escapeHTML(person.login)}</strong>

                        ${isCDS(user) ? `
                            <div class="actions">
                                <button
                                    type="button"
                                    class="btn-secondary"
                                    data-personnel-edit="${escapeHTML(person.login)}">
                                    MODIFIER
                                </button>

                                <button
                                    type="button"
                                    class="btn-delete"
                                    data-personnel-delete="${escapeHTML(person.login)}">
                                    SUPPRIMER
                                </button>
                            </div>
                        ` : ""}
                    </div>
                `).join("")}
            </div>
        `;
    }).join("");

    personnelListContainer
        .querySelectorAll("[data-personnel-edit]")
        .forEach(button => {
            button.addEventListener("click", () => {
                editPersonnel(button.dataset.personnelEdit);
            });
        });

    personnelListContainer
        .querySelectorAll("[data-personnel-delete]")
        .forEach(button => {
            button.addEventListener("click", () => {
                removePersonnel(button.dataset.personnelDelete);
            });
        });
}

personnelFilter?.addEventListener("change", renderPersonnel);


/* ==========================================
   14. ECOUTE FIREBASE PERSONNEL
========================================== */

listenPersonnel(personnel => {

    personnelData = Array.isArray(personnel) ? personnel : [];

    setPersonnelList(personnelData);
    renderPersonnel();

    if (missionsLoaded) {
        refreshViews();
    }
});


/* ==========================================
   15. NOTIFICATIONS EN ATTENTE
========================================== */

const pendingBanner = document.getElementById("pendingBanner");

pendingBanner?.addEventListener("click", () => {
    document.getElementById("calendar")
        ?.scrollIntoView({ behavior: "smooth" });
});

function updatePendingBanner(pendingMissions) {

    if (!pendingBanner) return;

    if (!pendingMissions.length) {
        pendingBanner.classList.add("hidden");
        return;
    }

    const count = pendingMissions.length;

    pendingBanner.textContent = count === 1
        ? "⚠ UNE MISSION RESTE À VALIDER"
        : `⚠ ${count} MISSIONS RESTENT À VALIDER`;

    pendingBanner.classList.remove("hidden");
}

let notificationRequested = false;

document.addEventListener("click", () => {
    if (notificationRequested) return;

    notificationRequested = true;
    requestNotificationPermission();
}, { once: true });


/* ==========================================
   16. MISSIONS EN ATTENTE
========================================== */

function getPendingMissions(missions) {

    if (!memberMode) return [];

    const today = getTodayIso();

    return missions.filter(mission => {

        if (mission.end && mission.end < today) return false;
        if (!canSeeMissionForUser(mission)) return false;
        if (!isUserConcerned(mission, user)) return false;

        const response = mission.responses?.[user.login];

        return !getStatus(response);
    });
}


/* ==========================================
   17. DETECTION NOUVELLES MISSIONS
========================================== */

function detectNewMissions(missions) {

    const currentIds = new Set(missions.map(mission => mission.id));

    if (knownMissionIds === null) {
        knownMissionIds = currentIds;
        return;
    }

    const newMissions = missions.filter(mission => (
        !knownMissionIds.has(mission.id) &&
        mission.createdBy !== user.login &&
        canSeeMissionForUser(mission)
    ));

    newMissions.forEach(mission => {

        if (memberMode && !isUserConcerned(mission, user)) return;

        const message = `Nouvelle mission le ${isoToFr(mission.start)}.`;

        playAlertSound();
        showMissionBanner(message);
        showSystemNotification("Nouvelle mission BLEU4", message);
    });

    knownMissionIds = currentIds;
}


/* ==========================================
   18. DETECTION NOUVELLES REPONSES
========================================== */

function detectNewResponses(missions) {

    const currentResponses = new Map();

    missions.forEach(mission => {
        currentResponses.set(mission.id, { ...(mission.responses || {}) });
    });

    if (knownResponses === null) {
        knownResponses = currentResponses;
        return;
    }

    if (commandMode) {

        missions.forEach(mission => {

            if (!canSeeMissionForUser(mission)) return;

            const previous = knownResponses.get(mission.id) || {};
            const current = currentResponses.get(mission.id) || {};

            Object.entries(current).forEach(([login, entry]) => {

                const status = getStatus(entry);
                const previousStatus = getStatus(previous[login]);

                if (!status || status === previousStatus) return;

                const label = status === "present" ? "présent" : "absent";
                const message = `${login} : ${label} pour "${mission.title}".`;

                showMissionBanner(message);
                showSystemNotification("Réponse à une mission", message);
            });
        });
    }

    knownResponses = currentResponses;
}


/* ==========================================
   19. ECOUTE FIREBASE MISSIONS
========================================== */

listenMissions(missions => {

    allMissions = Array.isArray(missions) ? missions : [];

    // Séparation automatique selon la date de fin
    separateMissionsByDate(allMissions);

    // Missions visibles dans le calendrier
    visibleMissions = activeMissions.filter(
        mission => canSeeMissionForUser(mission)
    );

    missionsLoaded = true;

    refreshViews();

    // Notifications uniquement pour les missions actives
    detectNewMissions(activeMissions);
    detectNewResponses(activeMissions);

    if (memberMode) {
        updatePendingBanner(getPendingMissions(activeMissions));
    }

    hideSplashScreen();

}, error => {

    console.error("Erreur Firebase missions :", error);
    hideSplashScreen();
});


/* ==========================================
   20. PATRACDR
========================================== */

const patracdrToggle = document.getElementById("patracdrToggle");
const patracdrFields = document.getElementById("patracdrFields");

patracdrToggle?.addEventListener("change", () => {
    patracdrFields?.classList.toggle("hidden", !patracdrToggle.checked);
});

function collectPatracdrFromForm() {

    if (!patracdrToggle?.checked) return null;

    const getValue = id =>
        document.getElementById(id)?.value.trim() || "";

    return {
        personnel: getValue("pPersonnel"),
        armement: getValue("pArmement"),
        tenue: getValue("pTenue"),
        radio: getValue("pRadio"),
        alimentation: getValue("pAlimentation"),
        camouflage: getValue("pCamouflage"),
        divers: getValue("pDivers"),
        rassemblement: getValue("pRassemblement")
    };
}

function resetPatracdrForm() {

    if (patracdrToggle) patracdrToggle.checked = false;

    patracdrFields?.classList.add("hidden");

    [
        "pPersonnel",
        "pArmement",
        "pTenue",
        "pRadio",
        "pAlimentation",
        "pCamouflage",
        "pDivers",
        "pRassemblement"
    ].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = "";
    });
}


/* ==========================================
   21. FORMATAGE DES DATES
========================================== */

autoFormatDateInput(mStart);
autoFormatDateInput(mEnd);


/* ==========================================
   22. CREATION D'UNE MISSION
========================================== */

createBtn?.addEventListener("click", async () => {

    if (!isCDS(user)) return;

    const title = mTitle?.value.trim() || "";
    const start = frToIso(mStart?.value || "");
    const end = frToIso(mEnd?.value || "");
    const group = String(missionGroupSelect?.value || "");

    if (!title) {
        alert("Le titre de la mission est obligatoire.");
        return;
    }

    if (!start || !end) {
        alert("Les dates sont invalides. Format attendu : JJ/MM/AAAA.");
        return;
    }

    if (end < start) {
        alert("La date de fin ne peut pas être avant la date de début.");
        return;
    }

    if (!["1", "2", "3", "all"].includes(group)) {
        alert("Sélectionne un groupe valide.");
        return;
    }

    const mission = {
        title,
        description: mDesc?.value.trim() || "",
        start,
        end,
        location: mLocation?.value.trim() || "",
        concerned: mConcerned?.value.trim() || "Tous",
        createdBy: user.displayName || user.login,
        group,
        patracdr: collectPatracdrFromForm()
    };

    createBtn.disabled = true;

    try {

        await createMissionInDb(mission);

        if (mTitle) mTitle.value = "";
        if (mDesc) mDesc.value = "";
        if (mStart) mStart.value = "";
        if (mEnd) mEnd.value = "";
        if (mLocation) mLocation.value = "";
        if (mConcerned) mConcerned.value = "";

        if (missionGroupSelect) missionGroupSelect.value = "1";

        resetPatracdrForm();

        alert("Mission créée avec succès.");

    } catch (error) {

        console.error("Erreur création mission :", error);
        alert("Impossible de créer la mission. Vérifie la connexion Firebase.");

    } finally {
        createBtn.disabled = false;
    }
});


/* ==========================================
   23. FIN
========================================== */

console.log("BLEU4 2027 initialisé.");
console.log("Profil :", getProfileLabel());
