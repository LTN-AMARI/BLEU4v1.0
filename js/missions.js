// ======================================
// BLEU4 v2 - MISSIONS
// Fournit deux vues à partir de la même carte
// mission réutilisable :
//  - renderMissionList  : missions du jour sélectionné (calendrier)
//  - renderAllMissions  : liste complète (gestion, commandement)
// ======================================

import { setResponse, deleteMissionInDb, updateMissionInDb } from "./firebase.js";
import { isoToFr, frToIso, autoFormatDateInput } from "./dateUtils.js";

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

    // ===========================
    // PATRACDR (si présent sur la mission)
    // visible par tous, replié par défaut
    // ===========================

    if (mission.patracdr) {

        const patracdrToggleBtn = document.createElement("button");
        patracdrToggleBtn.className = "small btn-switch patracdr-toggle-btn";
        patracdrToggleBtn.innerText = "Voir PATRACDR";

        const patracdrBlock = buildPatracdrBlock(mission.patracdr);
        patracdrBlock.classList.add("hidden");

        patracdrToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            patracdrBlock.classList.toggle("hidden");
        });

        div.appendChild(patracdrToggleBtn);
        div.appendChild(patracdrBlock);

    }

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

        // liste en lecture seule : les membres voient qui a répondu,
        // mais ne peuvent pas modifier les réponses des autres
        const readOnlyDetail = renderResponseLists(mission, responses, false);
        div.appendChild(readOnlyDetail);

    } else {

        // ===========================
        // COMMANDEMENT : pas de bouton
        // présent/indisponible personnel,
        // uniquement gestion : suppression
        // + correction de la présence réelle
        // (clic sur la carte = ouvrir le détail)
        // ===========================

        div.classList.add("clickable");

        const modifyBtn = document.createElement("button");
        modifyBtn.className = "btn-switch";
        modifyBtn.innerText = "Modifier";
        modifyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            editForm.classList.toggle("hidden");
        });

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

        actions.appendChild(modifyBtn);
        actions.appendChild(deleteBtn);
        div.appendChild(actions);

        const editForm = buildEditForm(mission);
        editForm.classList.add("mission-edit-form", "hidden");
        div.appendChild(editForm);

        const detail = renderResponseLists(mission, responses, true);
        detail.classList.add("mission-detail-toggle", "hidden");
        div.appendChild(detail);

        div.addEventListener("click", () => {
            detail.classList.toggle("hidden");
        });

    }

    return div;

}

// ======================================
// BLOC PATRACDR (affichage)
// Personnel, Armement, Tenue, Radio,
// Alimentation, Camouflage, Divers, Rassemblement
// ======================================

function buildPatracdrBlock(patracdr) {

    const block = document.createElement("div");
    block.className = "patracdr-block";

    // empêche le clic dans le bloc d'ouvrir/fermer
    // le détail des réponses de la carte parente
    block.addEventListener("click", (e) => e.stopPropagation());

    const fields = [
        ["Personnel", patracdr.personnel],
        ["Armement", patracdr.armement],
        ["Tenue", patracdr.tenue],
        ["Radio", patracdr.radio],
        ["Alimentation", patracdr.alimentation],
        ["Camouflage", patracdr.camouflage],
        ["Divers", patracdr.divers],
        ["Rassemblement", patracdr.rassemblement]
    ];

    block.innerHTML =
        `<h4 class="patracdr-title">PATRACDR</h4>` +
        fields
            .map(([label, value]) => `<p><strong>${label} :</strong> ${escapeHtml(value || "—")}</p>`)
            .join("");

    return block;

}

// ======================================
// FORMULAIRE D'EDITION (commandement)
// Modifie titre, description, dates, lieu,
// concernés — ne touche jamais aux réponses.
// ======================================

