
/* ==========================================
   BLEU4 2027 - APPLICATION PRINCIPALE
========================================== */

import {
    listenMissions,
    listenPersonnel,
    createMissionInDb
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
    renderPresenceCounter,
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
   1. SESSION UTILISATEUR
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
   2. ENTETE ET DECONNEXION
========================================== */

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

if (userInfo) {
    userInfo.textContent =
        `${user.login} — ${getProfileLabel()}`;
}

logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.replace("index.html");
});


/* ==========================================
   3. ECRAN DE CHARGEMENT
========================================== */

const splashStart = Date.now();
let splashHidden = false;

function hideSplashScreen() {
    if (splashHidden) return;

    splashHidden = true;

    const splash = document.getElementById("splashScreen");

    if (!splash) return;

    const elapsed = Date.now() - splashStart;
    const remaining = Math.max(0, 2000 - elapsed);

    setTimeout(() => {
        splash.classList.add("fade-out");

        setTimeout(() => splash.remove(), 850);
    }, remaining);
}

setTimeout(hideSplashScreen, 8000);


/* ==========================================
   4. ELEMENTS HTML
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
   5. DROITS D'AFFICHAGE
========================================== */

if (createBox) {
    createBox.style.display = canCreate ? "block" : "none";
}

if (allMissionsBox) {
    allMissionsBox.style.display =
        commandMode ? "block" : "none";
}

if (archivedMissionsBox) {
    archivedMissionsBox.style.display =
        commandMode ? "block" : "none";
}

if (presenceCounterBox) {
    presenceCounterBox.style.display =
        commandMode ? "block" : "none";
}


/* ==========================================
   6. GROUPE DE CREATION
========================================== */

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
   8. NOTIFICATIONS
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

    pendingBanner.textContent =
        count === 1
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
   9. SECTIONS REPLIABLES
========================================== */

document.querySelectorAll(".section-toggle").forEach(title => {
    title.addEventListener("click", () => {
        title.nextElementSibling?.classList.toggle("hidden");
    });
});


/* ==========================================
   10. ETAT DES DONNEES
========================================== */

let allMissions = [];
let visibleMissions = [];

let missionsLoaded = false;

let knownMissionIds = null;
let knownResponses = null;


/* ==========================================
   11. RAFRAICHISSEMENT
========================================== */

function refreshViews() {
    setCalendarMissions(visibleMissions);

    const selectedDate = getSelectedDate();

    if (selectedDate) {
        renderMissionList(allMissions, selectedDate, user);
    }

    if (commandMode) {
        renderAllMissions(allMissions, user);
        renderArchivedMissions(allMissions, user);
        renderPresenceCounter(allMissions, user);
    }
}


/* ==========================================
   12. CALENDRIER
========================================== */

initCalendar(date => {
    renderMissionList(allMissions, date, user);
});

document.addEventListener("bleu4-date-selected", event => {
    const date = event.detail?.date;

    if (date) {
        renderMissionList(allMissions, date, user);
    }
});


/* ==========================================
   13. CHARGEMENT DU PERSONNEL
========================================== */

listenPersonnel(personnel => {
    setPersonnelList(personnel || []);

    if (missionsLoaded) {
        refreshViews();
    }
});


/* ==========================================
   14. MISSIONS EN ATTENTE
========================================== */

function getPendingMissions(missions) {
    if (!memberMode) return [];

    const today = getTodayIso();

    return missions.filter(mission => {
        if (mission.end && mission.end < today) {
            return false;
        }

        if (!canSeeMissionForUser(mission)) {
            return false;
        }

        if (!isUserConcerned(mission, user)) {
            return false;
        }

        const response = mission.responses?.[user.login];

        return !getStatus(response);
    });
}


/* ==========================================
   15. NOUVELLES MISSIONS
========================================== */

function detectNewMissions(missions) {
    const currentIds = new Set(
        missions.map(mission => mission.id)
    );

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
        if (
            memberMode &&
            !isUserConcerned(mission, user)
        ) {
            return;
        }

        const message =
            `Nouvelle mission le ${isoToFr(mission.start)}.`;

        playAlertSound();
        showMissionBanner(message);

        showSystemNotification(
            "Nouvelle mission BLEU4",
            message
        );
    });

    knownMissionIds = currentIds;
}


/* ==========================================
   16. NOUVELLES REPONSES
========================================== */

function detectNewResponses(missions) {
    const currentResponses = new Map();

    missions.forEach(mission => {
        currentResponses.set(
            mission.id,
            { ...(mission.responses || {}) }
        );
    });

    if (knownResponses === null) {
        knownResponses = currentResponses;
        return;
    }

    if (commandMode) {
        missions.forEach(mission => {
            if (!canSeeMissionForUser(mission)) return;

            const previous =
                knownResponses.get(mission.id) || {};

            const current =
                currentResponses.get(mission.id) || {};

            Object.entries(current).forEach(([login, entry]) => {
                const status = getStatus(entry);
                const previousStatus = getStatus(previous[login]);

                if (!status || status === previousStatus) {
                    return;
                }

                const label =
                    status === "present" ? "présent" : "absent";

                const message =
                    `${login} : ${label} pour "${mission.title}".`;

                showMissionBanner(message);

                showSystemNotification(
                    "Réponse à une mission",
                    message
                );
            });
        });
    }

    knownResponses = currentResponses;
}


/* ==========================================
   17. ECOUTE FIREBASE DES MISSIONS
========================================== */

listenMissions(missions => {
    allMissions = Array.isArray(missions) ? missions : [];

    visibleMissions = allMissions.filter(
        mission => canSeeMissionForUser(mission)
    );

    missionsLoaded = true;

    refreshViews();

    detectNewMissions(allMissions);
    detectNewResponses(allMissions);

    if (memberMode) {
        updatePendingBanner(
            getPendingMissions(allMissions)
        );
    }

    hideSplashScreen();

}, error => {
    console.error("Erreur Firebase :", error);
    hideSplashScreen();
});


/* ==========================================
   18. PATRACDR
========================================== */

const patracdrToggle = document.getElementById("patracdrToggle");
const patracdrFields = document.getElementById("patracdrFields");

patracdrToggle?.addEventListener("change", () => {
    patracdrFields?.classList.toggle(
        "hidden",
        !patracdrToggle.checked
    );
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
    if (patracdrToggle) {
        patracdrToggle.checked = false;
    }

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
   19. FORMATAGE DES DATES
========================================== */

autoFormatDateInput(mStart);
autoFormatDateInput(mEnd);


/* ==========================================
   20. CREATION D'UNE MISSION
========================================== */

createBtn?.addEventListener("click", async () => {
    if (!canCreate) return;

    const title = mTitle?.value.trim() || "";
    const start = frToIso(mStart?.value || "");
    const end = frToIso(mEnd?.value || "");

    const group = isCDG(user)
        ? getUserGroup()
        : String(missionGroupSelect?.value || "");

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
        createdBy: user.login,
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

        if (isCDS(user) && missionGroupSelect) {
            missionGroupSelect.value = "1";
        }

        resetPatracdrForm();

        alert("Mission créée avec succès.");

    } catch (error) {
        console.error("Erreur création mission :", error);

        alert(
            "Impossible de créer la mission. Vérifie la connexion Firebase."
        );

    } finally {
        createBtn.disabled = false;
    }
});


/* ==========================================
   21. FIN INITIALISATION
========================================== */

console.log("BLEU4 2027 initialisé.");
console.log("Profil :", getProfileLabel());
