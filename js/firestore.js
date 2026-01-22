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
      console.log('Recipe added to favorites:', recipe.title);
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
      console.log('Recipe removed from favorites:', recipeTitle);
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
      snapshot.forEach(doc => {
        favorites.push(doc.data());
      });
      
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
      console.log('Cooking history saved:', recipe.title);
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
      snapshot.forEach(doc => {
        history.push(doc.data());
      });
      
      return history;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }
};

// Export helper globally
window.FirestoreHelper = FirestoreHelper;

console.log('Firestore initialized successfully');