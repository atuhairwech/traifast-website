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
/* -----------------------------------------
   OPPORTUNITY SEARCH & FILTERS
   ----------------------------------------- */

const opportunitySearch =
  document.getElementById("opportunitySearch");

const opportunityCategory =
  document.getElementById("opportunityCategory");

const opportunityLocation =
  document.getElementById("opportunityLocation");

const clearOpportunityFilters =
  document.getElementById("clearOpportunityFilters");

const opportunityCards =
  document.querySelectorAll(".opportunity-card");


function filterOpportunities() {

  const searchTerm =
    opportunitySearch
      ? opportunitySearch.value.toLowerCase().trim()
      : "";

  const category =
    opportunityCategory
      ? opportunityCategory.value
      : "all";

  const location =
    opportunityLocation
      ? opportunityLocation.value
      : "all";


  opportunityCards.forEach(card => {

    const text =
      card.textContent.toLowerCase();

    const cardCategory =
      card.dataset.category || "";

    const cardLocation =
      card.dataset.location || "";


    const matchesSearch =
      !searchTerm ||
      text.includes(searchTerm);

    const matchesCategory =
      category === "all" ||
      cardCategory === category;

    const matchesLocation =
      location === "all" ||
      cardLocation === location;


    card.style.display =
      matchesSearch &&
      matchesCategory &&
      matchesLocation
        ? ""
        : "none";

  });

}


/* Search */

if (opportunitySearch) {

  opportunitySearch.addEventListener(
    "input",
    filterOpportunities
  );

}


/* Category filter */

if (opportunityCategory) {

  opportunityCategory.addEventListener(
    "change",
    filterOpportunities
  );

}


/* Location filter */

if (opportunityLocation) {

  opportunityLocation.addEventListener(
    "change",
    filterOpportunities
  );

}


/* Clear filters */

if (clearOpportunityFilters) {

  clearOpportunityFilters.addEventListener(
    "click",
    () => {

      opportunitySearch.value = "";

      opportunityCategory.value = "all";

      opportunityLocation.value = "all";

      filterOpportunities();

    }
  );

}
