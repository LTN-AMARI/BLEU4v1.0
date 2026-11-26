
// ======================================
// BLEU4 2027 - CALENDRIER
// Dates Firebase : AAAA-MM-JJ
// ======================================

import { isoToFr, getTodayIso } from "./dateUtils.js";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril",
    "Mai", "Juin", "Juillet", "Août",
    "Septembre", "Octobre", "Novembre", "Décembre"
];

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let missions = [];
let selectedDate = getTodayIso();

const COLORS = [
    "#f1c40f",
    "#3498db",
    "#2ecc71",
    "#e67e22",
    "#9b59b6"
];

// ======================================
// INITIALISATION
// ======================================

export function initCalendar(callback) {
    const previous = document.getElementById("prevMonth");
    const next = document.getElementById("nextMonth");

    previous?.addEventListener("click", () => {
        currentMonth--;

        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }

        renderCalendar();
    });

    next?.addEventListener("click", () => {
        currentMonth++;

        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }

        renderCalendar();
    });

    renderCalendar();

    if (callback) {
        callback(selectedDate);
    }
}

// ======================================
// DONNEES
// ======================================

export function setCalendarMissions(newMissions) {
    missions = Array.isArray(newMissions) ? newMissions : [];
    renderCalendar();
}

export function getSelectedDate() {
    return selectedDate;
}

// ======================================
// OUTILS
// ======================================

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    // Lundi = 0, dimanche = 6
    return (new Date(year, month, 1).getDay() + 6) % 7;
}

function isMissionOnDate(mission, dateIso) {
    if (!mission.start) return false;

    const start = mission.start;
    const end = mission.end || mission.start;

    return dateIso >= start && dateIso <= end;
}

function getMissionCount(dateIso) {
    return missions.filter(mission =>
        isMissionOnDate(mission, dateIso)
    ).length;
}

// ======================================
// AFFICHAGE
// ======================================

export function renderCalendar() {
    const calendar = document.getElementById("calendar");
    const monthTitle = document.getElementById("monthTitle");

    if (!calendar || !monthTitle) return;

    monthTitle.textContent =
        `${MONTHS[currentMonth]} ${currentYear}`;

    calendar.innerHTML = "";

    const firstDay = getFirstDayOfMonth(
        currentYear,
        currentMonth
    );

    const daysInMonth = getDaysInMonth(
        currentYear,
        currentMonth
    );

    const today = getTodayIso();

    // Cases vides avant le premier jour
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        calendar.appendChild(empty);
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const dateIso = [
            currentYear,
            String(currentMonth + 1).padStart(2, "0"),
            String(day).padStart(2, "0")
        ].join("-");

        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.textContent = day;

        if (dateIso === today) {
            cell.classList.add("today");
        }

        if (dateIso === selectedDate) {
            cell.classList.add("selected");
        }

        const count = getMissionCount(dateIso);

        if (count > 0) {
            cell.classList.add("has-mission");

            const dot = document.createElement("span");
            dot.className = "mission-dot";
            dot.textContent = count > 1 ? count : "";
            cell.appendChild(dot);
        }

        cell.addEventListener("click", () => {
            selectedDate = dateIso;

            renderCalendar();

            const title = document.getElementById("selectedDateTitle");

            if (title) {
                title.textContent = `Missions du ${isoToFr(dateIso)}`;
            }

            document.dispatchEvent(
                new CustomEvent("bleu4-date-selected", {
                    detail: { date: dateIso }
                })
            );
        });

        calendar.appendChild(cell);
    }

    // Mise à jour du titre de la date sélectionnée
    const title = document.getElementById("selectedDateTitle");

    if (title && selectedDate) {
        title.textContent = `Missions du ${isoToFr(selectedDate)}`;
    }
}

// ======================================
// SELECTION EXTERNE
// ======================================

export function selectCalendarDate(dateIso) {
    if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
        return;
    }

    selectedDate = dateIso;

    const [year, month] = dateIso.split("-").map(Number);

    currentYear = year;
    currentMonth = month - 1;

    renderCalendar();
}
