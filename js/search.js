// Search and Filter Logic with API Integration

let currentSearchTerm = '';
let currentFilter = 'all';
let allRecipes = [];
let apiRecipes = [];
let isLoadingAPI = false;
let hasSearchedAPI = false;

// Initialize search functionality
function initializeSearch(recipes) {
  allRecipes = recipes;
  
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const searchBtn = document.getElementById('search-btn');
  const randomBtn = document.getElementById('random-btn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  // Search input event
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.toLowerCase().trim();
      
      // Show/hide clear button
      if (searchClear) {
        searchClear.hidden = currentSearchTerm === '';
      }
      
      // Perform search
      performSearch();
    });
    
    // Enter key to search
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
        searchInput.blur(); // Remove focus after search
      }
    });
  }
  
  // Search button click
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      performSearch();
      if (searchInput) {
        searchInput.blur(); // Remove focus after search
      }
    });
  }
  
  // Clear search button
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        currentSearchTerm = '';
        searchClear.hidden = true;
        performSearch();
        searchInput.focus();
      }
    });
  }
  
  // Random recipe button
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      showRandomRecipe();
    });
  }
  
  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Set current filter
      currentFilter = btn.dataset.filter;
      
      // Perform search with new filter
      performSearch();
    });
  });
  
  // Set "All" as default active filter
  if (filterBtns.length > 0) {
    filterBtns[0].classList.add('active');
  }
  
  // Initial display
  performSearch();
}

// Perform search and filter
async function performSearch() {
  let filteredRecipes = [...allRecipes];
  
  // Apply text search to local recipes
  if (currentSearchTerm) {
    filteredRecipes = filteredRecipes.filter(recipe => {
      return recipe.title.toLowerCase().includes(currentSearchTerm) ||
             recipe.category.toLowerCase().includes(currentSearchTerm) ||
             recipe.steps.some(step => step.toLowerCase().includes(currentSearchTerm));
    });
    
    // Search API if search term is provided and not already searched
    if (!hasSearchedAPI && window.RecipeAPI) {
      showLoadingState();
      apiRecipes = await window.RecipeAPI.searchRecipes(currentSearchTerm);
      hasSearchedAPI = true;
      hideLoadingState();
      
      // Combine local and API results
      filteredRecipes = [...filteredRecipes, ...apiRecipes];
    } else if (hasSearchedAPI && apiRecipes.length > 0) {
      // Include previously fetched API recipes
      filteredRecipes = [...filteredRecipes, ...apiRecipes];
    }
  } else {
    // No search term - clear API results
    apiRecipes = [];
    hasSearchedAPI = false;
  }
  
  // Apply difficulty filter
  if (currentFilter !== 'all') {
    if (currentFilter === 'quick') {
      // Quick recipes: less than 30 minutes
      filteredRecipes = filteredRecipes.filter(recipe => {
        const time = parseInt(recipe.time);
        return time < 30;
      });
    } else {
      // Difficulty filter
      filteredRecipes = filteredRecipes.filter(recipe => {
        return recipe.difficulty === currentFilter;
      });
    }
  }
  
  // Update UI
  updateSearchResults(filteredRecipes);
}

// Update search results display
function updateSearchResults(recipes) {
  const recipeList = document.getElementById('recipe-list');
  const noResults = document.getElementById('no-results');
  const resultCount = document.getElementById('result-count');
  const searchTerm = document.getElementById('search-term');
  
  // Update search term display
  if (currentSearchTerm) {
    searchTerm.textContent = currentSearchTerm;
  } else if (currentFilter !== 'all') {
    searchTerm.textContent = currentFilter;
  } else {
    searchTerm.textContent = 'all recipes';
  }
  
  // Update result count
  resultCount.textContent = `${recipes.length} ${recipes.length === 1 ? 'result' : 'results'}`;
  
  // Show/hide no results
  if (recipes.length === 0) {
    recipeList.hidden = true;
    noResults.hidden = false;
  } else {
    recipeList.hidden = false;
    noResults.hidden = true;
    
    // Render recipes
    renderRecipes(recipes);
  }
}

// Render recipe cards
function renderRecipes(recipes) {
  const container = document.getElementById('recipe-list');
  container.innerHTML = '';

  recipes.forEach((recipe, index) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // Get difficulty badge color
    const difficultyColor = getDifficultyColor(recipe.difficulty);

    card.innerHTML = `
      <button class="favorite-btn" data-recipe-title="${recipe.title}" aria-label="Add to favorites">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <img src="${recipe.image}" alt="${recipe.title}" class="recipe-img">
      <div class="recipe-info">
        <h3>${recipe.title}</h3>
        <div class="recipe-meta">
          <span class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${recipe.time}
          </span>
          <span class="difficulty-badge ${recipe.difficulty}">${recipe.difficulty}</span>
        </div>
      </div>
    `;

    // Card click handler
    card.onclick = (e) => {
      if (!e.target.closest('.favorite-btn')) {
        // For API recipes, we need to handle differently
        if (recipe.isFromAPI) {
          if (window.selectAPIRecipe) {
            window.selectAPIRecipe(recipe);
          }
        } else {
          const originalIndex = allRecipes.findIndex(r => r.title === recipe.title);
          if (window.selectRecipe) {
            window.selectRecipe(originalIndex);
          }
        }
      }
    };
    
    // Favorite button handler
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.onclick = (e) => {
      e.stopPropagation();
      if (window.FavoritesManager) {
        window.FavoritesManager.toggle(recipe, favoriteBtn);
      }
    };

    container.appendChild(card);
  });
  
  // Update favorite button states
  if (window.FavoritesManager) {
    window.FavoritesManager.updateButtons();
  }
}

// Get difficulty badge color
function getDifficultyColor(difficulty) {
  const colors = {
    easy: '#4caf50',
    medium: '#ff9800',
    hard: '#f44336'
  };
  return colors[difficulty] || '#999';
}

// Show random recipe
function showRandomRecipe() {
  if (allRecipes.length === 0) return;
  
  const randomIndex = Math.floor(Math.random() * allRecipes.length);
  const randomRecipe = allRecipes[randomIndex];
  
  // Clear search
  currentSearchTerm = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').hidden = true;
  
  // Clear filters
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
  
  // Show the recipe
  if (window.selectRecipe) {
    window.selectRecipe(randomIndex);
  }
}

// Clear search (called from HTML)
function clearSearch() {
  currentSearchTerm = '';
  currentFilter = 'all';
  apiRecipes = [];
  hasSearchedAPI = false;
  
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  
  if (searchInput) {
    searchInput.value = '';
  }
  
  if (searchClear) {
    searchClear.hidden = true;
  }
  
  // Reset filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
  
  performSearch();
}

// Show loading state
function showLoadingState() {
  const container = document.getElementById('recipe-list');
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'api-loading';
  loadingDiv.className = 'api-loading';
  loadingDiv.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Searching online recipes...</p>
  `;
  container.appendChild(loadingDiv);
}

// Hide loading state
function hideLoadingState() {
  const loading = document.getElementById('api-loading');
  if (loading) {
    loading.remove();
  }
}

// Export functions
window.SearchManager = {
  initialize: initializeSearch,
  search: performSearch,
  clear: clearSearch,
  random: showRandomRecipe
};