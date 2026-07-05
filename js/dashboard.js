// ======================================
// BLEU4 v2 - DASHBOARD
// Calcule les statistiques globales à partir
// de TOUTES les missions (pas de lecture Firebase
// ici : les données arrivent déjà via app.js)
// ======================================

export function updateDashboard(missions) {

    const totalEl = document.getElementById("statsTotal");
    const presentEl = document.getElementById("statsPresent");
    const absentEl = document.getElementById("statsAbsent");
    const pendingEl = document.getElementById("statsPending");

    if (!totalEl) return; // dashboard masqué (rôle membre)

    let present = 0;
    let absent = 0;
    let missionsSansReponse = 0;

    missions.forEach((m) => {

        const responses = m.responses || {};
        const values = Object.values(responses);

        present += values.filter((v) => v === "present").length;
        absent += values.filter((v) => v === "absent").length;

        if (values.length === 0) {
            missionsSansReponse++;
        }

    });

    totalEl.innerText = missions.length;
    presentEl.innerText = present;
    absentEl.innerText = absent;
    pendingEl.innerText = missionsSansReponse;

}
