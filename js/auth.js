// ======================================
// BLEU4 v2 - AUTH (page de connexion)
// ======================================

const loginInput = document.getElementById("login");
const roleSelect = document.getElementById("role");
const passwordBox = document.getElementById("passwordBox");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");

// ⚠️ Sécurité "front-end only" : suffisant pour filtrer
// l'accès dans une petite équipe, mais pas un vrai rempart.
// Si besoin d'une vraie sécurité, il faudra passer par
// Firebase Auth plus tard.
const COMMANDEMENT_CODE = "BLEU4ADMIN";

// ======================================
// Si déjà connecté, redirection directe
// ======================================

const existingUser = JSON.parse(localStorage.getItem("BLEU4_USER") || "null");

if (existingUser) {
    window.location.href = "app.html";
}

// ======================================
// Afficher le champ mot de passe
// uniquement pour le commandement
// ======================================

roleSelect.addEventListener("change", () => {

    passwordBox.style.display =
        roleSelect.value === "commandement" ? "block" : "none";

});

// ======================================
// Connexion
// ======================================

btnLogin.addEventListener("click", () => {

    const login = loginInput.value.trim().toUpperCase();
    const role = roleSelect.value;
    const password = passwordInput.value;

    if (!login) {
        alert("Entre ton GRADE NOM");
        return;
    }

    if (role === "commandement" && password !== COMMANDEMENT_CODE) {
        alert("Code commandement incorrect");
        return;
    }

    const user = { login, role };

    localStorage.setItem("BLEU4_USER", JSON.stringify(user));

    window.location.href = "app.html";

});

// Permet aussi de valider avec la touche Entrée
passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnLogin.click();
});

loginInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnLogin.click();
});
