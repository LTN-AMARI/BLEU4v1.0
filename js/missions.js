// ======================================
// BLEU4 v2 - MISSIONS
// Fournit deux vues à partir de la même carte
// mission réutilisable :
//  - renderMissionList  : missions du jour sélectionné (calendrier)
//  - renderAllMissions  : liste complète (gestion, commandement)
// ======================================

import { setResponse, deleteMissionInDb, updateMissionInDb, setResponseDays, removeResponse } from "./firebase.js";
import { isoToFr, frToIso, autoFormatDateInput, getTodayIso } from "./dateUtils.js";

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

    // les missions archivées ne s'affichent plus ici,
    // elles ont leur propre section
    const active = missions.filter((m) => !m.archived);

    container.innerHTML = "";

    if (active.length === 0) {
        container.innerHTML = "<p>Aucune mission créée.</p>";
        return;
    }

    const sorted = active
        .slice()
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    sorted.forEach((mission) => {
        container.appendChild(renderMissionCard(mission, user));
    });

}

// ======================================
// VUE "MISSIONS ARCHIVEES" (gestion, commandement)
// Missions terminées et rangées à part —
// elles continuent de compter dans le
// compteur de présence, juste plus dans
// la liste active.
// ======================================

export function renderArchivedMissions(missions, user) {

    const container = document.getElementById("archivedMissionsList");

    if (!container) return;

    const archived = missions.filter((m) => m.archived);

    container.innerHTML = "";

    if (archived.length === 0) {
        container.innerHTML = "<p>Aucune mission archivée.</p>";
        return;
    }

    // les plus récentes en premier
    const sorted = archived
        .slice()
        .sort((a, b) => (b.start || "").localeCompare(a.start || ""));

    sorted.forEach((mission) => {
        container.appendChild(renderMissionCard(mission, user));
    });

}

// ======================================
// CARTE MISSION REUTILISABLE
// ======================================

