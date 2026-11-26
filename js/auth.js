
// ======================================
// BLEU4 2027 - AUTHENTIFICATION
// Membres : grade + nom + groupe
// Commandement : profil + code + grade + nom
// ======================================

// CONSERVE ICI TES CODES ACTUELS
const COMMAND_PROFILES = {
    CDS: "scorpion",
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
// CHAMP GRADE ET NOM
// Ajout automatique sans modifier index.html
// ======================================

let commandNameInput = document.getElementById("commandName");

if (!commandNameInput && loginInput) {
    const wrapper = document.createElement("div");
    wrapper.id = "commandNameBox";
    wrapper.style.display = "none";
    wrapper.style.marginTop = "10px";

    const label = document.createElement("label");
    label.htmlFor = "commandName";
    label.textContent = "GRADE ET NOM";

    commandNameInput = document.createElement("input");
    commandNameInput.id = "commandName";
    commandNameInput.type = "text";
    commandNameInput.placeholder = "Ex : LTN AMARI";
    commandNameInput.autocomplete = "name";
    commandNameInput.style.width = "100%";

    wrapper.appendChild(label);
    wrapper.appendChild(commandNameInput);

    loginInput.insertAdjacentElement("afterend", wrapper);
}

const commandNameBox = document.getElementById("commandNameBox");

// ======================================
// AFFICHAGE DU FORMULAIRE
// ======================================

function updateLoginForm() {
    const role = roleSelect?.value;
    const isCommand = role === "commandement";

    if (groupBox) {
        groupBox.style.display = role === "membre" ? "block" : "none";
    }

    if (passwordBox) {
        passwordBox.style.display = isCommand ? "block" : "none";
    }

    if (commandNameBox) {
        commandNameBox.style.display = isCommand ? "block" : "none";
    }

    if (loginInput) {
        loginInput.placeholder = isCommand
            ? "CDS, SOA, CDG1, CDG2 ou CDG3"
            : "Ex : SDT PINGOUIN";
    }

    if (loginError) loginError.textContent = "";
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

    // MEMBRE
    if (role === "membre") {
        const group = groupSelect?.value;

        if (!["1", "2", "3"].includes(String(group))) {
            showError("Sélectionne ton groupe.");
            return;
        }

        const user = {
            login: loginValue,
            displayName: loginValue,
            role: "membre",
            group: String(group)
        };

        localStorage.setItem("BLEU4_USER", JSON.stringify(user));
        window.location.href = "app.html";
        return;
    }

    // COMMANDEMENT
    if (role === "commandement") {
        const profile = loginValue.toUpperCase();
        const password = passwordInput?.value || "";
        const displayName = commandNameInput?.value.trim() || "";

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

        if (!displayName) {
            showError("Renseigne ton grade et ton nom.");
            commandNameInput?.focus();
            return;
        }

        let group = null;

        if (profile.startsWith("CDG")) {
            group = profile.replace("CDG", "");
        }

        const user = {
            login: profile,
            displayName,
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

commandNameInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
});

loginInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        if (roleSelect?.value === "membre") {
            login();
        } else {
            commandNameInput?.focus();
        }
    }
});

// ======================================
// INITIALISATION
// ======================================

updateLoginForm();
