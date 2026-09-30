const logoutButton=document.getElementById("logoutButton");
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
});
