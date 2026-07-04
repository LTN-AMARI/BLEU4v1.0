// ======================================
// BLEU4 v2 - CALENDAR
// ======================================

const MONTHS = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
];

let currentDate = new Date();

let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let missions = {};

window.selectedDate = null;

// ======================================
// COULEURS DES MISSIONS
// ======================================

const COLORS = [
    "#1976D2",
    "#388E3C",
    "#D32F2F",
    "#F9A825",
    "#7B1FA2",
    "#0097A7",
    "#F57C00",
    "#5D4037",
    "#455A64",
    "#C2185B"
];

// ======================================
// API
// ======================================

window.setCalendarMissions = function(data){

    missions = data || {};

    renderCalendar();

}

// ======================================

document.getElementById("prevMonth").onclick = () => {

    currentMonth--;

    if(currentMonth < 0){

        currentMonth = 11;
        currentYear--;

    }

    renderCalendar();

};

document.getElementById("nextMonth").onclick = () => {

    currentMonth++;

    if(currentMonth > 11){

        currentMonth = 0;
        currentYear++;

    }

    renderCalendar();

};

// ======================================
// RENDER
// ======================================

window.renderCalendar = function(){

    const calendar = document.getElementById("calendar");
    const title = document.getElementById("monthTitle");

    if(!calendar) return;

    calendar.innerHTML = "";

    title.innerText = MONTHS[currentMonth] + " " + currentYear;

    const firstDay = new Date(currentYear,currentMonth,1);

    let start = firstDay.getDay();

    // lundi = premier jour

    start = start === 0 ? 6 : start-1;

    const days = new Date(currentYear,currentMonth+1,0).getDate();

    // jours vides

    for(let i=0;i<start;i++){

        const empty = document.createElement("div");
        empty.className = "day empty";

        calendar.appendChild(empty);

    }

    // jours du mois

    for(let d=1; d<=days; d++){

        const day = document.createElement("div");

        day.className = "day";

        const date =
            currentYear+"-"+
            String(currentMonth+1).padStart(2,"0")+"-"+
            String(d).padStart(2,"0");

        day.dataset.date = date;

        // aujourd'hui

        const today = new Date();

        if(
            today.getDate()===d &&
            today.getMonth()===currentMonth &&
            today.getFullYear()===currentYear
        ){
            day.classList.add("today");
        }

        // numéro

        const number = document.createElement("div");
        number.className = "day-number";
        number.innerText = d;

        day.appendChild(number);

        // pastilles missions

        const dots = document.createElement("div");
        dots.className = "dots";

        let colorIndex = 0;

        Object.values(missions).forEach(m=>{

            if(!m.start || !m.end) return;

            if(date>=m.start && date<=m.end){

                const dot = document.createElement("div");

                dot.className="dot";

                dot.style.background =
                    COLORS[colorIndex % COLORS.length];

                dots.appendChild(dot);

                colorIndex++;

            }

        });

        day.appendChild(dots);

        // clic

        day.onclick=()=>{

            window.selectedDate=date;

            document
                .querySelectorAll(".day")
                .forEach(x=>x.classList.remove("selected"));

            day.classList.add("selected");

            if(window.renderMissionList){

                window.renderMissionList(date);

            }

        };

        calendar.appendChild(day);

    }

};

// ======================================
// PREMIER AFFICHAGE
// ======================================

renderCalendar();
