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

const opportunityResultsCount =
  document.getElementById("opportunityResultsCount");

const opportunityNoResults =
  document.getElementById("opportunityNoResults");


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


  let visibleCount = 0;


  opportunityCards.forEach(card => {

    const text =
      card.textContent.toLowerCase();

    const cardCategory =
      (card.dataset.category || "").toLowerCase();

    const cardLocation =
      (card.dataset.location || "").toLowerCase();


    const matchesSearch =
      !searchTerm ||
      text.includes(searchTerm);

    const matchesCategory =
      category === "all" ||
      cardCategory === category.toLowerCase();

    const matchesLocation =
      location === "all" ||
      cardLocation === location.toLowerCase();


    const shouldShow =
      matchesSearch &&
      matchesCategory &&
      matchesLocation;


    card.style.display =
      shouldShow ? "" : "none";


    if (shouldShow) {
      visibleCount++;
    }

  });


  /* -----------------------------------------
     RESULTS COUNT
     ----------------------------------------- */

  if (opportunityResultsCount) {

    opportunityResultsCount.textContent =
      visibleCount === 1
        ? "1 opportunity found"
        : `${visibleCount} opportunities found`;

  }


  /* -----------------------------------------
     NO RESULTS MESSAGE
     ----------------------------------------- */

  if (opportunityNoResults) {

    opportunityNoResults.style.display =
      visibleCount === 0 ? "" : "none";

  }

}


/* -----------------------------------------
   SEARCH
   ----------------------------------------- */

if (opportunitySearch) {

  opportunitySearch.addEventListener(
    "input",
    filterOpportunities
  );

}


/* -----------------------------------------
   CATEGORY FILTER
   ----------------------------------------- */

if (opportunityCategory) {

  opportunityCategory.addEventListener(
    "change",
    filterOpportunities
  );

}


/* -----------------------------------------
   LOCATION FILTER
   ----------------------------------------- */

if (opportunityLocation) {

  opportunityLocation.addEventListener(
    "change",
    filterOpportunities
  );

}


/* -----------------------------------------
   CLEAR FILTERS
   ----------------------------------------- */

if (clearOpportunityFilters) {

  clearOpportunityFilters.addEventListener(
    "click",
    () => {

      if (opportunitySearch) {
        opportunitySearch.value = "";
      }

      if (opportunityCategory) {
        opportunityCategory.value = "all";
      }

      if (opportunityLocation) {
        opportunityLocation.value = "all";
      }

      filterOpportunities();

    }
  );

}


/* -----------------------------------------
   INITIAL FILTER
   ----------------------------------------- */

filterOpportunities();
