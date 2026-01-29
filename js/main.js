// Main Application Logic for Voice Kitchen

let recipes = [];
let currentRecipe = null;
let currentStep = 0;
let voiceOnlyMode = false;
let isVoiceActive = false;
let currentUser = null;
let isGuest = true;

// Mic test variables
let micTestRecognition = null;
let isMicTesting = false;

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
  const testMicBtn = document.getElementById('test-mic-btn');
  
  if (startBtn) {
    startBtn.addEventListener('click', handleStartVoice);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', handleStopVoice);
  }
  
  if (testMicBtn) {
    testMicBtn.addEventListener('click', openMicTestModal);
  }
  
  // Mic test modal event listeners
  setupMicTestListeners();
  
  // Guest notice dismiss
  const noticeClose = document.querySelector('.notice-close');
  if (noticeClose) {
    noticeClose.onclick = () => {
      sessionStorage.setItem('guestNoticeDismissed', 'true');
    };
  }
  
  // Voice commands toggle
  const voiceCommandsToggle = document.getElementById('voice-commands-toggle');
  const voiceCommandsContent = document.getElementById('voice-commands-content');
  
  if (voiceCommandsToggle && voiceCommandsContent) {
    voiceCommandsToggle.addEventListener('click', () => {
      const isHidden = voiceCommandsContent.hidden;
      voiceCommandsContent.hidden = !isHidden;
      voiceCommandsToggle.classList.toggle('active');
    });
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

// Select API recipe
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

// ============================================================
// ENHANCED VOICE COMMAND MATCHING WITH FLEXIBLE VARIATIONS
// ============================================================

// Command pattern definitions with multiple variations
const COMMAND_PATTERNS = {
  next: [
    'next', 'next step', 'continue', 'move forward', 'go ahead', 
    'proceed', 'move on', 'keep going', 'forward', 'onwards',
    'next one', 'go on', 'carry on', 'advance', 'go next'
  ],
  
  previous: [
    'back', 'previous', 'go back', 'last step', 'previous step',
    'step back', 'go backwards', 'backwards', 'rewind', 'earlier',
    'before', 'prior step', 'last one', 'go to previous'
  ],
  
  repeat: [
    'repeat', 'say again', 'again', 'what was that', 'one more time',
    'repeat step', 'say that again', 'can you repeat', 'repeat that',
    'tell me again', 'come again', 'pardon', 'once more'
  ],
  
  startOver: [
    'start over', 'restart', 'begin again', 'from the beginning',
    'start from beginning', 'reset', 'go to start', 'first step',
    'go to first', 'beginning', 'start again', 'from start'
  ],
  
  stop: [
    'stop', 'pause', 'halt', 'end', 'quit', 'exit', 'finish',
    'stop voice', 'stop listening', 'turn off', 'shut up',
    'be quiet', 'silence', 'enough', 'cancel'
  ],
  
  help: [
    'help', 'what can i say', 'commands', 'options', 'instructions',
    'what do i say', 'how does this work', 'guide me', 'assist',
    'what are the commands', 'show commands', 'voice commands'
  ]
};

// Check if command matches any pattern
function matchesCommand(transcript, commandType) {
  const patterns = COMMAND_PATTERNS[commandType];
  if (!patterns) return false;
  
  // Check for exact matches or partial matches
  return patterns.some(pattern => {
    // Exact match
    if (transcript === pattern) return true;
    
    // Contains match (for multi-word commands)
    if (transcript.includes(pattern)) return true;
    
    // Word boundary match (ensures whole word matching)
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    return regex.test(transcript);
  });
}

// Extract step number from command
function extractStepNumber(transcript) {
  // Match patterns like "go to step 3", "step 5", "jump to step 2"
  const patterns = [
    /(?:go\s+to\s+)?step\s+(\d+)/i,
    /(?:jump\s+to\s+)?step\s+(\d+)/i,
    /step\s+number\s+(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s+step/i
  ];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

// Handle voice commands with flexible matching
function handleVoiceCommand(command) {
  if (!currentRecipe || !isVoiceActive) {
    return;
  }

  // Normalize command
  const normalizedCommand = command.toLowerCase().trim();
  
  // Check for "go to step X" or "repeat step X"
  if (normalizedCommand.includes('step')) {
    const stepNumber = extractStepNumber(normalizedCommand);
    
    if (stepNumber !== null) {
      // Go to specific step
      if (normalizedCommand.includes('go to') || normalizedCommand.includes('jump to')) {
        if (stepNumber >= 1 && stepNumber <= currentRecipe.steps.length) {
          currentStep = stepNumber - 1;
          speakStep();
          document.getElementById('assistant-reply').innerText = `Assistant: Moving to step ${stepNumber}`;
        } else {
          speakText(`Step number out of range. Please choose a step between 1 and ${currentRecipe.steps.length}.`);
          document.getElementById('assistant-reply').innerText = 'Assistant: Step number out of range';
        }
        return;
      }
      
      // Repeat specific step
      if (normalizedCommand.includes('repeat')) {
        if (stepNumber >= 1 && stepNumber <= currentRecipe.steps.length) {
          speakText(currentRecipe.steps[stepNumber - 1]);
          document.getElementById('assistant-reply').innerText = `Assistant: Repeating step ${stepNumber}`;
        } else {
          speakText('Cannot repeat that step.');
          document.getElementById('assistant-reply').innerText = 'Assistant: Cannot repeat that step';
        }
        return;
      }
    }
  }

  // Check for NEXT command
  if (matchesCommand(normalizedCommand, 'next')) {
    if (currentStep < currentRecipe.steps.length - 1) {
      currentStep++;
      speakStep();
      document.getElementById('assistant-reply').innerText = `Assistant: Moving to next step (${currentStep + 1} of ${currentRecipe.steps.length})`;
    } else {
      speakText("You've completed all steps! Bon appétit!");
      document.getElementById('assistant-reply').innerText = 'Assistant: Recipe completed!';
      stopVoiceMode();
    }
    return;
  }

  // Check for REPEAT command
  if (matchesCommand(normalizedCommand, 'repeat')) {
    speakStep();
    document.getElementById('assistant-reply').innerText = `Assistant: Repeating step ${currentStep + 1}`;
    return;
  }

  // Check for PREVIOUS/BACK command
  if (matchesCommand(normalizedCommand, 'previous')) {
    if (currentStep > 0) {
      currentStep--;
      speakStep();
      document.getElementById('assistant-reply').innerText = `Assistant: Going back to step ${currentStep + 1}`;
    } else {
      speakText("You're already at the first step.");
      document.getElementById('assistant-reply').innerText = 'Assistant: Already at first step';
    }
    return;
  }

  // Check for START OVER command
  if (matchesCommand(normalizedCommand, 'startOver')) {
    currentStep = 0;
    speakStep();
    document.getElementById('assistant-reply').innerText = 'Assistant: Starting over from step 1';
    return;
  }

  // Check for STOP command
  if (matchesCommand(normalizedCommand, 'stop')) {
    stopVoiceMode();
    speakText('Voice mode stopped.');
    document.getElementById('assistant-reply').innerText = 'Assistant: Voice mode stopped';
    return;
  }

  // Check for HELP command
  if (matchesCommand(normalizedCommand, 'help')) {
    const helpText = 'You can say: next, previous, repeat, start over, go to step 3, or stop. What would you like to do?';
    speakText(helpText);
    document.getElementById('assistant-reply').innerText = 'Assistant: ' + helpText;
    return;
  }

  // Command not recognized
  console.log('Unrecognized command:', normalizedCommand);
  speakText("I didn't understand that. Say 'help' to hear available commands.");
  document.getElementById('assistant-reply').innerText = `Assistant: Command not recognized. Try saying "help"`;
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
    startBtn.style.background = '#12d87c';
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      Start
    `;
    startBtn.style.background = '';
  }
}

// ============================================================
// MIC TEST FUNCTIONALITY
// ============================================================

function setupMicTestListeners() {
  const modal = document.getElementById('mic-test-modal');
  const closeBtn = document.getElementById('close-mic-test');
  const overlay = modal?.querySelector('.mic-modal-overlay');
  const startTest = document.getElementById('start-mic-test');
  const stopTest = document.getElementById('stop-mic-test');
  
  
  if (closeBtn) {
    closeBtn.onclick = closeMicTestModal;
  }
  
  if (overlay) {
    overlay.onclick = closeMicTestModal;
  }
  
  if (startTest) {
    startTest.onclick = startMicTest;
  }
  
  if (stopTest) {
    stopTest.onclick = stopMicTest;
  }
}

function openMicTestModal() {
  const modal = document.getElementById('mic-test-modal');
  if (!modal) return;
  
  // Check browser support
  if (!SpeechRecognition) {
    alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
    return;
  }
  
  // Reset modal state
  document.getElementById('mic-status-text').textContent = 'Click "Start Test" to begin';
  document.getElementById('mic-transcript').textContent = 'Waiting for input...';
  document.getElementById('mic-status').classList.remove('listening');
  
  // Show modal
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  
  // Initialize mic test recognition if not already done
  if (!micTestRecognition) {
    initMicTestRecognition();
  }
}

function closeMicTestModal() {
  const modal = document.getElementById('mic-test-modal');
  if (!modal) return;
  
  // Stop mic test if running
  if (isMicTesting) {
    stopMicTest();
  }
  
  // Hide modal
  modal.hidden = true;
  document.body.style.overflow = '';
}

function initMicTestRecognition() {
  if (!SpeechRecognition) return;
  
  micTestRecognition = new SpeechRecognition();
  micTestRecognition.continuous = true;
  micTestRecognition.interimResults = true;
  micTestRecognition.lang = 'en-IN';
  
  micTestRecognition.onstart = () => {
    console.log('Mic test started');
    isMicTesting = true;
    document.getElementById('mic-status-text').textContent = '🎤 Listening... Try speaking now!';
    document.getElementById('mic-status').classList.add('listening');
    
    // Update buttons
    document.getElementById('start-mic-test').disabled = true;
    document.getElementById('stop-mic-test').disabled = false;
  };
  
  micTestRecognition.onend = () => {
    console.log('Mic test ended');
    isMicTesting = false;
    document.getElementById('mic-status-text').textContent = 'Test stopped. Click "Start Test" to try again.';
    document.getElementById('mic-status').classList.remove('listening');
    
    // Update buttons
    document.getElementById('start-mic-test').disabled = false;
    document.getElementById('stop-mic-test').disabled = true;
  };
  
  micTestRecognition.onerror = (event) => {
    console.log('Mic test error:', event.error);
    
    let errorMessage = 'Error occurred. Please try again.';
    
    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      errorMessage = '❌ Microphone permission denied. Please allow microphone access.';
    } else if (event.error === 'no-speech') {
      errorMessage = '🔇 No speech detected. Please speak louder or check your microphone.';
    } else if (event.error === 'audio-capture') {
      errorMessage = '❌ No microphone found. Please connect a microphone.';
    } else if (event.error === 'network') {
      errorMessage = '📡 Network error. Please check your internet connection.';
    }
    
    document.getElementById('mic-status-text').textContent = errorMessage;
    document.getElementById('mic-status').classList.remove('listening');
    
    isMicTesting = false;
    document.getElementById('start-mic-test').disabled = false;
    document.getElementById('stop-mic-test').disabled = true;
  };
  
  micTestRecognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log('Mic test detected:', transcript);
    
    // Update transcript display
    document.getElementById('mic-transcript').textContent = transcript;
    
    // Provide feedback on recognized commands
    let feedback = '';
    if (matchesCommand(transcript.toLowerCase(), 'next')) {
      feedback = ' ✅ "Next" command recognized!';
    } else if (matchesCommand(transcript.toLowerCase(), 'previous')) {
      feedback = ' ✅ "Back/Previous" command recognized!';
    } else if (matchesCommand(transcript.toLowerCase(), 'repeat')) {
      feedback = ' ✅ "Repeat" command recognized!';
    } else if (matchesCommand(transcript.toLowerCase(), 'help')) {
      feedback = ' ✅ "Help" command recognized!';
    }
    
    if (feedback) {
      document.getElementById('mic-status-text').textContent = '🎤 Listening...' + feedback;
    }
  };
}

function startMicTest() {
  if (!micTestRecognition) {
    initMicTestRecognition();
  }
  
  try {
    micTestRecognition.start();
  } catch (e) {
    console.log('Error starting mic test:', e);
    if (e.name === 'InvalidStateError') {
      // Already running, stop and restart
      micTestRecognition.stop();
      setTimeout(() => {
        micTestRecognition.start();
      }, 100);
    }
  }
}

function stopMicTest() {
  if (micTestRecognition && isMicTesting) {
    try {
      micTestRecognition.stop();
    } catch (e) {
      console.log('Error stopping mic test:', e);
    }
  }
}