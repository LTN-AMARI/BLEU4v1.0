
// ======================================
// BLEU4 2027 - MISSIONS
// Gestion des missions et des permissions
// ======================================

import {
    setResponse,
    deleteMissionInDb,
    updateMissionInDb,
    setResponseDays,
    removeResponse
} from "./firebase.js";

import {
    isoToFr,
    frToIso,
    autoFormatDateInput,
    getTodayIso
} from "./dateUtils.js";

// ======================================
// PERSONNEL CHARGE EN MEMOIRE
// Permet de retrouver le groupe de chaque
// personne pour filtrer les réponses.
// ======================================

let personnelList = [];

export function setPersonnelList(personnel) {
    personnelList = Array.isArray(personnel) ? personnel : [];
}

function getPersonnelGroup(login) {
    const person = personnelList.find(
        p => normalize(p.login) === normalize(login)
    );

    return person ? String(person.group) : null;
}

function normalize(value) {
    return String(value || "").trim().toUpperCase();
}

// ======================================
// DROITS
// ======================================

function isCDS(user) {
    return user?.profile === "CDS";
}

function isSOA(user) {
    return user?.profile === "SOA";
}

function isCDG(user) {
    return ["CDG1", "CDG2", "CDG3"].includes(user?.profile);
}

function isMember(user) {
    return user?.role === "membre";
}

function canManageMission(mission, user) {

    if (isCDS(user)) return true;

    if (isSOA(user)) return false;

    if (isCDG(user)) {
        return String(mission.group || "") === String(user.group || "");
    }

    return false;
}

function canCreateMission(user) {
    return isCDS(user) || isCDG(user);
}

// ======================================
// FILTRAGE DES MISSIONS
// ======================================

function canSeeMission(mission, user) {

    if (!user) return false;

    // CDS et SOA voient toutes les missions,
    // y compris les anciennes sans groupe.
    if (isCDS(user) || isSOA(user)) return true;

    // CDG : son groupe et les anciennes missions
    // sans groupe (consultation uniquement).
    if (isCDG(user)) {
        if (!mission.group) return true;
        return String(mission.group) === String(user.group);
    }

    // Membres : missions de leur groupe.
    // Les anciennes missions sans groupe restent visibles.
    if (isMember(user)) {
        if (mission.group && String(mission.group) !== String(user.group)) {
            return false;
        }

        return isUserConcerned(mission, user);
    }

    return false;
}

function filterMissions(missions, user) {
    return missions.filter(mission => canSeeMission(mission, user));
}

// ======================================
// VUE : MISSIONS DU JOUR
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

    const visible = filterMissions(missions, user);

    const dayMissions = visible.filter(
        m => m.start && m.end && date >= m.start && date <= m.end
    );

    container.innerHTML = "";

    if (dayMissions.length === 0) {
        container.innerHTML = "<p>Aucune mission ce jour.</p>";
        return;
    }

    dayMissions.forEach(mission => {
        container.appendChild(renderMissionCard(mission, user));
    });
}

// ======================================
// VUE : TOUTES LES MISSIONS
// ======================================

export function renderAllMissions(missions, user) {

    const container = document.getElementById("allMissionsList");
    if (!container) return;

    const active = filterMissions(missions, user)
        .filter(m => !m.archived)
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    container.innerHTML = "";

    if (active.length === 0) {
        container.innerHTML = "<p>Aucune mission créée.</p>";
        return;
    }

    active.forEach(mission => {
        container.appendChild(renderMissionCard(mission, user));
    });
}

// ======================================
// VUE : MISSIONS ARCHIVEES
// ======================================

export function renderArchivedMissions(missions, user) {

    const container = document.getElementById("archivedMissionsList");
    if (!container) return;

    const archived = filterMissions(missions, user)
        .filter(m => m.archived)
        .sort((a, b) => (b.start || "").localeCompare(a.start || ""));

    container.innerHTML = "";

    if (archived.length === 0) {
        container.innerHTML = "<p>Aucune mission archivée.</p>";
        return;
    }

    archived.forEach(mission => {
        container.appendChild(renderMissionCard(mission, user));
    });
}

// ======================================
// CARTE MISSION
// ======================================

