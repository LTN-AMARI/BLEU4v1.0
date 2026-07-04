const roleSelect = document.getElementById("role");
const passwordBox = document.getElementById("passwordBox");
const loginInput = document.getElementById("login");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");

// Afficher / cacher mot de passe si commandement
roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "commandement") {
        passwordBox.style.display = "block";
    } else {
        passwordBox.style.display = "none";
    }
});

// LOGIN
btnLogin.addEventListener("click", () => {

    const login = loginInput.value.trim().toUpperCase();
    const role = roleSelect.value;
    const password = passwordInput.value;

    if (!login) {
        alert("Veuillez entrer GRADE NOM");
        return;
    }

    // sécurité commandement
    if (role === "commandement") {
        if (password !== "BLEU4ADMIN") {
            alert("Mot de passe incorrect");
            return;
        }
    }

    // création utilisateur
    const user = {
        login: login,
        role: role
    };

    // sauvegarde locale
    localStorage.setItem("BLEU4_USER", JSON.stringify(user));

    // redirection vers app
    window.location.href = "app.html";
});
