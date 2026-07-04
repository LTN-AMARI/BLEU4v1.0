
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

// =======================
// HEADER
// =======================
window.addEventListener("DOMContentLoaded", () => {

    const userInfo = document.getElementById("userInfo");
    const logoutBtn = document.getElementById("logoutBtn");

    if (userInfo) {
        userInfo.innerText = `${user.login} — ${user.role}`;
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem("BLEU4_USER");
            window.location.href = "index.html";
        };
    }

    // =======================
    // ROLE CONTROL (IMPORTANT)
    // =======================
    const box = document.getElementById("createMissionBox");

    if (user.role !== "commandement") {
        if (box) {
            box.style.display = "none";
        }
    }

    // =======================
    // CREATE MISSION BUTTON
    // =======================
    const btn = document.getElementById("createBtn");

    if (btn) {
        btn.addEventListener("click", () => {

            const mission = {
    title: document.getElementById("mTitle")?.value?.trim() || "",
    description: document.getElementById("mDesc")?.value?.trim() || "",
    start: document.getElementById("mStartDate")?.value || "",
    end: document.getElementById("mEndDate")?.value || "",
    location: document.getElementById("mLocation")?.value?.trim() || "",
    concerned: document.getElementById("mConcerned")?.value?.trim() || ""
};

            console.log("📦 CREATE CLICK", mission);

            if (!mission.title || !mission.startDate || !mission.endDate) {
                alert("Titre + dates obligatoires");
                return;
            }

            if (!window.createMission) {
                console.error("❌ createMission introuvable");
                alert("Erreur système (createMission)");
                return;
            }

            window.createMission(mission);

            alert("✔ Mission créée");

            // reset inputs
            ["mTitle","mDesc","mStartDate","mEndDate","mLocation","mConcerned"]
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });
        });
    }

});
