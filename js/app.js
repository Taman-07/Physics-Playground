const authModal = document.getElementById("authModal");
const modalTitle = document.getElementById("modalTitle");
const authForm = document.getElementById("authForm");


function openAuthModal(title) {
    if (!authModal) return;
    modalTitle.textContent = title;
    authModal.classList.add("open");
}

function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove("open");
}

const authButtons = document.querySelectorAll("[data-auth-title]");
authButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const title = button.dataset.authTitle;
        openAuthModal(title);
    });
});

const closeButton = document.querySelector(".auth-close");
        if (closeButton) {
            closeButton.addEventListener("click", closeAuthModal);
        }

        if (authModal) {
            authModal.addEventListener("click", (event) => {
                if (event.target === authModal) {
                closeAuthModal();
            }
        });
        }
        document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
        closeAuthModal();
        }
});


if (authForm) {
    authForm.addEventListener("submit", (event) => {
        event.preventDefault();
        window.location.href = "login.html";
    });
}


const glow = document.getElementById("glow");
document.addEventListener("mousemove", (event) => {
    if (!glow) return;
    glow.style.left = event.clientX + "px";
    glow.style.top = event.clientY + "px";
});


const model = document.querySelector(".quantum-model");
let isDragging = false;
let startX = 0;
let startY = 0;
let rotationX = 0;
let rotationY = 0;

if (model) {
    model.addEventListener("mousedown", (event) => {
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
    });

    document.addEventListener("mousemove", (event) => {
        if (!isDragging || !model) return;
        const moveX = event.clientX - startX;
        const moveY = event.clientY - startY;
        rotationY += moveX * 0.5;
        rotationX -= moveY * 0.5;
        model.style.transform =
            `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
        startX = event.clientX;
        startY = event.clientY;
    });
    document.addEventListener("mouseup", () => {
        isDragging = false;
    });

}

const labCards = document.querySelectorAll(".lab-card");
labCards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        card.style.transform =
            `perspective(800px)
             rotateX(${rotateX}deg)
             rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "";

    });

});

const labButtons = document.querySelectorAll("[data-auth-title]");
labButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const title = button.dataset.authTitle;
        openAuthModal(title);
    });

});