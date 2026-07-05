// ======================================
// BLEU4 v2 - DASHBOARD
// Calcule les statistiques globales à partir
// de TOUTES les missions (pas de lecture Firebase
// ici : les données arrivent déjà via app.js)
// + permet de sélectionner une mission pour voir
// le détail des réponses présent / indisponible.
// ======================================

let missionsCache = [];

export function updateDashboard(missions) {

    missionsCache = missions || [];

    updateStats(missionsCache);
    populateMissionSelect(missionsCache);

}

// ======================================
// STATS GLOBALES
// ======================================

function updateStats(missions) {

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

// ======================================
// SELECTEUR DE MISSION
// ======================================

function populateMissionSelect(missions) {

    const select = document.getElementById("dashboardMissionSelect");

    if (!select) return; // dashboard masqué (rôle membre)

    const previousValue = select.value;

    select.innerHTML = '<option value="">-- Choisir une mission --</option>';

    missions
        .slice()
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
        .forEach((m) => {

            const option = document.createElement("option");
            option.value = m.id;
            option.innerText = `${m.title} (${m.start} → ${m.end})`;
            select.appendChild(option);

        });

    // conserve la sélection précédente si la mission existe encore
    if (previousValue && missions.some((m) => m.id === previousValue)) {

        select.value = previousValue;
        renderMissionDetail(previousValue);

    } else {

        renderMissionDetail("");

    }

    // le listener n'est attaché qu'une seule fois
    if (!select.dataset.bound) {

        select.addEventListener("change", () => {
            renderMissionDetail(select.value);
        });

        select.dataset.bound = "true";

    }

}

// ======================================
// DETAIL D'UNE MISSION
// ======================================

function renderMissionDetail(missionId) {

    const container = document.getElementById("dashboardMissionDetail");

    if (!container) return;

    if (!missionId) {
        container.innerHTML = "";
        return;
    }

    const mission = missionsCache.find((m) => m.id === missionId);

    if (!mission) {
        container.innerHTML = "";
        return;
    }

    const responses = mission.responses || {};
    const entries = Object.entries(responses);

    const present = entries.filter(([, status]) => status === "present");
    const absent = entries.filter(([, status]) => status === "absent");

    container.innerHTML = `
        <div class="mission-detail">

            <h3>${escapeHtml(mission.title)}</h3>
            <p><strong>Période :</strong> ${mission.start} → ${mission.end}</p>
            <p><strong>Concernés :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>

            <div class="detail-columns">

                <div>
                    <h4>Présents (${present.length})</h4>
                    ${
                        present.length
                            ? present.map(([login]) => `<p>${escapeHtml(login)}</p>`).join("")
                            : "<p class='muted'>Aucun</p>"
                    }
                </div>

                <div>
                    <h4>Indisponibles (${absent.length})</h4>
                    ${
                        absent.length
                            ? absent.map(([login]) => `<p>${escapeHtml(login)}</p>`).join("")
                            : "<p class='muted'>Aucun</p>"
                    }
                </div>

            </div>

        </div>
    `;

}

// ======================================
// UTILITAIRES
// ======================================

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
