// Firestore Database Configuration and Helpers

// Initialize Firestore
const db = firebase.firestore();

// Export globally
window.firestoreDb = db;

// Firestore Helper Functions
const FirestoreHelper = {
  
  // Get user's favorites collection reference
  getUserFavoritesRef(userId) {
    return db.collection('users').doc(userId).collection('favorites');
  },
  
  // Add recipe to favorites
  async addFavorite(userId, recipe) {
    try {
      const favRef = this.getUserFavoritesRef(userId);
      await favRef.doc(recipe.title).set({
        title: recipe.title,
        time: recipe.time,
        image: recipe.image,
        steps: recipe.steps,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
  },
  
  // Remove recipe from favorites
  async removeFavorite(userId, recipeTitle) {
    try {
      const favRef = this.getUserFavoritesRef(userId);
      await favRef.doc(recipeTitle).delete();
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  },
  
  // Check if recipe is favorited
  async isFavorite(userId, recipeTitle) {
    try {
      const favRef = this.getUserFavoritesRef(userId);
      const doc = await favRef.doc(recipeTitle).get();
      return doc.exists;
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  },
  
  // Get all favorites for user
  async getAllFavorites(userId) {
    try {
      const favRef = this.getUserFavoritesRef(userId);
      const snapshot = await favRef.orderBy('addedAt', 'desc').get();
      
      const favorites = [];
      snapshot.forEach(doc => favorites.push(doc.data()));
      return favorites;
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  },
  
  // Save cooking history
  async saveCookingHistory(userId, recipe, completedAt) {
    try {
      const historyRef = db.collection('users').doc(userId).collection('history');
      await historyRef.add({
        title: recipe.title,
        time: recipe.time,
        image: recipe.image,
        completedAt: completedAt || firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error saving history:', error);
      return false;
    }
  },
  
  // Get recent cooking history
  async getRecentHistory(userId, limit = 5) {
    try {
      const historyRef = db.collection('users').doc(userId).collection('history');
      const snapshot = await historyRef
        .orderBy('completedAt', 'desc')
        .limit(limit)
        .get();
      
      const history = [];
      snapshot.forEach(doc => history.push(doc.data()));
      return history;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }
};

// 🔥 EXPORT FIRST (THIS IS THE KEY FIX)
window.FirestoreHelper = FirestoreHelper;

// ===========================
// AVATAR HELPERS (Base64)
// ===========================
async function saveUserAvatar(userId, base64Image) {
  await db.collection("users").doc(userId).set(
    { avatar: base64Image },
    { merge: true }
  );
}

async function getUserAvatar(userId) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data().avatar || null;
}

// Attach avatar helpers
window.FirestoreHelper.saveUserAvatar = saveUserAvatar;
window.FirestoreHelper.getUserAvatar = getUserAvatar;

console.log('Firestore initialized successfully');

// ===========================
// LOAD AVATAR INTO HEADER
// ===========================
async function loadUserAvatarToHeader(userId) {
  if (!window.FirestoreHelper) return;

  const avatar = await FirestoreHelper.getUserAvatar(userId);
  if (!avatar) return;

  const avatarEl = document.getElementById("user-avatar");
  if (!avatarEl) return;

  const img = document.createElement("img");
  img.src = avatar;
  img.className = "profile-avatar-img";

  img.onload = () => {
    avatarEl.innerHTML = "";
    avatarEl.appendChild(img);
  };
}

// expose globally
window.loadUserAvatarToHeader = loadUserAvatarToHeader;

