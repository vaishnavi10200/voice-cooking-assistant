// Main Application Logic for Voice Kitchen

let recipes = [];
let currentRecipe = null;
let currentStep = 0;
let voiceOnlyMode = false;
let isVoiceActive = false;
let currentUser = null;
let isGuest = true;

// Initialize app when page loads
window.onload = async function () {
  await loadRecipes();
  await initAuth();
  setupEventListeners();
  
  // Initialize search after recipes are loaded
  if (window.SearchManager) {
    window.SearchManager.initialize(recipes);
  }
};

// Load recipes from JSON
async function loadRecipes() {
  try {
    const res = await fetch("recipes.json");
    recipes = await res.json();
    // Don't call loadRecipeCards here - SearchManager will handle it
  } catch (error) {
    console.error("Error loading recipes:", error);
  }
}

// Initialize authentication state
async function initAuth() {
  const auth = firebase.auth();
  
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    isGuest = !user;
    
    if (user) {
      // User is signed in
      console.log("User signed in:", user.email);
      updateUIForAuthenticatedUser(user);
      hideGuestNotice();
      
      // Initialize favorites
      if (window.FavoritesManager) {
        window.FavoritesManager.initialize(user);
      }
      
      // Restore cooking session if exists
      await restoreCookingSession();
    } else {
      // User is guest
      console.log("User is browsing as guest");
      updateUIForGuest();
      showGuestNotice();
      
      // Clear favorites
      if (window.FavoritesManager) {
        window.FavoritesManager.initialize(null);
      }
    }
  });
}

// Update UI for authenticated users
function updateUIForAuthenticatedUser(user) {
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  
  // Update name
  const displayName = user.displayName || user.email.split('@')[0];
  userName.textContent = displayName;
  
    // Update avatar (fallback first letter)
  userAvatar.textContent = displayName.charAt(0).toUpperCase();

  // Load Firestore avatar if exists
  if (window.loadUserAvatarToHeader) {
    loadUserAvatarToHeader(user.uid);
  }  
  // Show profile dropdown functionality
  userAvatar.style.cursor = 'pointer';
  userAvatar.onclick = toggleProfileDropdown;
}

// Update UI for guest users
function updateUIForGuest() {
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  
  userName.textContent = 'Welcome';
  userAvatar.textContent = '👤';
  userAvatar.style.cursor = 'pointer';
  
  // Clicking as guest redirects to auth page
  userAvatar.onclick = () => {
    window.location.href = 'pages/auth.html';
  };
}

// Toggle profile dropdown
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  dropdown.hidden = !dropdown.hidden;
  
  // Close dropdown when clicking outside
  if (!dropdown.hidden) {
    setTimeout(() => {
      document.addEventListener('click', closeDropdownOutside);
    }, 100);
  }
}

function closeDropdownOutside(e) {
  const dropdown = document.getElementById('profile-dropdown');
  const userProfile = document.getElementById('user-profile');
  
  if (!userProfile.contains(e.target)) {
    dropdown.hidden = true;
    document.removeEventListener('click', closeDropdownOutside);
  }
}

// Show/hide guest notice
function showGuestNotice() {
  const notice = document.getElementById('guest-notice');
  
  // Check if user dismissed it before
  const dismissed = sessionStorage.getItem('guestNoticeDismissed');
  if (!dismissed) {
    notice.hidden = false;
  }
}

function hideGuestNotice() {
  const notice = document.getElementById('guest-notice');
  notice.hidden = true;
}

