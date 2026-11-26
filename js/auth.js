
// ======================================
// BLEU4 2027 - AUTHENTIFICATION
// Membres : grade + nom + groupe
// Commandement : profil + code
// ======================================

const COMMAND_PROFILES = {
    CDS: "scorpion2027",
    SOA: "bleucdt",
    CDG1: "bleu41",
    CDG2: "bleu42",
    CDG3: "bleu43"
};

// ======================================
// ELEMENTS HTML
// ======================================

const roleSelect = document.getElementById("role");
const loginInput = document.getElementById("login");

const groupBox = document.getElementById("groupBox");
const groupSelect = document.getElementById("group");

const passwordBox = document.getElementById("passwordBox");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

// ======================================
// AFFICHAGE DU FORMULAIRE
// ======================================

function updateLoginForm() {
    const role = roleSelect?.value;

    if (groupBox) {
        groupBox.style.display =
            role === "membre" ? "block" : "none";
    }

    if (passwordBox) {
        passwordBox.style.display =
            role === "commandement" ? "block" : "none";
    }

    if (loginInput) {
        loginInput.placeholder =
            role === "commandement"
                ? "CDS, SOA, CDG1, CDG2 ou CDG3"
                : "Ex : SDT PINGOUIN";
    }

    if (loginError) {
        loginError.textContent = "";
    }
}

roleSelect?.addEventListener("change", updateLoginForm);

// ======================================
// ERREUR
// ======================================

function showError(message) {
    if (loginError) {
        loginError.textContent = message;
    } else {
        alert(message);
    }
}

// ======================================
// CONNEXION
// ======================================

function login() {
    const role = roleSelect?.value;
    const loginValue = loginInput?.value.trim();

    if (!loginValue) {
        showError("Saisis ton grade et ton nom ou ton profil.");
        return;
    }

    // ----------------------------------
    // CONNEXION MEMBRE
    // ----------------------------------

    if (role === "membre") {
        const group = groupSelect?.value;

        if (!["1", "2", "3"].includes(String(group))) {
            showError("Sélectionne ton groupe.");
            return;
        }

        const user = {
            login: loginValue,
            role: "membre",
            group: String(group)
        };

        localStorage.setItem("BLEU4_USER", JSON.stringify(user));

        window.location.href = "app.html";
        return;
    }

    // ----------------------------------
    // CONNEXION COMMANDEMENT
    // ----------------------------------

    if (role === "commandement") {
        const profile = loginValue.toUpperCase();
        const password = passwordInput?.value || "";

        if (!Object.prototype.hasOwnProperty.call(COMMAND_PROFILES, profile)) {
            showError("Profil commandement inconnu.");
            return;
        }

        if (password !== COMMAND_PROFILES[profile]) {
            showError("Code incorrect.");
            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.focus();
            }
            return;
        }

        let group = null;

        if (profile.startsWith("CDG")) {
            group = profile.replace("CDG", "");
        }

        const user = {
            login: profile,
            role: "commandement",
            profile,
            group
        };

        localStorage.setItem("BLEU4_USER", JSON.stringify(user));

        window.location.href = "app.html";
        return;
    }

    showError("Sélectionne un type de connexion valide.");
}

// ======================================
// EVENEMENTS
// ======================================

loginButton?.addEventListener("click", login);

passwordInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
});

loginInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        if (roleSelect?.value === "membre") {
            login();
        } else {
            passwordInput?.focus();
        }
    }
});

// ======================================
// INITIALISATION
// ======================================

updateLoginForm();