function buildEditForm(mission) {

    const form = document.createElement("div");
    form.className = "edit-form";

    form.innerHTML = `
        <label>Titre</label>
        <input type="text" class="edit-title" value="${escapeAttr(mission.title)}">

        <label>Description</label>
        <textarea class="edit-desc">${escapeHtml(mission.description || "")}</textarea>

        <div class="row">
            <div>
                <label>Date début</label>
                <input type="text" class="edit-start" inputmode="numeric" maxlength="10"
                    placeholder="JJ/MM/AAAA" value="${isoToFr(mission.start)}">
            </div>
            <div>
                <label>Date fin</label>
                <input type="text" class="edit-end" inputmode="numeric" maxlength="10"
                    placeholder="JJ/MM/AAAA" value="${isoToFr(mission.end)}">
            </div>
        </div>

        <label>Lieu</label>
        <input type="text" class="edit-location" value="${escapeAttr(mission.location || "")}">

        <label>Concernés</label>
        <input type="text" class="edit-concerned" value="${escapeAttr(mission.concerned || "Tous")}">

        <label class="checkbox-label">
            <input type="checkbox" class="edit-patracdr-toggle" ${mission.patracdr ? "checked" : ""}>
            Inclure un PATRACDR
        </label>

        <div class="edit-patracdr-fields patracdr-fields ${mission.patracdr ? "" : "hidden"}">

            <label>Personnel</label>
            <input type="text" class="edit-p-personnel" value="${escapeAttr(mission.patracdr?.personnel || "")}">

            <label>Armement</label>
            <input type="text" class="edit-p-armement" value="${escapeAttr(mission.patracdr?.armement || "")}">

            <label>Tenue</label>
            <input type="text" class="edit-p-tenue" value="${escapeAttr(mission.patracdr?.tenue || "")}">

            <label>Radio</label>
            <input type="text" class="edit-p-radio" value="${escapeAttr(mission.patracdr?.radio || "")}">

            <label>Alimentation</label>
            <input type="text" class="edit-p-alimentation" value="${escapeAttr(mission.patracdr?.alimentation || "")}">

            <label>Camouflage</label>
            <input type="text" class="edit-p-camouflage" value="${escapeAttr(mission.patracdr?.camouflage || "")}">

            <label>Divers</label>
            <input type="text" class="edit-p-divers" value="${escapeAttr(mission.patracdr?.divers || "")}">

            <label>Rassemblement</label>
            <input type="text" class="edit-p-rassemblement" value="${escapeAttr(mission.patracdr?.rassemblement || "")}">

        </div>

        <div class="actions"></div>
    `;

    // empêche tout clic dans le formulaire de fermer/ouvrir
    // le détail des réponses de la carte parente
    form.addEventListener("click", (e) => e.stopPropagation());

    const patracdrToggle = form.querySelector(".edit-patracdr-toggle");
    const patracdrFieldsWrap = form.querySelector(".edit-patracdr-fields");

    patracdrToggle.addEventListener("change", () => {
        patracdrFieldsWrap.classList.toggle("hidden", !patracdrToggle.checked);
    });

    const startInput = form.querySelector(".edit-start");
    const endInput = form.querySelector(".edit-end");

    autoFormatDateInput(startInput);
    autoFormatDateInput(endInput);

    const actionsWrap = form.querySelector(".actions");

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn-present";
    saveBtn.innerText = "Enregistrer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-delete";
    cancelBtn.innerText = "Annuler";
    cancelBtn.addEventListener("click", () => {
        form.classList.add("hidden");
    });

    saveBtn.addEventListener("click", async () => {

        const title = form.querySelector(".edit-title").value.trim();
        const description = form.querySelector(".edit-desc").value.trim();
        const location = form.querySelector(".edit-location").value.trim();
        const concerned = form.querySelector(".edit-concerned").value.trim() || "Tous";

        const startIso = frToIso(startInput.value);
        const endIso = frToIso(endInput.value);

        if (!title) {
            alert("Le titre est obligatoire.");
            return;
        }

        if (!startIso || !endIso) {
            alert("Les dates doivent être valides et au format JJ/MM/AAAA.");
            return;
        }

        if (endIso < startIso) {
            alert("La date de fin ne peut pas être avant la date de début.");
            return;
        }

        saveBtn.disabled = true;

        try {

            const fields = {
                title,
                description,
                location,
                concerned,
                start: startIso,
                end: endIso
            };

            if (patracdrToggle.checked) {

                fields.patracdr = {
                    personnel: form.querySelector(".edit-p-personnel").value.trim(),
                    armement: form.querySelector(".edit-p-armement").value.trim(),
                    tenue: form.querySelector(".edit-p-tenue").value.trim(),
                    radio: form.querySelector(".edit-p-radio").value.trim(),
                    alimentation: form.querySelector(".edit-p-alimentation").value.trim(),
                    camouflage: form.querySelector(".edit-p-camouflage").value.trim(),
                    divers: form.querySelector(".edit-p-divers").value.trim(),
                    rassemblement: form.querySelector(".edit-p-rassemblement").value.trim()
                };

            } else {

                // décoché : on retire le PATRACDR existant de la mission
                fields.patracdr = null;

            }

            await updateMissionInDb(mission.id, fields);

            form.classList.add("hidden");

        } catch (err) {
            console.error(err);
            alert("Erreur lors de la modification de la mission.");
        } finally {
            saveBtn.disabled = false;
        }

    });

    actionsWrap.appendChild(saveBtn);
    actionsWrap.appendChild(cancelBtn);

    return form;

}

// ======================================
// LISTES VERTICALES PRESENTS / ABSENTS
// - editable = true  (commandement) : bouton pour
//   corriger le statut réel de chaque personne.
// - editable = false (membre) : lecture seule.
// ======================================

function renderResponseLists(mission, responses, editable) {

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
            presentBlock.appendChild(buildResponseRow(mission, login, "present", editable));
        });
    }

    // ===========================
    // Bloc ABSENTS
    // ===========================

    const absentBlock = document.createElement("div");
    absentBlock.className = "response-group";

    const absentTitle = document.createElement("h4");
    absentTitle.className = "response-group-title absent";
    absentTitle.innerText = `Absents (${absent.length})`;
    absentBlock.appendChild(absentTitle);

    if (absent.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.innerText = "Aucun";
        absentBlock.appendChild(empty);
    } else {
        absent.forEach(([login]) => {
            absentBlock.appendChild(buildResponseRow(mission, login, "absent", editable));
        });
    }

    wrap.appendChild(presentBlock);
    wrap.appendChild(absentBlock);

    return wrap;

}

function buildResponseRow(mission, login, currentStatus, editable) {

    const row = document.createElement("div");
    row.className = "response-row";

    const name = document.createElement("span");
    name.className = "response-name";
    name.innerText = login;

    row.appendChild(name);

    if (editable) {

        const otherStatus = currentStatus === "present" ? "absent" : "present";

        const switchBtn = document.createElement("button");
        switchBtn.className = "small btn-switch";
        switchBtn.innerText =
            currentStatus === "present" ? "→ Absent" : "→ Présent";

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

        row.appendChild(switchBtn);

    }

    return row;

}

// ======================================
// Détermine si l'utilisateur fait partie
// des personnes concernées par la mission.
// "Tous" (ou champ vide) = tout le monde.
// Sinon, liste de noms séparés par virgule.
// ======================================

export function isUserConcerned(mission, user) {

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

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
