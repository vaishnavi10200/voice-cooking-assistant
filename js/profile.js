let currentUser = null;

/* ===========================
   AUTH GUARD + INIT
=========================== */
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  currentUser = user;
  await initProfile(user);
});

/* ===========================
   PROFILE INIT
=========================== */
async function initProfile(user) {
  const displayName = user.displayName || user.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  // Header
  document.getElementById("user-name").textContent = displayName;
  document.getElementById("user-avatar").textContent = initial;

  // Profile card
  document.getElementById("profile-name").textContent = displayName;
  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("profile-avatar-large").textContent = initial;

  // Joined date
  if (user.metadata?.creationTime) {
    const d = new Date(user.metadata.creationTime);
    document.getElementById("profile-joined").textContent =
      `Member since ${d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      })}`;
  }

  // Account type
  const isGoogle = user.providerData.some(p => p.providerId === "google.com");
  document.getElementById("account-type").textContent =
    isGoogle ? "Google" : "Email";

  // Favorites count
  if (window.FirestoreHelper) {
    const favs = await FirestoreHelper.getAllFavorites(user.uid);
    document.getElementById("favorites-count").textContent = favs.length;
  }

  // Avatar from Firebase Auth
  if (user.photoURL) {
    setAvatarImage(user.photoURL);
  }

  // Disable password change for Google users
  if (isGoogle) {
    const btn = document.getElementById("change-password-btn");
    btn.disabled = true;
    btn.title = "Password is managed by Google";
  }

  if (window.FirestoreHelper) {
    const avatar = await FirestoreHelper.getUserAvatar(user.uid);
    if (avatar) {
      setAvatarImage(avatar);
    }
  }
}

/* ===========================
   DROPDOWN (HEADER AVATAR)
=========================== */
document.getElementById("user-avatar").onclick = () => {
  const dd = document.getElementById("profile-dropdown");
  dd.hidden = !dd.hidden;
};

document.addEventListener("click", (e) => {
  const profile = document.getElementById("user-profile");
  if (!profile.contains(e.target)) {
    document.getElementById("profile-dropdown").hidden = true;
  }
});

/* ===========================
   NAVIGATION
=========================== */
document.getElementById("home-link").onclick =
  () => window.location.href = "../index.html";

document.getElementById("favorites-link").onclick =
  () => window.location.href = "favorites.html";

document.getElementById("signout-link").onclick =
document.getElementById("profile-signout-btn").onclick = async () => {
  await firebase.auth().signOut();
  window.location.href = "auth.html";
};

/* ===========================
   MODAL SYSTEM
=========================== */
const modal = document.getElementById("profile-modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalSubmit = document.getElementById("modal-submit");
const modalCancel = document.getElementById("modal-cancel");
const modalClose = document.getElementById("modal-close");
const modalOverlay = document.getElementById("modal-overlay");

function openModal({ title, bodyHTML, onSubmit, hideSubmit = false }) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;

  modalSubmit.hidden = hideSubmit;
  modalSubmit.disabled = false;
  modalSubmit.textContent = "Save";
  modalSubmit.onclick = onSubmit || closeModal;

  modal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.setAttribute("hidden", "");
  modalBody.innerHTML = "";
  modalSubmit.onclick = null;
  document.body.style.overflow = "";
}

modalCancel.onclick = closeModal;
modalClose.onclick = closeModal;
modalOverlay.onclick = closeModal;

/* ===========================
   EDIT DISPLAY NAME
=========================== */
document.getElementById("edit-name-btn").onclick = () => {
  openModal({
    title: "Edit Display Name",
    bodyHTML: `
      <div class="form-group">
        <label>Display Name</label>
        <input id="new-name" value="${currentUser.displayName || ""}" />
      </div>
    `,
    onSubmit: async () => {
      const val = document.getElementById("new-name").value.trim();
      if (!val) return;

      await currentUser.updateProfile({ displayName: val });
      location.reload();
    }
  });
};

