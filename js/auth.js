// Authentication Logic for Voice Kitchen

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  
  // Get auth from global window object
  const auth = window.firebaseAuth;
  
  if (!auth) {
    console.error('Firebase Auth not initialized');
    return;
  }

  // DOM Elements
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authError = document.getElementById('auth-error');
  const googleSigninBtn = document.getElementById('google-signin');
  const googleSignupBtn = document.getElementById('google-signup');

  // Tab Switching
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active states
      authTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show/hide forms
      if (targetTab === 'signin') {
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
      } else {
        signupForm.classList.add('active');
        signinForm.classList.remove('active');
      }
      
      // Clear error
      hideError();
    });
  });

  // Sign In with Email/Password
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const submitBtn = signinForm.querySelector('.btn-auth');
    
    try {
      showLoading(submitBtn);
      hideError();
      
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('Sign in successful:', userCredential.user);
      
      // Redirect to main app
      window.location.href = '../index.html';
      
    } catch (error) {
      console.error('Sign in error:', error);
      showError(getErrorMessage(error.code));
      // hideLoading(submitBtn);
    }finally {
      hideLoading(submitBtn); // ✅ always reset spinner
    }
  });

  // Sign Up with Email/Password
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const submitBtn = signupForm.querySelector('.btn-auth');
    
    // Validation
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    
    try {
      showLoading(submitBtn);
      hideError();
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Update user profile with name
      await userCredential.user.updateProfile({
        displayName: name
      });
      
      console.log('Sign up successful:', userCredential.user);
      
      // Redirect to main app
      window.location.href = '../index.html';
      
    } catch (error) {
      console.error('Sign up error:', error);
      showError(getErrorMessage(error.code));
      // hideLoading(submitBtn);
    }
    finally {
      hideLoading(submitBtn); // ✅ always reset spinner
    }
  });

  // Google Sign In
  if (googleSigninBtn) {
    googleSigninBtn.addEventListener('click', async () => {
      await signInWithGoogle();
    });
  }

  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', async () => {
      await signInWithGoogle();
    });
  }

  async function signInWithGoogle() {
    const googleBtns = [googleSigninBtn, googleSignupBtn];
    const clickedBtn = event ? event.currentTarget : googleSigninBtn;
    
    try {
      // Show loading on the clicked button
      if (clickedBtn && clickedBtn.classList) {
        clickedBtn.disabled = true;
        clickedBtn.style.opacity = '0.6';
        clickedBtn.innerHTML = `
          <svg class="spinner" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
            <circle class="spinner-circle" cx="12" cy="12" r="10"></circle>
          </svg>
          Connecting...
        `;
      }
      
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      
      console.log('Google sign in successful:', result.user);
      
      // Redirect to main app
      window.location.href = '../index.html';
      
    } catch (error) {
      console.error('Google sign in error:', error);
      
      // Reset button state
      if (clickedBtn && clickedBtn.classList) {
        clickedBtn.disabled = false;
        clickedBtn.style.opacity = '1';
        clickedBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          ${clickedBtn.id === 'google-signin' ? 'Continue with Google' : 'Sign up with Google'}
        `;
      }
      
      // Don't show error if user closed the popup
      if (error.code !== 'auth/popup-closed-by-user' && 
          error.code !== 'auth/cancelled-popup-request') {
        showError(getErrorMessage(error.code));
      }
    }
  }

  // Helper Functions
  function showError(message) {
    authError.textContent = message;
    authError.hidden = false;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideError();
    }, 5000);
  }

  function hideError() {
    authError.hidden = true;
    authError.textContent = '';
  }

  function showLoading(button) { 
    const btnText = button.querySelector('.btn-text'); 
    const btnLoader = button.querySelector('.btn-loader'); 
    if (btnText && btnLoader) { 
      btnText.style.display = 'none'; 
      btnLoader.style.display = 'inline-block'; 
      button.disabled = true; 
    } 
  }

  function hideLoading(button) { 
    const btnText = button.querySelector('.btn-text'); 
    const btnLoader = button.querySelector('.btn-loader'); 
    if (btnText && btnLoader) { 
      btnText.style.display = 'inline-block'; 
      btnLoader.style.display = 'none'; 
      button.disabled = false; 
    } 
  }

  function getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-not-found': 'No account found with this email. Please sign up.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
      'auth/unauthorized-domain': 'This domain is not authorized. Please use email/password sign-in or contact support.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }

  // Check if user is already logged in
  auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('auth.html')) {
      // User is already signed in, redirect to main app
      window.location.href = '../index.html';
    }
  });
});