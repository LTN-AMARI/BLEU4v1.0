
// ======================================
// BLEU4 2027 - APP
// Orchestrateur principal
// ======================================

import {
    listenMissions,
    listenPersonnel,
    createMissionInDb
} from "./firebase.js";

import { initCalendar, setCalendarMissions, getSelectedDate } from "./calendar.js";

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

// ======================================
// SESSION
// ======================================

const user = JSON.parse(localStorage.getItem("BLEU4_USER") || "null");

if (!user) {
    window.location.replace("index.html");
    throw new Error("Session BLEU4 absente.");
}

const profileLabel = user.profile || "MEMBRE";

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

if (userInfo) {
    userInfo.textContent = `${user.login} — ${profileLabel}`;
}

logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("BLEU4_USER");
    window.location.replace("index.html");
});

// ======================================
// SPLASH SCREEN
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

    const remaining = Math.max(
        0,
        SPLASH_MIN_DURATION - (Date.now() - splashStart)
    );

    setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => splash.remove(), 850);
    }, remaining);
}

setTimeout(hideSplashScreen, SPLASH_MAX_DURATION);

// ======================================
// ELEMENTS PRINCIPAUX
// ======================================

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

// ======================================
// VISIBILITE SELON LE PROFIL
// ======================================

if (createBox) {
    createBox.style.display = canCreateMission(user) ? "block" : "none";
}

if (allMissionsBox) {
    allMissionsBox.style.display =
        !isMember(user) ? "block" : "none";
}

if (archivedMissionsBox) {
    archivedMissionsBox.style.display =
        !isMember(user) ? "block" : "none";
}

if (presenceCounterBox) {
    presenceCounterBox.style.display =
        !isMember(user) ? "block" : "none";
}

// ======================================
// GROUPE DE CREATION
// Ajout dynamique du sélecteur pour le CDS
// ======================================

let missionGroupSelect = document.getElementById("mGroup");

if (canCreateMission(user) && !missionGroupSelect) {
    const groupContainer = document.createElement("div");
    groupContainer.className = "form-group";
    groupContainer.id = "missionGroupContainer";

    groupContainer.innerHTML = `
        <label for="mGroup">Groupe concerné</label>
        <select id="mGroup">
            <option value="1">Groupe 1</option>
            <option value="2">Groupe 2</option>
            <option value="3">Groupe 3</option>
            <option value="all">Tous les groupes</option>
        </select>
    `;

    const concernedGroup = mConcerned?.closest(".form-group");

    if (concernedGroup) {
        concernedGroup.after(groupContainer);
    }

    missionGroupSelect = document.getElementById("mGroup");
}

if (isCDG(user) && missionGroupSelect) {
    missionGroupSelect.value = String(user.profile.replace("CDG", ""));
    missionGroupSelect.disabled = true;
}

// ======================================
// NOTIFICATIONS
// ======================================

const pendingBanner = document.getElementById("pendingBanner");

pendingBanner?.addEventListener("click", () => {
    document.querySelector(".calendar-header")?.scrollIntoView({
        behavior: "smooth"
    });
});

function updatePendingBanner(pendingMissions) {
    if (!pendingBanner) return;

    if (!pendingMissions.length) {
        pendingBanner.classList.add("hidden");
        return;
    }

    const dates = pendingMissions
        .map(mission => isoToFr(mission.start))
        .join(", ");

    pendingBanner.textContent =
        pendingMissions.length === 1
            ? `⚠ Il vous reste 1 mission à valider (${dates}).`
            : `⚠ Il vous reste ${pendingMissions.length} missions à valider (${dates}).`;

    pendingBanner.classList.remove("hidden");
}

// Demande de notification après une action utilisateur.
let notificationRequested = false;

document.addEventListener("click", () => {
    if (notificationRequested) return;
    notificationRequested = true;

    requestNotificationPermission();
}, { once: true });

// ======================================
// SECTIONS REPLIABLES
// ======================================

document.querySelectorAll(".section-toggle").forEach(title => {
    title.addEventListener("click", () => {
        title.nextElementSibling?.classList.toggle("hidden");
    });
});

// ======================================
// CALENDRIER
// ======================================

let allMissions = [];
let personnelLoaded = false;
let missionsLoaded = false;

let knownMissionIds = null;
let knownResponses = null;

let visibleMissions = [];

function refreshViews() {
    if (!missionsLoaded || !personnelLoaded) return;

    setCalendarMissions(visibleMissions);

    renderAllMissions(allMissions, user);
    renderArchivedMissions(allMissions, user);
    renderPresenceCounter(allMissions, user);

    const selectedDate = getSelectedDate();

    if (selectedDate) {
        renderMissionList(allMissions, selectedDate, user);
    }
}

initCalendar(date => {
    renderMissionList(allMissions, date, user);
});

// ======================================
// PERSONNEL
// ======================================

listenPersonnel(personnel => {
    setPersonnelList(personnel);
    personnelLoaded = true;
    refreshViews();
});

// ======================================
// MISSIONS
// ======================================

