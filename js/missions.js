// ======================================
// BLEU4 v2 - MISSIONS
// Fournit deux vues à partir de la même carte
// mission réutilisable :
//  - renderMissionList  : missions du jour sélectionné (calendrier)
//  - renderAllMissions  : liste complète (gestion, commandement)
// ======================================

import { setResponse, deleteMissionInDb } from "./firebase.js";
import { isoToFr } from "./dateUtils.js";

// ======================================
// VUE "JOUR SELECTIONNE" (calendrier)
// ======================================

export function renderMissionList(missions, date, user) {

    const container = document.getElementById("missions");
    const titleEl = document.getElementById("selectedDateTitle");

    if (!container || !titleEl) return;

    if (!date) {
        titleEl.innerText = "Sélectionnez un jour";
        container.innerHTML = "";
        return;
    }

    titleEl.innerText = isoToFr(date);

    const dayMissions = missions.filter(
        (m) => m.start && m.end && date >= m.start && date <= m.end
    );

    container.innerHTML = "";

    if (dayMissions.length === 0) {
        container.innerHTML = "<p>Aucune mission ce jour.</p>";
        return;
    }

    dayMissions.forEach((mission) => {
        container.appendChild(renderMissionCard(mission, user));
    });

}

// ======================================
// VUE "TOUTES LES MISSIONS" (gestion, commandement)
// ======================================

export function renderAllMissions(missions, user) {

    const container = document.getElementById("allMissionsList");

    if (!container) return;

    container.innerHTML = "";

    if (missions.length === 0) {
        container.innerHTML = "<p>Aucune mission créée.</p>";
        return;
    }

    const sorted = missions
        .slice()
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    sorted.forEach((mission) => {
        container.appendChild(renderMissionCard(mission, user));
    });

}

// ======================================
// CARTE MISSION REUTILISABLE
// ======================================

function renderMissionCard(mission, user) {

    const responses = mission.responses || {};
    const myStatus = responses[user.login];
    const concernedOk = user.role === "commandement" || isUserConcerned(mission, user);

    const div = document.createElement("div");
    div.className = "mission";

    div.innerHTML = `
        <h3>${escapeHtml(mission.title)}</h3>
        ${mission.description ? `<p>${escapeHtml(mission.description)}</p>` : ""}
        <p><strong>Lieu :</strong> ${escapeHtml(mission.location || "—")}</p>
        <p><strong>Concernés :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>
        <p><strong>Période :</strong> ${isoToFr(mission.start)} → ${isoToFr(mission.end)}</p>
        ${
            user.role === "membre" && !concernedOk
                ? `<p class="not-concerned">⚠ Vous n'êtes pas concerné par cette mission</p>`
                : ""
        }
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    if (user.role === "membre") {

        // ===========================
        // MEMBRE : répond pour lui-même
        // ===========================

        const presentBtn = document.createElement("button");
        presentBtn.className = "btn-present";
        presentBtn.innerText = myStatus === "present" ? "✔ Présent" : "Présent";
        presentBtn.addEventListener("click", async () => {

            if (!concernedOk) {
                alert("Non concerné par cette mission.");
                return;
            }

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

            if (!concernedOk) {
                alert("Non concerné par cette mission.");
                return;
            }

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
        div.appendChild(actions);

    } else {

        // ===========================
        // COMMANDEMENT : pas de bouton
        // présent/indisponible personnel,
        // uniquement gestion : suppression
        // + correction de la présence réelle
        // (clic sur la carte = ouvrir le détail)
        // ===========================

        div.classList.add("clickable");

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-delete";
        deleteBtn.innerText = "Supprimer";
        deleteBtn.addEventListener("click", async (e) => {

            e.stopPropagation();

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
        div.appendChild(actions);

        const detail = renderResponseLists(mission, responses);
        detail.classList.add("mission-detail-toggle", "hidden");
        div.appendChild(detail);

        div.addEventListener("click", () => {
            detail.classList.toggle("hidden");
        });

    }

    return div;

}

// ======================================
// LISTES VERTICALES PRESENTS / ABSENTS
// (commandement) — cliquer sur le bouton
// d'une personne bascule son statut réel.
// ======================================

function renderResponseLists(mission, responses) {

    const wrap = document.createElement("div");
    wrap.className = "list";

    const entries = Object.entries(responses);

    if (entries.length === 0) {
        wrap.innerHTML = "<p>Aucune réponse pour le moment.</p>";
        return wrap;
    }

    const present = entries
        .filter(([, status]) => status === "present")
        .sort((a, b) => a[0].localeCompare(b[0]));

    const absent = entries
        .filter(([, status]) => status === "absent")
        .sort((a, b) => a[0].localeCompare(b[0]));

    // ===========================
    // Bloc PRESENTS
    // ===========================

    const presentBlock = document.createElement("div");
    presentBlock.className = "response-group";

    const presentTitle = document.createElement("h4");
    presentTitle.className = "response-group-title present";
    presentTitle.innerText = `Présents (${present.length})`;
    presentBlock.appendChild(presentTitle);

    if (present.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.innerText = "Aucun";
        presentBlock.appendChild(empty);
    } else {
        present.forEach(([login]) => {
            presentBlock.appendChild(buildResponseRow(mission, login, "present"));
        });
    }

    // ===========================
    // Bloc ABSENTS
    // ===========================

    const absentBlock = document.createElement("div");
    absentBlock.className = "response-group";

    const absentTitle = document.createElement("h4");
    absentTitle.className = "response-group-title absent";
    absentTitle.innerText = `Indisponibles (${absent.length})`;
    absentBlock.appendChild(absentTitle);

    if (absent.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.innerText = "Aucun";
        absentBlock.appendChild(empty);
    } else {
        absent.forEach(([login]) => {
            absentBlock.appendChild(buildResponseRow(mission, login, "absent"));
        });
    }

    wrap.appendChild(presentBlock);
    wrap.appendChild(absentBlock);

    return wrap;

}

function buildResponseRow(mission, login, currentStatus) {

    const row = document.createElement("div");
    row.className = "response-row";

    const name = document.createElement("span");
    name.className = "response-name";
    name.innerText = login;

    const otherStatus = currentStatus === "present" ? "absent" : "present";

    const switchBtn = document.createElement("button");
    switchBtn.className = "small btn-switch";
    switchBtn.innerText =
        currentStatus === "present" ? "→ Indisponible" : "→ Présent";

    switchBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        switchBtn.disabled = true;
        try {
            await setResponse(mission.id, login, otherStatus);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la mise à jour.");
        } finally {
            switchBtn.disabled = false;
        }
    });

    row.appendChild(name);
    row.appendChild(switchBtn);

    return row;

}

// ======================================
// Détermine si l'utilisateur fait partie
// des personnes concernées par la mission.
// "Tous" (ou champ vide) = tout le monde.
// Sinon, liste de noms séparés par virgule.
// ======================================

function isUserConcerned(mission, user) {

    const concerned = (mission.concerned || "Tous").trim();

    if (!concerned || concerned.toLowerCase() === "tous") {
        return true;
    }

    const list = concerned
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

    return list.includes(user.login.toUpperCase());

}

// ======================================
// UTILITAIRES
// ======================================

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
