const loggedInEmail = localStorage.getItem("isLoggedIn");
let allUsers = [];
try {
  allUsers = JSON.parse(localStorage.getItem("users")) || [];
} catch (err) {
  allUsers = [];
}
const currentUser = allUsers.find((u) => u.email === loggedInEmail);

const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const heroSignInBtn = document.getElementById("heroSignInBtn");

if (currentUser) {
  userName.textContent = currentUser.name;
  userInfo.style.display = "flex";
  if (heroSignInBtn) heroSignInBtn.style.display = "none";
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loginTime");
  window.location.href = "login.html";
});
