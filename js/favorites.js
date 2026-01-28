// Favorites Management Logic

let userFavorites = new Set(); // Store favorite recipe titles

// Initialize favorites when auth state changes
function initializeFavorites(user) {
  if (!user) {
    userFavorites.clear();
    return;
  }
  
  // Load user's favorites from Firestore
  loadUserFavorites(user.uid);
}

// Load favorites from Firestore
async function loadUserFavorites(userId) {
  // Check if FirestoreHelper is available
  if (!window.FirestoreHelper) {
    console.error('FirestoreHelper not loaded yet');
    return;
  }
  
  try {
    const favorites = await window.FirestoreHelper.getAllFavorites(userId);
    userFavorites.clear();
    favorites.forEach(recipe => {
      userFavorites.add(recipe.title);
    });
    
    // Update UI to show favorite states
    updateFavoriteButtons();
    
    console.log('Loaded favorites:', userFavorites.size);
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
}

// Toggle favorite status
async function toggleFavorite(recipe, button) {
  const user = firebase.auth().currentUser;
  
  if (!user) {
    alert('Please sign in to save favorites');
    window.location.href = 'pages/auth.html';
    return;
  }
  
  const isFavorited = userFavorites.has(recipe.title);
  
  // Optimistic UI update
  if (isFavorited) {
    userFavorites.delete(recipe.title);
    updateFavoriteButton(button, false);
  } else {
    userFavorites.add(recipe.title);
    updateFavoriteButton(button, true);
  }
  
  // Save to Firestore
  try {
    if (isFavorited) {
      await window.FirestoreHelper.removeFavorite(user.uid, recipe.title);
      showToast('Removed from favorites');
    } else {
      await window.FirestoreHelper.addFavorite(user.uid, recipe);
      showToast('Added to favorites');
    }
  } catch (error) {
    // Revert on error
    if (isFavorited) {
      userFavorites.add(recipe.title);
      updateFavoriteButton(button, true);
    } else {
      userFavorites.delete(recipe.title);
      updateFavoriteButton(button, false);
    }
    showToast('Error updating favorites');
  }
}

// Update single favorite button
function updateFavoriteButton(button, isFavorited) {
  if (!button) return;
  
  const heartSVG = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `;
  
  button.innerHTML = heartSVG;
  
  if (isFavorited) {
    button.classList.add('favorited');
    button.setAttribute('aria-label', 'Remove from favorites');
  } else {
    button.classList.remove('favorited');
    button.setAttribute('aria-label', 'Add to favorites');
  }
}

// Update all favorite buttons on page
function updateFavoriteButtons() {
  const buttons = document.querySelectorAll('.favorite-btn');
  buttons.forEach(button => {
    const recipeTitle = button.dataset.recipeTitle;
    const isFavorited = userFavorites.has(recipeTitle);
    updateFavoriteButton(button, isFavorited);
  });
}

// Check if recipe is favorited
function isRecipeFavorited(recipeTitle) {
  return userFavorites.has(recipeTitle);
}

// Get all favorited recipes
function getFavoriteRecipes(allRecipes) {
  return allRecipes.filter(recipe => userFavorites.has(recipe.title));
}

// Show toast notification
function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Hide and remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

firebase.auth().onAuthStateChanged((user) => {
  if (!user) return;

  const avatarEl = document.getElementById("user-avatar");
  if (!avatarEl) return;

  // fallback initial
  avatarEl.textContent =
    (user.displayName || user.email).charAt(0).toUpperCase();

  // 🔥 Load Firestore avatar
  if (window.loadUserAvatarToHeader) {
    loadUserAvatarToHeader(user.uid);
  }
});


// Export functions globally
window.FavoritesManager = {
  initialize: initializeFavorites,
  toggle: toggleFavorite,
  isFavorited: isRecipeFavorited,
  getFavorites: getFavoriteRecipes,
  updateButtons: updateFavoriteButtons,
  loadUserFavorites: loadUserFavorites
};