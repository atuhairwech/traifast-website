/* =========================================
   TRAIFAST WEBSITE SCRIPT
   ========================================= */

/* -----------------------------------------
   MOBILE MENU
   ----------------------------------------- */

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

if (menuToggle && nav) {

  menuToggle.addEventListener("click", () => {

    const isOpen = nav.classList.toggle("open");

    menuToggle.setAttribute(
      "aria-expanded",
      isOpen ? "true" : "false"
    );

    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close menu" : "Open menu"
    );

  });

  nav.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {

      nav.classList.remove("open");

      menuToggle.setAttribute(
        "aria-expanded",
        "false"
      );

      menuToggle.setAttribute(
        "aria-label",
        "Open menu"
      );

    });

  });

}


/* -----------------------------------------
   CURRENT YEAR
   ----------------------------------------- */

const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}
/* -----------------------------------------
   NATIVE SHARE
   ----------------------------------------- */

function sharePage() {

  if (navigator.share) {

    navigator.share({
      title: document.title,
      text: "Explore Traifast.",
      url: window.location.href
    }).catch(() => {});

  } else {

    navigator.clipboard.writeText(window.location.href);

    alert("Page link copied to clipboard.");

  }

}
