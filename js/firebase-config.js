// Firebase Configuration
// Replace these values with your actual Firebase project credentials


const firebaseConfig = {
  apiKey: "AIzaSyCov-HK4knoGWnYfK4xwZQZRb3GkNpbc_U",
  authDomain: "voice-kitchen.firebaseapp.com",
  projectId: "voice-kitchen",
  storageBucket: "voice-kitchen.firebasestorage.app",
  messagingSenderId: "635452650051",
  appId: "1:635452650051:web:2fbcb08af48b5364599af6",
  measurementId: "G-Y8Y7TLT54Y"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication and export globally
window.firebaseAuth = firebase.auth();

window.firestoreDb = firebase.firestore();

console.log("Firebase initialized successfully");

