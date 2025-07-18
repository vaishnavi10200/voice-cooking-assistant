let recipes = [];
let currentRecipe = null;
let currentStep = 0;
let voiceOnlyMode = false;
let isVoiceActive = false;

window.onload = async function () {
  const res = await fetch("recipes.json");
  recipes = await res.json();
  loadRecipeCards();

  const saved = localStorage.getItem("currentRecipe");
  const savedStep = localStorage.getItem("currentStep");
  if (saved && savedStep !== null) {
    currentRecipe = JSON.parse(saved);
    currentStep = parseInt(savedStep);
    document.getElementById("recipe-title").innerText = currentRecipe.title;
    document.getElementById("recipe-view").hidden = false;
    // Don't automatically speak step on page load
  }
};

function loadRecipeCards() {
  const container = document.getElementById("recipe-list");
  container.innerHTML = '';

  recipes.forEach((recipe, index) => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    card.innerHTML = `
      <img src="${recipe.image}" alt="${recipe.title}" class="recipe-img">
      <h3>${recipe.title}</h3>
      <p>⏱️ ${recipe.time}</p>
    `;

    card.onclick = () => selectRecipe(index);
    container.appendChild(card);
  });
}

function selectRecipe(index) {
  currentRecipe = recipes[index];
  currentStep = 0;
  voiceOnlyMode = false;
  isVoiceActive = false;
  
  document.getElementById("recipe-title").innerText = currentRecipe.title;
  document.getElementById("recipe-view").hidden = false;
  
  speakText(`You selected ${currentRecipe.title}. Please click the start cooking button to begin.`);
  
  localStorage.setItem("currentRecipe", JSON.stringify(currentRecipe));
  localStorage.setItem("currentStep", currentStep);
}

function speakStep() {
  if (!currentRecipe || currentStep >= currentRecipe.steps.length) {
    speakText("No more steps.");
    return;
  }
  const step = currentRecipe.steps[currentStep];
  document.getElementById("current-step").innerText = step;
  speakText(step);
  localStorage.setItem("currentStep", currentStep);
}

function speakText(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

// Check for browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = "en-IN";

recognition.onstart = () => {
  console.log("Voice recognition started");
  document.getElementById("user-said").innerText = "Listening...";
};

recognition.onend = () => {
  console.log("Voice recognition ended");
  if (isVoiceActive && voiceOnlyMode) {
    try {
      recognition.start();
    } catch (e) {
      console.log("Error restarting recognition:", e);
      setTimeout(() => {
        if (isVoiceActive && voiceOnlyMode) {
          recognition.start();
        }
      }, 100);
    }
  }
};

recognition.onerror = (event) => {
  console.log("Speech recognition error:", event.error);
  if (event.error === 'no-speech') {
    return;
  }
  if (event.error === 'aborted') {
    return;
  }
  setTimeout(() => {
    if (isVoiceActive && voiceOnlyMode) {
      try {
        recognition.start();
      } catch (e) {
        console.log("Error restarting after error:", e);
      }
    }
  }, 1000);
};

recognition.onresult = (event) => {
  if (!isVoiceActive) return;
  
  const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
  console.log("Voice detected:", transcript);
  document.getElementById("user-said").innerText = "You said: " + transcript;
  handleVoiceCommand(transcript);
};

function handleVoiceCommand(command) {
  if (!currentRecipe || !isVoiceActive) {
    return;
  }

  if (command.includes("go to step")) {
    const stepNumber = parseInt(command.split("step")[1]);
    if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= currentRecipe.steps.length) {
      currentStep = stepNumber - 1;
      speakStep();
    } else {
      speakText("Step number out of range.");
    }
    return;
  }

  if (command.includes("repeat step")) {
    const stepNumber = parseInt(command.split("step")[1]);
    if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= currentRecipe.steps.length) {
      speakText(currentRecipe.steps[stepNumber - 1]);
    } else {
      speakText("Cannot repeat that step.");
    }
    return;
  }

  if (command.includes("next")) {
    if (currentStep < currentRecipe.steps.length - 1) {
      currentStep++;
      speakStep();
    } else {
      speakText("You're done! Bon appétit!");
      isVoiceActive = false;
      voiceOnlyMode = false;
      try {
        recognition.stop();
      } catch (e) {
        console.log("Error stopping recognition:", e);
      }
      // Update button state
      const startBtn = document.getElementById("start-btn");
      startBtn.innerHTML = '<span class="button-icon">🎙️</span>Start Cooking<div class="status-indicator"></div>';
      startBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
    }
  } else if (command.includes("repeat")) {
    speakStep();
  } else if (command.includes("back") || command.includes("previous")) {
    if (currentStep > 0) {
      currentStep--;
      speakStep();
    } else {
      speakText("You're already at the first step.");
    }
  } else if (command.includes("start over")) {
    currentStep = 0;
    speakStep();
  } else if (command.includes("stop")) {
    isVoiceActive = false;
    voiceOnlyMode = false;
    recognition.stop();
    speakText("Voice mode stopped.");
  } else if (command.includes("help")) {
    speakText("Say next, repeat, back, go to step 2, or start over.");
  } else {
    speakText("Command not understood. Say help for options.");
  }

  document.getElementById("assistant-reply").innerText = "Assistant: Command executed – " + command;
}

// Add click animations and dynamic button states
document.querySelectorAll('.voice-button').forEach(button => {
  button.addEventListener('click', function() {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = '';
    }, 150);
  });
});

document.getElementById("start-btn").addEventListener("click", () => {
  if (!currentRecipe) {
    speakText("Please select a recipe first.");
    return;
  }
  
  isVoiceActive = true;
  voiceOnlyMode = true;
  
  try {
    recognition.start();
  } catch (e) {
    console.log("Error starting recognition:", e);
  }
  
  // Update button state
  const startBtn = document.getElementById("start-btn");
  startBtn.innerHTML = '<span class="button-icon">🎤</span>Listening...<div class="status-indicator"></div>';
  startBtn.style.background = 'linear-gradient(135deg, #00ff88, #00d4aa)';
  
  speakStep();
});

document.getElementById("stop-btn").addEventListener("click", () => {
  isVoiceActive = false;
  voiceOnlyMode = false;
  try {
    recognition.stop();
  } catch (e) {
    console.log("Error stopping recognition:", e);
  }
  
  // Update button state
  const startBtn = document.getElementById("start-btn");
  startBtn.innerHTML = '<span class="button-icon">🎙️</span>Start Cooking<div class="status-indicator"></div>';
  startBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
  
  speakText("Voice assistant stopped. Click start cooking to resume.");
});