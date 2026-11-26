// ======================================
// BLEU4 2027 - CONNEXION
// ======================================

const loginInput = document.getElementById("login");
const roleSelect = document.getElementById("role");
const groupBox = document.getElementById("groupBox");
const groupSelect = document.getElementById("group");
const passwordBox = document.getElementById("passwordBox");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("loginError");

// Codes des profils commandement
const COMMAND_PROFILES = {
    CDS: "scorpion2027",
    SOA: "bleucdt",
    CDG1: "bleu41",
    CDG2: "bleu42",
    CDG3: "bleu43"
};

// Si une session existe déjà, ouvrir l'application
const existingUser = JSON.parse(
    localStorage.getItem("BLEU4_USER") || "null"
);

if (existingUser) {
    window.location.replace("app.html");
}

// ======================================
// AFFICHAGE SELON LE TYPE DE CONNEXION
// ======================================

function updateLoginForm() {
    const isCommandement = roleSelect.value === "commandement";

    passwordBox.style.display = isCommandement ? "block" : "none";
    groupBox.style.display = isCommandement ? "none" : "block";

    loginInput.value = "";
    passwordInput.value = "";
    groupSelect.value = "";
    loginError.textContent = "";

    loginInput.placeholder = isCommandement
        ? "CDS, SOA, CDG1, CDG2 ou CDG3"
        : "Exemple : SGT DUPONT";
}

roleSelect.addEventListener("change", updateLoginForm);

// ======================================
// CONNEXION
// ======================================

function login() {
    const login = loginInput.value.trim().toUpperCase();
    const selectedRole = roleSelect.value;

    loginError.textContent = "";

    if (!login) {
        loginError.textContent = "Saisis ton identifiant.";
        return;
    }

    // ------------------------------
    // CONNEXION MEMBRE
    // ------------------------------

    if (selectedRole === "membre") {
        const group = groupSelect.value;

        if (!group) {
            loginError.textContent = "Choisis ton groupe.";
            return;
        }

        const user = {
            login,
            role: "membre",
            group
        };

        localStorage.setItem("BLEU4_USER", JSON.stringify(user));

        window.location.href = "app.html";
        return;
    }

    // ------------------------------
    // CONNEXION COMMANDEMENT
    // ------------------------------

    const expectedPassword = COMMAND_PROFILES[login];

    if (!expectedPassword) {
        loginError.textContent = "Identifiant commandement inconnu.";
        return;
    }

    if (passwordInput.value !== expectedPassword) {
        loginError.textContent = "Code commandement incorrect.";
        return;
    }

    const user = {
        login,
        role: "commandement",
        profile: login,
        group: login.startsWith("CDG")
            ? login.replace("CDG", "")
            : null
    };

    localStorage.setItem("BLEU4_USER", JSON.stringify(user));

    window.location.href = "app.html";
}

// ======================================
// ÉVÉNEMENTS
// ======================================

btnLogin.addEventListener("click", login);

loginInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        if (roleSelect.value === "commandement") {
            passwordInput.focus();
        } else {
            login();
        }
    }
});

passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        login();
    }
});

groupSelect.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        login();
    }
});

// Initialisation
updateLoginForm();
