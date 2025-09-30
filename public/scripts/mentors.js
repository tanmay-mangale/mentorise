(() => {
  const dataUrl = "./data/mentors.json";
  const grid = document.getElementById("mentorsGrid");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const genderFilter = document.getElementById("genderFilter");
  const sortSelect = document.getElementById("sortSelect");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const resultsInfo = document.getElementById("resultsInfo");
  
  // Pagination variables
  let currentPage = 1;
  const mentorsPerPage = 10;
  let allMentors = [];
  let filteredMentors = [];

  /**
   * Normalize a mentor record from mentors.json to our UI model
   */
  function mapMentor(raw) {
    const title = String(raw["Title"] || "").trim();
    const name = String(raw["Name"] || "").trim();
    const email = String(raw["Email ID"] || "").trim();
    const qualification = String(raw["Qualification"] || "").trim();
    const experienceYears = Number(raw["Experience (Years)"] || 0);
    const linkedin = String(raw["LinkedIn Profile"] || "").trim();
    const subjects = String(raw["Subjects"] || "").trim();

    const gender = /ms\.|mrs\.|miss/i.test(title) ? "female" : "male";

    return {
      title,
      name,
      email,
      qualification,
      experienceYears: isFinite(experienceYears) ? experienceYears : 0,
      linkedin,
      subjects,
      gender,
    };
  }

  function createCard(mentor) {
    const card = document.createElement("div");
    card.className = "group bg-white rounded-2xl p-6 border border-neutral-100 hover:border-primary-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1";

    const iconCircle = document.createElement("div");
    iconCircle.className = `w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md transition-transform duration-300 group-hover:scale-110 ${
      mentor.gender === "female" ? "bg-gradient-to-br from-pink-500 to-pink-600" : "bg-gradient-to-br from-blue-500 to-blue-600"
    }`;

    const icon = document.createElement("i");
    icon.className = mentor.gender === "female" ? "fas fa-user fa-lg text-white" : "fas fa-user fa-lg text-white";
    iconCircle.appendChild(icon);

    const nameEl = document.createElement("h3");
    nameEl.className = "text-lg font-semibold text-neutral-800 font-heading group-hover:text-primary-600 transition-colors";
    nameEl.textContent = `${mentor.title ? mentor.title + " " : ""}${mentor.name}`;

    const subEl = document.createElement("p");
    subEl.className = "text-neutral-600 mt-1 text-sm";
    subEl.textContent = mentor.subjects || "General Mentoring";

    const meta = document.createElement("div");
    meta.className = "mt-3 text-sm text-neutral-500 space-y-1";
    meta.innerHTML = `
      <div class="flex items-center"><i class="fas fa-graduation-cap mr-2 text-primary-500"></i>${mentor.qualification || "Qualification N/A"}</div>
      <div class="flex items-center"><i class="fas fa-briefcase mr-2 text-primary-500"></i>${mentor.experienceYears} yrs experience</div>
    `;

    const actions = document.createElement("div");
    actions.className = "mt-4 flex items-center gap-3";

    const emailBtn = document.createElement("a");
    emailBtn.className = "flex-1 text-center border border-neutral-200 rounded-xl py-2 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-300 text-sm font-medium";
    emailBtn.href = mentor.email ? `mailto:${mentor.email}` : "#";
    emailBtn.target = "_blank";
    emailBtn.rel = "noreferrer";
    emailBtn.innerHTML = '<i class="fas fa-envelope mr-1"></i>Email';

    const liBtn = document.createElement("a");
    liBtn.className = "flex-1 text-center bg-primary-500 text-white rounded-xl py-2 hover:bg-primary-600 transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg";
    liBtn.href = mentor.linkedin || "#";
    liBtn.target = "_blank";
    liBtn.rel = "noreferrer";
    liBtn.innerHTML = '<i class="fab fa-linkedin mr-1"></i>LinkedIn';

    actions.appendChild(emailBtn);
    actions.appendChild(liBtn);

    card.appendChild(iconCircle);
    card.appendChild(nameEl);
    card.appendChild(subEl);
    card.appendChild(meta);
    card.appendChild(actions);
    return card;
  }

  function render(list, isAppending = false) {
    if (!isAppending) {
      grid.innerHTML = "";
      currentPage = 1;
    }
    
    if (!list.length && !isAppending) {
      emptyState.classList.remove("hidden");
      loadMoreBtn.classList.add("hidden");
      return;
    }
    
    emptyState.classList.add("hidden");
    
    const startIndex = isAppending ? (currentPage - 1) * mentorsPerPage : 0;
    const endIndex = isAppending ? currentPage * mentorsPerPage : mentorsPerPage;
    const mentorsToShow = list.slice(0, endIndex);
    
    const fragment = document.createDocumentFragment();
    const newMentors = list.slice(startIndex, endIndex);
    newMentors.forEach((m) => fragment.appendChild(createCard(m)));
    grid.appendChild(fragment);
    
    // Update load more button visibility
    if (endIndex >= list.length) {
      loadMoreBtn.classList.add("hidden");
    } else {
      loadMoreBtn.classList.remove("hidden");
    }
    
    // Update results info
    updateResultsInfo(mentorsToShow.length, list.length);
  }

  function applyFiltersSort(all) {
    const q = (searchInput.value || "").toLowerCase();
    const g = genderFilter.value;
    const sort = sortSelect.value;

    let filtered = all.filter((m) => {
      const text = `${m.name} ${m.title} ${m.subjects} ${m.qualification}`.toLowerCase();
      const matchesText = !q || text.includes(q);
      const matchesGender = g === "all" || m.gender === g;
      return matchesText && matchesGender;
    });

    if (sort === "experience") {
      filtered.sort((a, b) => b.experienceYears - a.experienceYears || a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }
  
  function updateResultsInfo(showing, total) {
    if (resultsInfo) {
      resultsInfo.textContent = `Showing ${showing} of ${total} mentors`;
    }
  }
  
  function loadMore() {
    currentPage++;
    render(filteredMentors, true);
  }

  async function init() {
    try {
      const res = await fetch(dataUrl);
      const raw = await res.json();
      allMentors = Array.isArray(raw) ? raw.map(mapMentor) : [];

      function update() {
        filteredMentors = applyFiltersSort(allMentors);
        render(filteredMentors);
      }

      // Add event listeners
      searchInput.addEventListener("input", update);
      genderFilter.addEventListener("change", update);
      sortSelect.addEventListener("change", update);
      
      // Load more button functionality
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", loadMore);
      }

      update();
    } catch (e) {
      console.error("Failed to load mentors:", e);
      emptyState.classList.remove("hidden");
      emptyState.textContent = "Failed to load mentors. Please try again later.";
    }
  }

  if (grid) {
    init();
  }
})();