/* ===========================
   CHANGE PASSWORD (EMAIL ONLY)
=========================== */
document.getElementById("change-password-btn").onclick = () => {
  openModal({
    title: "Change Password",
    bodyHTML: `
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" id="current-pwd" />
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" id="new-pwd" />
      </div>
      <div class="form-group">
        <label>Confirm Password</label>
        <input type="password" id="confirm-pwd" />
      </div>
      <div id="pwd-error" class="auth-error" style="display:none;"></div>
    `,
    onSubmit: async () => {
      const c = document.getElementById("current-pwd").value;
      const n = document.getElementById("new-pwd").value;
      const f = document.getElementById("confirm-pwd").value;
      const err = document.getElementById("pwd-error");

      err.style.display = "none";

      if (!c || !n || !f) return show("All fields required");
      if (n.length < 6) return show("Password too short");
      if (n !== f) return show("Passwords do not match");

      try {
        modalSubmit.disabled = true;
        modalSubmit.textContent = "Updating...";

        const cred = firebase.auth.EmailAuthProvider.credential(
          currentUser.email,
          c
        );

        await currentUser.reauthenticateWithCredential(cred);
        await currentUser.updatePassword(n);

        closeModal();
      } catch {
        show("Current password is incorrect");
      } finally {
        modalSubmit.disabled = false;
        modalSubmit.textContent = "Save";
      }

      function show(msg) {
        err.textContent = msg;
        err.style.display = "block";
      }
    }
  });
};

/* ===========================
   AVATAR UPLOAD (STEP 3.3)
=========================== */
const avatarLarge = document.getElementById("profile-avatar-large");
avatarLarge.onclick = openAvatarModal;

function openAvatarModal() {
  openModal({
    title: "Change Avatar",
    bodyHTML: `
      <input type="file" id="avatar-input" accept="image/png,image/jpeg" />
      <small>PNG / JPG • Max 2MB</small>

      <div style="text-align:center;margin-top:16px;">
        <img id="avatar-preview"
          style="display:none;width:120px;height:120px;border-radius:50%;object-fit:cover;" />
      </div>

      <div id="avatar-error" class="auth-error" style="display:none;"></div>
    `,
    onSubmit: uploadAvatar
  });

  setupAvatarValidation();
}

function setupAvatarValidation() {
  const input = document.getElementById("avatar-input");
  const preview = document.getElementById("avatar-preview");
  const error = document.getElementById("avatar-error");

  modalSubmit.disabled = true;

  input.onchange = () => {
    error.style.display = "none";
    const file = input.files[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      return show("Only PNG or JPG allowed");
    }

    if (file.size > 2 * 1024 * 1024) {
      return show("Image must be under 2MB");
    }

    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = "block";
      modalSubmit.disabled = false;
    };
    reader.readAsDataURL(file);

    function show(msg) {
      error.textContent = msg;
      error.style.display = "block";
      modalSubmit.disabled = true;
      input.value = "";
    }
  };
}

async function uploadAvatar() {
  const input = document.getElementById("avatar-input");
  const file = input.files[0];
  const error = document.getElementById("avatar-error");

  if (!file) return;

  try {
    modalSubmit.disabled = true;
    modalSubmit.textContent = "Saving...";
    error.style.display = "none";

    const base64 = await fileToBase64(file);

    // Save avatar to Firestore
    await FirestoreHelper.saveUserAvatar(currentUser.uid, base64);

    // Update UI immediately
    setAvatarImage(base64);
    closeModal();

  } catch (e) {
    console.error(e);
    error.textContent = "Failed to save avatar.";
    error.style.display = "block";
  } finally {
    modalSubmit.disabled = false;
    modalSubmit.textContent = "Save";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}




/* ===========================
   AVATAR DISPLAY
=========================== */
function setAvatarImage(src) {
  const large = document.getElementById("profile-avatar-large");
  const small = document.getElementById("user-avatar");

  const img = document.createElement("img");
  img.src = src;
  img.className = "profile-avatar-img";

  img.onload = () => {
    large.innerHTML = "";
    small.innerHTML = "";
    large.appendChild(img.cloneNode());
    small.appendChild(img.cloneNode());
  };
}