// Setup event listeners
function setupEventListeners() {
  // Profile dropdown items
  const profileLink = document.getElementById('profile-link');
  const favoritesLink = document.getElementById('favorites-link');
  const signoutLink = document.getElementById('signout-link');
  
  if (profileLink) {
    profileLink.onclick = () => window.location.href = 'pages/profile.html';
  }
  
  if (favoritesLink) {
    favoritesLink.onclick = () => {
      if (isGuest) {
        alert('Please sign in to access favorites');
        window.location.href = 'pages/auth.html';
      } else {
        window.location.href = 'pages/favorites.html';
      }
    };
  }
  
  if (signoutLink) {
    signoutLink.onclick = async () => {
      try {
        await firebase.auth().signOut();
        window.location.reload();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    };
  }
  
  // Voice control buttons
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  
  if (startBtn) {
    startBtn.addEventListener('click', handleStartVoice);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', handleStopVoice);
  }
  
  // Guest notice dismiss
  const noticeClose = document.querySelector('.notice-close');
  if (noticeClose) {
    noticeClose.onclick = () => {
      sessionStorage.setItem('guestNoticeDismissed', 'true');
    };
  }
}

// Load recipe cards
function loadRecipeCards() {
  const container = document.getElementById('recipe-list');
  container.innerHTML = '';

  recipes.forEach((recipe, index) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    card.innerHTML = `
      <button class="favorite-btn" data-recipe-title="${recipe.title}" aria-label="Add to favorites">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <img src="${recipe.image}" alt="${recipe.title}" class="recipe-img">
      <h3>${recipe.title}</h3>
      <p>⏱️ ${recipe.time}</p>
    `;

    // Add click handler for card (not the favorite button)
    const cardClickArea = card.querySelector('img, h3, p');
    if (cardClickArea) {
      card.style.cursor = 'pointer';
      card.onclick = (e) => {
        // Don't trigger if clicking favorite button
        if (!e.target.closest('.favorite-btn')) {
          selectRecipe(index);
        }
      };
    }
    
    // Add favorite button handler
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent card click
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

// Select a recipe
function selectRecipe(index) {
  currentRecipe = recipes[index];
  currentStep = 0;
  voiceOnlyMode = false;
  isVoiceActive = false;
  
  document.getElementById('recipe-title').innerText = currentRecipe.title;
  document.getElementById('recipe-view').hidden = false;
  
  // Scroll to recipe detail
  document.getElementById('recipe-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  speakText(`You selected ${currentRecipe.title}. ${isGuest ? 'Please sign in to use voice features.' : 'Click start voice to begin cooking.'}`);
  
  // Save to session storage
  saveCookingSession();
}

// Export selectRecipe globally
window.selectRecipe = selectRecipe;

// Handle API recipe selection
function selectAPIRecipe(recipe) {
  currentRecipe = recipe;
  currentStep = 0;
  voiceOnlyMode = false;
  isVoiceActive = false;
  
  document.getElementById('recipe-title').innerText = recipe.title;
  document.getElementById('recipe-view').hidden = false;
  
  // Scroll to recipe detail
  document.getElementById('recipe-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Add source link for API recipes
  const detailCard = document.querySelector('.detail-card');
  let sourceLink = document.getElementById('recipe-source');
  
  if (recipe.sourceUrl && !sourceLink) {
    sourceLink = document.createElement('a');
    sourceLink.id = 'recipe-source';
    sourceLink.className = 'recipe-source-link';
    sourceLink.href = recipe.sourceUrl;
    sourceLink.target = '_blank';
    sourceLink.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
      View Original Recipe
    `;
    const title = document.getElementById('recipe-title');
    title.parentNode.insertBefore(sourceLink, title.nextSibling);
  } else if (sourceLink && !recipe.sourceUrl) {
    sourceLink.remove();
  }
  
  speakText(`You selected ${recipe.title}. ${isGuest ? 'Please sign in to use voice features.' : 'Click start voice to begin cooking.'}`);
  
  // Save to session storage
  saveCookingSession();
}

// Export API recipe selector
window.selectAPIRecipe = selectAPIRecipe;

// Save cooking session
function saveCookingSession() {
  if (!isGuest && currentRecipe) {
    sessionStorage.setItem('currentRecipe', JSON.stringify(currentRecipe));
    sessionStorage.setItem('currentStep', currentStep);
  }
}

// Restore cooking session
async function restoreCookingSession() {
  const saved = sessionStorage.getItem('currentRecipe');
  const savedStep = sessionStorage.getItem('currentStep');
  
  if (saved && savedStep !== null) {
    currentRecipe = JSON.parse(saved);
    currentStep = parseInt(savedStep);
    document.getElementById('recipe-title').innerText = currentRecipe.title;
    document.getElementById('recipe-view').hidden = false;
    document.getElementById('current-step').innerText = currentRecipe.steps[currentStep];
  }
}

// Speak text using speech synthesis
function speakText(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

// Speak current step
function speakStep() {
  if (!currentRecipe || currentStep >= currentRecipe.steps.length) {
    speakText('No more steps.');
    return;
  }
  const step = currentRecipe.steps[currentStep];
  document.getElementById('current-step').innerText = step;
  speakText(step);
  saveCookingSession();
}

// Voice Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';

  recognition.onstart = () => {
    console.log('Voice recognition started');
    document.getElementById('user-said').innerText = 'Listening...';
  };

  recognition.onend = () => {
    console.log('Voice recognition ended');
    if (isVoiceActive && voiceOnlyMode) {
      try {
        recognition.start();
      } catch (e) {
        console.log('Error restarting recognition:', e);
        setTimeout(() => {
          if (isVoiceActive && voiceOnlyMode) {
            recognition.start();
          }
        }, 100);
      }
    }
  };

  recognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }
    setTimeout(() => {
      if (isVoiceActive && voiceOnlyMode) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Error restarting after error:', e);
        }
      }
    }, 1000);
  };

  recognition.onresult = (event) => {
    if (!isVoiceActive) return;
    
    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log('Voice detected:', transcript);
    document.getElementById('user-said').innerText = 'You said: ' + transcript;
    handleVoiceCommand(transcript);
  };
}

// Handle voice commands
function handleVoiceCommand(command) {
  if (!currentRecipe || !isVoiceActive) {
    return;
  }

  if (command.includes('go to step')) {
    const stepNumber = parseInt(command.split('step')[1]);
    if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= currentRecipe.steps.length) {
      currentStep = stepNumber - 1;
      speakStep();
    } else {
      speakText('Step number out of range.');
    }
    return;
  }

  if (command.includes('repeat step')) {
    const stepNumber = parseInt(command.split('step')[1]);
    if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= currentRecipe.steps.length) {
      speakText(currentRecipe.steps[stepNumber - 1]);
    } else {
      speakText('Cannot repeat that step.');
    }
    return;
  }

  if (command.includes('next')) {
    if (currentStep < currentRecipe.steps.length - 1) {
      currentStep++;
      speakStep();
    } else {
      speakText("You're done! Bon appétit!");
      stopVoiceMode();
    }
  } else if (command.includes('repeat')) {
    speakStep();
  } else if (command.includes('back') || command.includes('previous')) {
    if (currentStep > 0) {
      currentStep--;
      speakStep();
    } else {
      speakText("You're already at the first step.");
    }
  } else if (command.includes('start over')) {
    currentStep = 0;
    speakStep();
  } else if (command.includes('stop')) {
    stopVoiceMode();
    speakText('Voice mode stopped.');
  } else if (command.includes('help')) {
    speakText('Say next, repeat, back, go to step 2, or start over.');
  } else {
    speakText('Command not understood. Say help for options.');
  }

  document.getElementById('assistant-reply').innerText = 'Assistant: Command executed — ' + command;
}

// Handle start voice button
function handleStartVoice() {
  if (!currentRecipe) {
    alert('Please select a recipe first to use voice assistant');
    return;
  }
  
  if (isGuest) {
    alert('Please sign in to use voice features');
    window.location.href = 'pages/auth.html';
    return;
  }
  
  if (!recognition) {
    alert('Speech recognition is not supported in your browser.');
    return;
  }
  
  isVoiceActive = true;
  voiceOnlyMode = true;
  
  try {
    recognition.start();
  } catch (e) {
    console.log('Error starting recognition:', e);
  }
  
  // Update button state
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.innerHTML = '🎤 Listening...';
    startBtn.style.background = 'linear-gradient(135deg, #00ff88, #00d4aa)';
  }
  
  speakStep();
}

// Handle stop voice button
function handleStopVoice() {
  stopVoiceMode();
  speakText('Voice assistant stopped. Click start voice to resume.');
}

// Stop voice mode
function stopVoiceMode() {
  isVoiceActive = false;
  voiceOnlyMode = false;
  
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      console.log('Error stopping recognition:', e);
    }
  }
  
  // Update button state
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
      Start Voice
    `;
    startBtn.style.background = '';
  }
}