function renderMissionCard(mission, user) {

    const responses = mission.responses || {};
    const myStatus = getStatus(responses[user.login]);
    const concernedOk = user.role === "commandement" || isUserConcerned(mission, user);

    const div = document.createElement("div");
    div.className = "mission";

    // ==========================================================
    // MEMBRE : carte complète toujours visible (accès rapide
    // aux boutons présent/indisponible, pas de repli)
    // ==========================================================

    if (user.role === "membre") {

        div.innerHTML = `
            <h3>${escapeHtml(mission.title)}</h3>
            ${mission.description ? `<p>${escapeHtml(mission.description)}</p>` : ""}
            <p><strong>Lieu :</strong> ${escapeHtml(mission.location || "—")}</p>
            <p><strong>Concernés :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>
            <p><strong>Période :</strong> ${isoToFr(mission.start)} → ${isoToFr(mission.end)}</p>
            ${!concernedOk ? `<p class="not-concerned">⚠ Vous n'êtes pas concerné par cette mission</p>` : ""}
        `;

        if (mission.patracdr) {

            const patracdrToggleBtn = document.createElement("button");
            patracdrToggleBtn.className = "small btn-switch patracdr-toggle-btn";
            patracdrToggleBtn.innerText = "Voir PATRACDR";

            const patracdrBlock = buildPatracdrBlock(mission.patracdr);
            patracdrBlock.classList.add("hidden");

            patracdrToggleBtn.addEventListener("click", () => {
                patracdrBlock.classList.toggle("hidden");
            });

            div.appendChild(patracdrToggleBtn);
            div.appendChild(patracdrBlock);

        }

        const actions = document.createElement("div");
        actions.className = "actions";

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

        return div;

    }

    // ==========================================================
    // COMMANDEMENT : carte repliée par défaut, juste un résumé
    // (titre, dates, compteur présents/absents) — un clic
    // déplie tout le détail et les actions de gestion.
    // ==========================================================

    const entries = Object.entries(responses);
    const presentCount = entries.filter(([, e]) => getStatus(e) === "present").length;
    const absentCount = entries.filter(([, e]) => getStatus(e) === "absent").length;

    const summary = document.createElement("div");
    summary.className = "mission-summary";
    summary.innerHTML = `
        <span class="mission-summary-title">${escapeHtml(mission.title)}</span>
        <span class="mission-summary-dates">${isoToFr(mission.start)} → ${isoToFr(mission.end)}</span>
        <span class="mission-summary-counts">✓ ${presentCount} · ✕ ${absentCount}</span>
    `;

    div.appendChild(summary);

    const body = document.createElement("div");
    body.className = "mission-body hidden";

    body.innerHTML = `
        ${mission.description ? `<p>${escapeHtml(mission.description)}</p>` : ""}
        <p><strong>Lieu :</strong> ${escapeHtml(mission.location || "—")}</p>
        <p><strong>Concernés :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>
    `;

    if (mission.patracdr) {

        const patracdrToggleBtn = document.createElement("button");
        patracdrToggleBtn.className = "small btn-switch patracdr-toggle-btn";
        patracdrToggleBtn.innerText = "Voir PATRACDR";

        const patracdrBlock = buildPatracdrBlock(mission.patracdr);
        patracdrBlock.classList.add("hidden");

        patracdrToggleBtn.addEventListener("click", () => {
            patracdrBlock.classList.toggle("hidden");
        });

        body.appendChild(patracdrToggleBtn);
        body.appendChild(patracdrBlock);

    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const modifyBtn = document.createElement("button");
    modifyBtn.className = "btn-switch";
    modifyBtn.innerText = "Modifier";
    modifyBtn.addEventListener("click", () => {
        editForm.classList.toggle("hidden");
    });

    const archiveBtn = document.createElement("button");
    archiveBtn.className = "small btn-switch";

    if (mission.archived) {

        archiveBtn.innerText = "Désarchiver";
        archiveBtn.addEventListener("click", async () => {

            archiveBtn.disabled = true;

            try {
                await updateMissionInDb(mission.id, { archived: null });
            } catch (err) {
                console.error(err);
                alert("Erreur lors du désarchivage.");
                archiveBtn.disabled = false;
            }

        });

    } else {

        const finished = isMissionFinished(mission);

        archiveBtn.innerText = "Archiver";
        archiveBtn.disabled = !finished;

        if (!finished) {
            archiveBtn.title = "Disponible une fois la mission terminée";
        }

        archiveBtn.addEventListener("click", async () => {

            if (!confirm("Archiver cette mission ? Elle sera rangée dans \"Missions archivées\".")) return;

            archiveBtn.disabled = true;

            try {
                await updateMissionInDb(mission.id, { archived: true });
            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'archivage.");
                archiveBtn.disabled = false;
            }

        });

    }

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

    actions.appendChild(modifyBtn);
    actions.appendChild(archiveBtn);
    actions.appendChild(deleteBtn);
    body.appendChild(actions);

    const editForm = buildEditForm(mission);
    editForm.classList.add("mission-edit-form", "hidden");
    body.appendChild(editForm);

    const detail = renderResponseLists(mission, responses, true);
    body.appendChild(detail);

    div.appendChild(body);

    // un seul clic sur le résumé déplie/replie tout le détail
    summary.addEventListener("click", () => {
        body.classList.toggle("hidden");
    });

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
        .filter(([, entry]) => getStatus(entry) === "present")
        .sort((a, b) => a[0].localeCompare(b[0]));

    const absent = entries
        .filter(([, entry]) => getStatus(entry) === "absent")
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
        present.forEach(([login, entry]) => {
            presentBlock.appendChild(buildResponseRow(mission, login, entry, editable));
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
        absent.forEach(([login, entry]) => {
            absentBlock.appendChild(buildResponseRow(mission, login, entry, editable));
        });
    }

    wrap.appendChild(presentBlock);
    wrap.appendChild(absentBlock);

    return wrap;

}

function buildResponseRow(mission, login, entry, editable) {

    const status = getStatus(entry);

    const row = document.createElement("div");
    row.className = "response-row";

    const name = document.createElement("span");
    name.className = "response-name";
    name.innerText = login;

    row.appendChild(name);

    // ===========================
    // Jours réellement effectués
    // (modifiable, uniquement si présent)
    // ===========================

    if (editable && status === "present") {

        const days = getDays(entry, mission);

        const daysInput = document.createElement("input");
        daysInput.type = "number";
        daysInput.min = "0";
        daysInput.className = "days-input";
        daysInput.value = days;
        daysInput.title = "Jours réellement effectués";

        daysInput.addEventListener("click", (e) => e.stopPropagation());

        daysInput.addEventListener("change", async () => {

            const newDays = Math.max(0, parseInt(daysInput.value, 10) || 0);
            daysInput.value = newDays;

            try {
                await setResponseDays(mission.id, login, newDays);
            } catch (err) {
                console.error(err);
                alert("Erreur lors de la mise à jour des jours.");
            }

        });

        const daysLabel = document.createElement("span");
        daysLabel.className = "days-label";
        daysLabel.innerText = "j.";

        row.appendChild(daysInput);
        row.appendChild(daysLabel);

    }

    if (editable) {

        const otherStatus = status === "present" ? "absent" : "present";

        const switchBtn = document.createElement("button");
        switchBtn.className = "small btn-switch";
        switchBtn.innerText =
            status === "present" ? "→ Absent" : "→ Présent";

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

        // ===========================
        // Supprimer la réponse de cette
        // personne (sans supprimer la mission)
        // ===========================

        const removeBtn = document.createElement("button");
        removeBtn.className = "small btn-delete";
        removeBtn.innerText = "Supprimer";

        removeBtn.addEventListener("click", async (e) => {

            e.stopPropagation();

            if (!confirm(`Retirer la réponse de ${login} pour cette mission ?`)) return;

            removeBtn.disabled = true;

            try {
                await removeResponse(mission.id, login);
            } catch (err) {
                console.error(err);
                alert("Erreur lors de la suppression de la réponse.");
                removeBtn.disabled = false;
            }

        });

        row.appendChild(removeBtn);

    }

    return row;

}

// ======================================
// COMPATIBILITE FORMAT DES REPONSES
// Une réponse peut être :
//  - l'ancien format : simple texte "present"/"absent"
//  - le nouveau format : { status, days }
// Ces fonctions lisent les deux indifféremment.
// ======================================

export function getStatus(entry) {

    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") return entry.status;
    return undefined;

}

export function getDays(entry, mission) {

    if (entry && typeof entry === "object" && typeof entry.days === "number") {
        return entry.days;
    }

    const status = getStatus(entry);

    if (status === "present") {
        return missionDurationDays(mission);
    }

    return 0;

}

export function missionDurationDays(mission) {

    if (!mission.start || !mission.end) return 0;

    const start = new Date(mission.start);
    const end = new Date(mission.end);

    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(diffDays, 0);

}

// ======================================
// COMPTEUR DE PRESENCE (commandement)
// Total des jours "présent" par personne,
// toutes missions confondues.
// ======================================

export function renderPresenceCounter(missions) {

    const container = document.getElementById("presenceCounterList");

    if (!container) return;

    // deux totaux distincts par personne :
    // - validated : missions archivées (présence confirmée définitivement)
    // - provisional : missions encore actives (le membre s'est déclaré présent,
    //   mais tant que la mission n'est pas archivée, ça reste prévisionnel)
    const validated = new Map();
    const provisional = new Map();

    missions.forEach((mission) => {

        const responses = mission.responses || {};
        const target = mission.archived ? validated : provisional;

        Object.entries(responses).forEach(([login, entry]) => {

            if (getStatus(entry) !== "present") return;

            const days = getDays(entry, mission);

            target.set(login, (target.get(login) || 0) + days);

        });

    });

    const allLogins = new Set([...validated.keys(), ...provisional.keys()]);

    container.innerHTML = "";

    if (allLogins.size === 0) {
        container.innerHTML = "<p>Aucune donnée de présence pour le moment.</p>";
        return;
    }

    const sorted = [...allLogins].sort((a, b) => {
        const totalA = (validated.get(a) || 0) + (provisional.get(a) || 0);
        const totalB = (validated.get(b) || 0) + (provisional.get(b) || 0);
        return totalB - totalA;
    });

    sorted.forEach((login) => {

        const validDays = validated.get(login) || 0;
        const provDays = provisional.get(login) || 0;
        const total = validDays + provDays;

        const row = document.createElement("div");
        row.className = "response-row";

        row.innerHTML = `
            <span class="response-name">${escapeHtml(login)}</span>
            <span class="presence-split">
                <span class="presence-validated">✓ Validé : ${validDays} j.</span>
                <span class="presence-provisional">◔ Prévisionnel : ${provDays} j.</span>
                <span class="presence-total">= ${total} j. au total</span>
            </span>
        `;

        container.appendChild(row);

    });

}

// ======================================
// Détermine si une mission est terminée
// (date de fin déjà passée), condition pour
// pouvoir l'archiver.
// ======================================

function isMissionFinished(mission) {

    if (!mission.end) return false;

    return mission.end < getTodayIso();

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
