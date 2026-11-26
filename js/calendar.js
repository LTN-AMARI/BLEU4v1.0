
// ======================================
// BLEU4 v2 - CALENDRIER 2027
// ======================================

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril",
    "Mai", "Juin", "Juillet", "Août",
    "Septembre", "Octobre", "Novembre", "Décembre"
];

const COLORS = [
    "#1976D2", "#388E3C", "#D32F2F", "#F9A825",
    "#7B1FA2", "#0097A7", "#F57C00", "#5D4037",
    "#455A64", "#C2185B"
];

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let missions = [];
let selectedDate = null;
let onSelectCallback = null;

// ======================================
// INITIALISATION
// ======================================

export function initCalendar(onDateSelected) {

    onSelectCallback = onDateSelected;

    const previous = document.getElementById("prevMonth");
    const next = document.getElementById("nextMonth");

    if (previous) {
        previous.addEventListener("click", () => {

            currentMonth--;

            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }

            renderCalendar();
        });
    }

    if (next) {
        next.addEventListener("click", () => {

            currentMonth++;

            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }

            renderCalendar();
        });
    }

    renderCalendar();
}

// ======================================
// MISSIONS
// ======================================

export function setCalendarMissions(newMissions) {

    missions = Array.isArray(newMissions)
        ? newMissions
        : [];

    renderCalendar();
}

// ======================================
// DATE SELECTIONNEE
// ======================================

export function getSelectedDate() {

    return selectedDate;
}

// ======================================
// RENDU DU CALENDRIER
// ======================================

function renderCalendar() {

    const calendar = document.getElementById("calendar");
    const title = document.getElementById("monthTitle");

    if (!calendar || !title) return;

    calendar.innerHTML = "";

    title.innerText =
        `${MONTHS[currentMonth]} ${currentYear}`;

    const firstDay = new Date(
        currentYear,
        currentMonth,
        1
    );

    let start = firstDay.getDay();

    // Lundi = premier jour
    start = start === 0 ? 6 : start - 1;

    const daysInMonth = new Date(
        currentYear,
        currentMonth + 1,
        0
    ).getDate();

    // ==================================
    // JOURS VIDES AVANT LE 1ER
    // ==================================

    for (let i = 0; i < start; i++) {

        const empty = document.createElement("div");

        empty.className = "day empty";

        calendar.appendChild(empty);
    }

    const today = new Date();

    // ==================================
    // JOURS DU MOIS
    // ==================================

    for (let d = 1; d <= daysInMonth; d++) {

        const day = document.createElement("div");

        day.className = "day";

        const date =
            `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        day.dataset.date = date;

        // Date du jour
        if (
            today.getDate() === d &&
            today.getMonth() === currentMonth &&
            today.getFullYear() === currentYear
        ) {
            day.classList.add("today");
        }

        // Date sélectionnée
        if (date === selectedDate) {
            day.classList.add("selected");
        }

        // Numéro du jour
        const number = document.createElement("div");

        number.className = "day-number";
        number.innerText = d;

        day.appendChild(number);

        // ==================================
        // PASTILLES DES MISSIONS
        // ==================================

        const dots = document.createElement("div");

        dots.className = "dots";

        missions.forEach((mission, index) => {

            if (!mission.start || !mission.end) return;

            if (
                date >= mission.start &&
                date <= mission.end
            ) {

                const dot = document.createElement("div");

                dot.className = "dot";

                dot.style.background =
                    COLORS[index % COLORS.length];

                dots.appendChild(dot);
            }
        });

        day.appendChild(dots);

        // ==================================
        // SELECTION D'UNE DATE
        // ==================================

        day.addEventListener("click", () => {

            selectedDate = date;

            document
                .querySelectorAll(".day")
                .forEach(element => {
                    element.classList.remove("selected");
                });

            day.classList.add("selected");

            if (onSelectCallback) {
                onSelectCallback(date);
            }
        });

        calendar.appendChild(day);
    }
}
