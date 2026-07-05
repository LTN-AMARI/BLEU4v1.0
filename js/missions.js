// ======================================
// BLEU4 v2 - MISSIONS
// Affichage de la liste des missions du jour
// sélectionné + actions (présent/indisponible/suppression)
// ======================================

import { setResponse, deleteMissionInDb } from "./firebase.js";

export function renderMissionList(missions, date, user) {

    const container = document.getElementById("missions");
    const titleEl = document.getElementById("selectedDateTitle");

    if (!container || !titleEl) return;

    if (!date) {
        titleEl.innerText = "Sélectionnez un jour";
        container.innerHTML = "";
        return;
    }

    titleEl.innerText = formatDateFr(date);

    const dayMissions = missions.filter(
        (m) => m.start && m.end && date >= m.start && date <= m.end
    );

    container.innerHTML = "";

    if (dayMissions.length === 0) {
        container.innerHTML = "<p>Aucune mission ce jour.</p>";
        return;
    }

    dayMissions.forEach((mission) => {

        const responses = mission.responses || {};
        const myStatus = responses[user.login];

        const div = document.createElement("div");
        div.className = "mission";

        div.innerHTML = `
            <h3>${escapeHtml(mission.title)}</h3>
            ${mission.description ? `<p>${escapeHtml(mission.description)}</p>` : ""}
            <p><strong>Lieu :</strong> ${escapeHtml(mission.location || "—")}</p>
            <p><strong>Concernés :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>
            <p><strong>Période :</strong> ${mission.start} → ${mission.end}</p>
        `;

        // ===========================
        // ACTIONS présent / indisponible
        // ===========================

        const actions = document.createElement("div");
        actions.className = "actions";

        const presentBtn = document.createElement("button");
        presentBtn.className = "btn-present";
        presentBtn.innerText = myStatus === "present" ? "✔ Présent" : "Présent";
        presentBtn.addEventListener("click", async () => {
            presentBtn.disabled = true;
            try {
                await setResponse(mission.id, user.login, "present");
            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'enregistrement de la réponse.");
            } finally {
                presentBtn.disabled = false;
            }
        });

        const absentBtn = document.createElement("button");
        absentBtn.className = "btn-absent";
        absentBtn.innerText = myStatus === "absent" ? "✔ Indisponible" : "Indisponible";
        absentBtn.addEventListener("click", async () => {
            absentBtn.disabled = true;
            try {
                await setResponse(mission.id, user.login, "absent");
            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'enregistrement de la réponse.");
            } finally {
                absentBtn.disabled = false;
            }
        });

        actions.appendChild(presentBtn);
        actions.appendChild(absentBtn);

        // ===========================
        // COMMANDEMENT UNIQUEMENT :
        // suppression + liste des réponses
        // ===========================

        if (user.role === "commandement") {

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn-delete";
            deleteBtn.innerText = "Supprimer";
            deleteBtn.addEventListener("click", async () => {

                if (!confirm("Supprimer cette mission ?")) return;

                deleteBtn.disabled = true;

                try {
                    await deleteMissionInDb(mission.id);
                } catch (err) {
                    console.error(err);
                    alert("Erreur lors de la suppression.");
                    deleteBtn.disabled = false;
                }

            });

            actions.appendChild(deleteBtn);

            const list = document.createElement("div");
            list.className = "list";

            const entries = Object.entries(responses);

            if (entries.length === 0) {
                list.innerHTML = "<p>Aucune réponse pour le moment.</p>";
            } else {
                list.innerHTML = entries
                    .map(([login, status]) =>
                        `<p>${escapeHtml(login)} — ${status === "present" ? "Présent" : "Indisponible"}</p>`
                    )
                    .join("");
            }

            div.appendChild(actions);
            div.appendChild(list);

        } else {

            div.appendChild(actions);

        }

        container.appendChild(div);

    });

}

// ======================================
// UTILITAIRES
// ======================================

function formatDateFr(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