function renderMissionCard(mission, user) {

    const responses = mission.responses || {};
    const myStatus = getStatus(responses[user.login]);

    const div = document.createElement("div");
    div.className = "mission";

    const manageable = canManageMission(mission, user);

    // ==================================
    // MEMBRE
    // ==================================

    if (isMember(user)) {

        div.innerHTML = `
            <h3>${escapeHtml(mission.title)}</h3>
            ${mission.description ? `<p>${escapeHtml(mission.description)}</p>` : ""}
            <p><strong>Lieu :</strong> ${escapeHtml(mission.location || "—")}</p>
            <p><strong>Concernés :</strong> ${escapeHtml(mission.concerned || "Tous")}</p>
            <p><strong>Période :</strong> ${isoToFr(mission.start)} → ${isoToFr(mission.end)}</p>
        `;

        if (mission.group) {
            const groupLabel = document.createElement("p");
            groupLabel.innerHTML = `<strong>Groupe :</strong> ${escapeHtml(mission.group)}`;
            div.appendChild(groupLabel);
        }

        if (mission.patracdr) {
            addPatracdrToggle(div, mission.patracdr);
        }

        const actions = document.createElement("div");
        actions.className = "actions";

        const presentBtn = document.createElement("button");
        presentBtn.className = "btn-present";
        presentBtn.innerText = myStatus === "present" ? "✔ Présent" : "Présent";

        presentBtn.addEventListener("click", async () => {
            await submitResponse(mission, user, "present", presentBtn);
        });

        const absentBtn = document.createElement("button");
        absentBtn.className = "btn-absent";
        absentBtn.innerText = myStatus === "absent" ? "✔ Indisponible" : "Indisponible";

        absentBtn.addEventListener("click", async () => {
            await submitResponse(mission, user, "absent", absentBtn);
        });

        actions.append(presentBtn, absentBtn);
        div.appendChild(actions);

        div.appendChild(renderResponseLists(mission, responses, false, user));

        return div;
    }

    // ==================================
    // COMMANDEMENT : RESUME
    // ==================================

    const entries = Object.entries(responses);

    const presentCount = entries.filter(
        ([, entry]) => getStatus(entry) === "present"
    ).length;

    const absentCount = entries.filter(
        ([, entry]) => getStatus(entry) === "absent"
    ).length;

    const summary = document.createElement("div");
    summary.className = "mission-summary";

    summary.innerHTML = `
        <span class="mission-summary-title">${escapeHtml(mission.title)}</span>
        <span class="mission-summary-dates">${isoToFr(mission.start)} → ${isoToFr(mission.end)}</span>
        <span class="mission-summary-counts">✓ ${presentCount} · ✕ ${absentCount}</span>
        ${mission.group ? `<span class="mission-summary-group">Groupe ${escapeHtml(mission.group)}</span>` : ""}
        ${!mission.group ? `<span class="mission-summary-group">Ancienne mission</span>` : ""}
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
        addPatracdrToggle(body, mission.patracdr);
    }

    // ==================================
    // ACTIONS SELON LES DROITS
    // ==================================

    if (manageable) {

        const actions = document.createElement("div");
        actions.className = "actions";

        const modifyBtn = document.createElement("button");
        modifyBtn.className = "btn-switch";
        modifyBtn.innerText = "Modifier";

        const editForm = buildEditForm(mission);
        editForm.classList.add("mission-edit-form", "hidden");

        modifyBtn.addEventListener("click", e => {
            e.stopPropagation();
            editForm.classList.toggle("hidden");
        });

        const archiveBtn = document.createElement("button");
        archiveBtn.className = "small btn-switch";

        if (mission.archived) {

            archiveBtn.innerText = "Désarchiver";

            archiveBtn.addEventListener("click", async e => {
                e.stopPropagation();

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

            archiveBtn.innerText = "Archiver";
            archiveBtn.disabled = !isMissionFinished(mission);

            if (!isMissionFinished(mission)) {
                archiveBtn.title = "Disponible une fois la mission terminée";
            }

            archiveBtn.addEventListener("click", async e => {
                e.stopPropagation();

                if (!confirm("Archiver cette mission ?")) return;

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

        deleteBtn.addEventListener("click", async e => {
            e.stopPropagation();

            if (!confirm("Supprimer définitivement cette mission ?")) return;

            deleteBtn.disabled = true;

            try {
                await deleteMissionInDb(mission.id);
            } catch (err) {
                console.error(err);
                alert("Erreur lors de la suppression.");
                deleteBtn.disabled = false;
            }
        });

        actions.append(modifyBtn, archiveBtn, deleteBtn);
        body.appendChild(actions);
        body.appendChild(editForm);
    } else {
        const readOnly = document.createElement("p");
        readOnly.className = "muted";
        readOnly.innerText = isSOA(user)
            ? "Consultation uniquement — profil SOA"
            : "Consultation uniquement — mission sans groupe attribué";
        body.appendChild(readOnly);
    }

    body.appendChild(renderResponseLists(mission, responses, manageable, user));

    div.appendChild(body);

    summary.addEventListener("click", () => {
        body.classList.toggle("hidden");
    });

    return div;
}

// ======================================
// REPONSE MEMBRE
// ======================================

async function submitResponse(mission, user, status, button) {

    if (!isUserConcerned(mission, user)) {
        alert("Tu n'es pas concerné par cette mission.");
        return;
    }

    button.disabled = true;

    try {
        await setResponse(mission.id, user.login, status);
    } catch (err) {
        console.error(err);
        alert("Erreur lors de l'enregistrement de la réponse.");
    } finally {
        button.disabled = false;
    }
}

// ======================================
// PATRACDR
// ======================================

function addPatracdrToggle(container, patracdr) {

    const toggle = document.createElement("button");
    toggle.className = "small btn-switch patracdr-toggle-btn";
    toggle.innerText = "Voir PATRACDR";

    const block = buildPatracdrBlock(patracdr);
    block.classList.add("hidden");

    toggle.addEventListener("click", e => {
        e.stopPropagation();
        block.classList.toggle("hidden");
    });

    container.append(toggle, block);
}

function buildPatracdrBlock(patracdr) {

    const block = document.createElement("div");
    block.className = "patracdr-block";

    block.addEventListener("click", e => e.stopPropagation());

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
        fields.map(([label, value]) =>
            `<p><strong>${label} :</strong> ${escapeHtml(value || "—")}</p>`
        ).join("");

    return block;
}

// ======================================
// FORMULAIRE MODIFICATION MISSION
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
                    value="${isoToFr(mission.start)}">
            </div>
            <div>
                <label>Date fin</label>
                <input type="text" class="edit-end" inputmode="numeric" maxlength="10"
                    value="${isoToFr(mission.end)}">
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

    form.addEventListener("click", e => e.stopPropagation());

    const patracdrToggle = form.querySelector(".edit-patracdr-toggle");
    const patracdrFields = form.querySelector(".edit-patracdr-fields");

    patracdrToggle.addEventListener("change", () => {
        patracdrFields.classList.toggle("hidden", !patracdrToggle.checked);
    });

    const startInput = form.querySelector(".edit-start");
    const endInput = form.querySelector(".edit-end");

    autoFormatDateInput(startInput);
    autoFormatDateInput(endInput);

    const actions = form.querySelector(".actions");

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

        const start = frToIso(startInput.value);
        const end = frToIso(endInput.value);

        if (!title) {
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

        saveBtn.disabled = true;

        try {

            const fields = {
                title,
                description,
                location,
                concerned,
                start,
                end
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

    actions.append(saveBtn, cancelBtn);

    return form;
}

// ======================================
// LISTES DES REPONSES
// ======================================

function renderResponseLists(mission, responses, editable, user) {

    const wrap = document.createElement("div");
    wrap.className = "list";

    let entries = Object.entries(responses);

    // Pour les missions attribuées à un groupe,
    // les CDG et membres ne voient que les réponses
    // des personnes enregistrées dans ce groupe.
    if (mission.group && (isCDG(user) || isMember(user))) {
        entries = entries.filter(([login]) =>
            getPersonnelGroup(login) === String(mission.group)
        );
    }

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

    wrap.appendChild(buildResponseGroup(
        mission, present, "Présents", "present", editable
    ));

    wrap.appendChild(buildResponseGroup(
        mission, absent, "Absents", "absent", editable
    ));

    return wrap;
}

function buildResponseGroup(mission, entries, label, type, editable) {

    const block = document.createElement("div");
    block.className = "response-group";

    const title = document.createElement("h4");
    title.className = `response-group-title ${type}`;
    title.innerText = `${label} (${entries.length})`;

    block.appendChild(title);

    if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.innerText = "Aucun";
        block.appendChild(empty);
    } else {
        entries.forEach(([login, entry]) => {
            block.appendChild(buildResponseRow(mission, login, entry, editable));
        });
    }

    return block;
}

function buildResponseRow(mission, login, entry, editable) {

    const status = getStatus(entry);

    const row = document.createElement("div");
    row.className = "response-row";

    const name = document.createElement("span");
    name.className = "response-name";
    name.innerText = login;

    row.appendChild(name);

    if (editable && status === "present") {

        const daysInput = document.createElement("input");
        daysInput.type = "number";
        daysInput.min = "0";
        daysInput.className = "days-input";
        daysInput.value = getDays(entry, mission);
        daysInput.title = "Jours réellement effectués";

        daysInput.addEventListener("click", e => e.stopPropagation());

        daysInput.addEventListener("change", async () => {

            const days = Math.max(0, parseInt(daysInput.value, 10) || 0);
            daysInput.value = days;

            try {
                await setResponseDays(mission.id, login, days);
            } catch (err) {
                console.error(err);
                alert("Erreur lors de la mise à jour des jours.");
            }
        });

        const daysLabel = document.createElement("span");
        daysLabel.className = "days-label";
        daysLabel.innerText = "j.";

        row.append(daysInput, daysLabel);
    }

    if (editable) {

        const otherStatus = status === "present" ? "absent" : "present";

        const switchBtn = document.createElement("button");
        switchBtn.className = "small btn-switch";
        switchBtn.innerText = status === "present" ? "→ Absent" : "→ Présent";

        switchBtn.addEventListener("click", async e => {
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

        const removeBtn = document.createElement("button");
        removeBtn.className = "small btn-delete";
        removeBtn.innerText = "Supprimer";

        removeBtn.addEventListener("click", async e => {
            e.stopPropagation();

            if (!confirm(`Retirer la réponse de ${login} ?`)) return;

            removeBtn.disabled = true;

            try {
                await removeResponse(mission.id, login);
            } catch (err) {
                console.error(err);
                alert("Erreur lors de la suppression de la réponse.");
                removeBtn.disabled = false;
            }
        });

        row.append(switchBtn, removeBtn);
    }

    return row;
}

// ======================================
// STATUT ET JOURS
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

    if (getStatus(entry) === "present") {
        return missionDurationDays(mission);
    }

    return 0;
}

export function missionDurationDays(mission) {

    if (!mission.start || !mission.end) return 0;

    const start = new Date(`${mission.start}T00:00:00`);
    const end = new Date(`${mission.end}T00:00:00`);

    const diff = Math.round((end - start) / 86400000) + 1;

    return Math.max(diff, 0);
}

// ======================================
// COMPTEUR DE PRESENCE
// ======================================

export function renderPresenceCounter(missions, user = null) {

    const container = document.getElementById("presenceCounterList");
    if (!container) return;

    const validated = new Map();
    const provisional = new Map();

    const visibleMissions = user
        ? filterMissions(missions, user)
        : missions;

    visibleMissions.forEach(mission => {

        const responses = mission.responses || {};
        const target = mission.archived ? validated : provisional;

        Object.entries(responses).forEach(([login, entry]) => {

            if (getStatus(entry) !== "present") return;

            if (user && isCDG(user) && getPersonnelGroup(login) !== String(user.group)) {
                return;
            }

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

    sorted.forEach(login => {

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
// MISSIONS TERMINEES
// ======================================

function isMissionFinished(mission) {
    if (!mission.end) return false;
    return mission.end < getTodayIso();
}

// ======================================
// PERSONNE CONCERNEE
// ======================================

export function isUserConcerned(mission, user) {

    if (!user) return false;

    const concerned = String(mission.concerned || "Tous").trim();

    if (!concerned || concerned.toLowerCase() === "tous") {
        return true;
    }

    const list = concerned
        .split(",")
        .map(s => normalize(s))
        .filter(Boolean);

    return list.includes(normalize(user.login));
}

// ======================================
// UTILITAIRES HTML
// ======================================

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

function escapeAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