listenMissions(missions => {
    allMissions = Array.isArray(missions) ? missions : [];
    visibleMissions = allMissions.filter(mission => {
        if (isMember(user)) {
            if (!mission.group) return isUserConcerned(mission, user);

            return (
                mission.group === "all" ||
                String(mission.group) === String(user.group)
            );
        }

        if (isCDG(user)) {
            if (!mission.group) return true;

            return (
                mission.group === "all" ||
                String(mission.group) === String(user.profile.replace("CDG", ""))
            );
        }

        return true;
    });

    missionsLoaded = true;

    refreshViews();

    // Première lecture : aucune notification historique
    const currentIds = new Set(allMissions.map(m => m.id));

    if (knownMissionIds === null) {
        knownMissionIds = currentIds;
    } else {
        const newMissions = allMissions.filter(
            mission => !knownMissionIds.has(mission.id)
        );

        newMissions
            .filter(mission => mission.createdBy !== user.login)
            .filter(mission => visibleMissions.some(m => m.id === mission.id))
            .forEach(mission => {
                const message =
                    `Nouvelle mission du ${isoToFr(mission.start)}.`;

                playAlertSound();
                showMissionBanner(message);
                showSystemNotification("Nouvelle mission BLEU4", message);
            });

        knownMissionIds = currentIds;
    }

    // Détection des nouvelles réponses
    const currentResponses = new Map();

    allMissions.forEach(mission => {
        currentResponses.set(mission.id, {
            ...(mission.responses || {})
        });
    });

    if (knownResponses === null) {
        knownResponses = currentResponses;
    } else {
        if (!isMember(user)) {
            allMissions.forEach(mission => {
                const previous = knownResponses.get(mission.id) || {};
                const current = currentResponses.get(mission.id) || {};

                Object.entries(current).forEach(([login, entry]) => {
                    const status = getStatus(entry);
                    const previousStatus = getStatus(previous[login]);

                    if (!status || status === previousStatus) return;

                    if (isCDG(user)) {
                        const group = String(user.profile.replace("CDG", ""));

                        // Une réponse ne doit notifier que le CDG
                        // du groupe correspondant à sa mission.
                        if (
                            !mission.group ||
                            String(mission.group) !== group
                        ) return;
                    }

                    const label = status === "present" ? "présent" : "absent";
                    const message =
                        `${login} s'est déclaré ${label} pour "${mission.title}" (${isoToFr(mission.start)}).`;

                    showMissionBanner(message);
                    showSystemNotification("Réponse à une mission", message);
                });
            });
        }

        knownResponses = currentResponses;
    }

    // Missions en attente pour le membre
    if (isMember(user)) {
        const today = getTodayIso();

        const pending = allMissions.filter(mission => {
            if (mission.end && mission.end < today) return false;
            if (!isUserConcerned(mission, user)) return false;

            const sameGroup =
                !mission.group ||
                mission.group === "all" ||
                String(mission.group) === String(user.group);

            if (!sameGroup) return false;

            return !(mission.responses || {})[user.login];
        });

        updatePendingBanner(pending);
    }

    hideSplashScreen();
}, error => {
    console.error("Erreur de chargement des missions :", error);
    hideSplashScreen();
});

// ======================================
// PATRACDR
// ======================================

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

    const value = id =>
        document.getElementById(id)?.value.trim() || "";

    return {
        personnel: value("pPersonnel"),
        armement: value("pArmement"),
        tenue: value("pTenue"),
        radio: value("pRadio"),
        alimentation: value("pAlimentation"),
        camouflage: value("pCamouflage"),
        divers: value("pDivers"),
        rassemblement: value("pRassemblement")
    };
}

function resetPatracdrForm() {
    if (!patracdrToggle) return;

    patracdrToggle.checked = false;
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

// ======================================
// CREATION MISSION
// ======================================

autoFormatDateInput(mStart);
autoFormatDateInput(mEnd);

createBtn?.addEventListener("click", async () => {
    if (!canCreateMission(user)) return;

    const start = frToIso(mStart?.value);
    const end = frToIso(mEnd?.value);

    const group = isCDG(user)
        ? String(user.profile.replace("CDG", ""))
        : String(missionGroupSelect?.value || "");

    const mission = {
        title: mTitle?.value.trim() || "",
        description: mDesc?.value.trim() || "",
        start,
        end,
        location: mLocation?.value.trim() || "",
        concerned: mConcerned?.value.trim() || "Tous",
        createdBy: user.login,
        group,
        patracdr: collectPatracdrFromForm()
    };

    if (!mission.title) {
        alert("Le titre est obligatoire.");
        return;
    }

    if (!start || !end) {
        alert("Dates invalides. Utilise le format JJ/MM/AAAA.");
        return;
    }

    if (end < start) {
        alert("La date de fin ne peut pas être avant la date de début.");
        return;
    }

    if (!["1", "2", "3", "all"].includes(group)) {
        alert("Choisis un groupe valide.");
        return;
    }

    createBtn.disabled = true;

    try {
        await createMissionInDb(mission);

        mTitle.value = "";
        mDesc.value = "";
        mStart.value = "";
        mEnd.value = "";
        mLocation.value = "";
        mConcerned.value = "";

        if (isCDS(user) && missionGroupSelect) {
            missionGroupSelect.value = "1";
        }

        resetPatracdrForm();
        alert("Mission créée.");
    } catch (error) {
        console.error(error);
        alert("Erreur lors de la création de la mission.");
    } finally {
        createBtn.disabled = false;
    }
});

console.log("BLEU4 2027 - Application chargée");
