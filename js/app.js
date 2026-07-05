// ======================================
// BLEU4 v2 - APP
// ======================================

const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

// ======================================
// SECURITE
// ======================================

if (!user) {
    window.location.href = "index.html";
}

// ======================================
// HEADER
// ======================================

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

if (userInfo) {
    userInfo.textContent = `${user.login} — ${user.role.toUpperCase()}`;
}

// ======================================
// DECONNEXION
// ======================================

logoutBtn?.addEventListener("click", () => {

    localStorage.removeItem("BLEU4_USER");

    window.location.href = "index.html";

});

// ======================================
// AFFICHAGE SELON LE ROLE
// ======================================

const createBox = document.getElementById("createMissionBox");
const dashboard = document.getElementById("dashboard");

if (user.role === "commandement") {

    if (createBox) createBox.style.display = "block";
    if (dashboard) dashboard.style.display = "block";

} else {

    if (createBox) createBox.style.display = "none";

    // Si tu veux que les membres ne voient pas le dashboard :
    // if (dashboard) dashboard.style.display = "none";

}

// ======================================
// CREATION MISSION
// ======================================

const createBtn = document.getElementById("createBtn");

createBtn?.addEventListener("click", () => {

    const mission = {

        title: document.getElementById("mTitle").value.trim(),

        description: document.getElementById("mDesc").value.trim(),

        start: document.getElementById("mStart").value,

        end: document.getElementById("mEnd").value,

        location: document.getElementById("mLocation").value.trim(),

        concerned: document.getElementById("mConcerned").value.trim()

    };

    if (
        mission.title === "" ||
        mission.start === "" ||
        mission.end === ""
    ) {

        alert("Titre, date de début et date de fin obligatoires.");

        return;

    }

    if (typeof window.createMission === "function") {

        window.createMission(mission);

    }

    // ===========================
    // RESET
    // ===========================

    document.getElementById("mTitle").value = "";
    document.getElementById("mDesc").value = "";
    document.getElementById("mStart").value = "";
    document.getElementById("mEnd").value = "";
    document.getElementById("mLocation").value = "";
    document.getElementById("mConcerned").value = "";

});

// ======================================
// CALENDRIER
// ======================================

// Le calendrier s'initialise tout seul dans calendar.js.
// Rien à faire ici.

// ======================================
// FIN
// ======================================

console.log("✅ BLEU4 APP OK");
