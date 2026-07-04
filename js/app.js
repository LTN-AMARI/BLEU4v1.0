
const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

if (!user) {
    window.location.href = "index.html";
}

// =======================
// HEADER
// =======================
document.getElementById("userInfo").innerText =
    `${user.login} — ${user.role}`;

document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("BLEU4_USER");
    location.reload();
};

// =======================
// ROLE CONTROL (IMPORTANT)
// =======================
window.addEventListener("DOMContentLoaded", () => {

    const box = document.getElementById("createMissionBox");

    // ❌ MEMBRE = PAS DE CREATION
    if (user.role !== "commandement") {
        if (box) box.style.display = "none";
    }

    // =======================
    // CREATE BUTTON
    // =======================
    const btn = document.getElementById("createBtn");

    if (!btn) return;

    btn.addEventListener("click", () => {

        const mission = {
            title: document.getElementById("mTitle")?.value.trim(),
            description: document.getElementById("mDesc")?.value.trim(),
            startDate: document.getElementById("mStartDate")?.value,
            endDate: document.getElementById("mEndDate")?.value,
            location: document.getElementById("mLocation")?.value,
            concerned: document.getElementById("mConcerned")?.value
        };

        console.log("CREATE CLICK", mission);

        if (!mission.title || !mission.startDate || !mission.endDate) {
            alert("Titre + dates obligatoires");
            return;
        }

        if (!window.createMission) {
            alert("Erreur: createMission introuvable");
            return;
        }

        window.createMission(mission);

        alert("Mission créée ✔");

        // reset
        ["mTitle","mDesc","mStartDate","mEndDate","mLocation","mConcerned"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    });
});
