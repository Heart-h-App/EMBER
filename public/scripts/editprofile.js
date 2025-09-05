document.addEventListener("DOMContentLoaded", async () => {
  const emailField = document.getElementById("email");
  const nameField = document.getElementById("name");
  const locationField = document.getElementById("location");
  const aboutmeField = document.getElementById("aboutme");
  const onlinepresenceField = document.getElementById("onlinepresence");
  const phoneField = document.getElementById("phone");
  const form = document.getElementById("editProfileForm");

  // Load current profile data
  try {
    const sessionRes = await fetch(`${window.location.origin}/checkSession`, {
      credentials: "include",
    });
    const sessionData = await sessionRes.json();

    if (!sessionData.loggedIn) {
      window.location.href = "/index.html";
      return;
    }

    const email = sessionData.email;
    const profileRes = await fetch(`${window.location.origin}/getProfile?email=${email}`);
    const profile = await profileRes.json();

    emailField.value = profile.email || "";
    nameField.value = profile.name || "";
    locationField.value = profile.location || "";
    aboutmeField.value = profile.aboutme || "";
    onlinepresenceField.value = profile.onlinepresence || "";
    phoneField.value = profile.phone || "";
  } catch (err) {
    alert("Error loading profile: " + err.message);
  }

  // Save edited profile
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const updatedProfile = {
      email: emailField.value,
      name: nameField.value,
      location: locationField.value,
      aboutme: aboutmeField.value,
      onlinepresence: onlinepresenceField.value,
      phone: phoneField.value,
    };

    try {
      const res = await fetch(`${window.location.origin}/updateProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updatedProfile),
      });

      const result = await res.json();
      if (res.ok) {
        alert("Profile updated!");
        window.location.href = "/pages/myactivities.html";
      } else {
        alert("Update failed: " + result.error);
      }
    } catch (err) {
      alert("Error updating profile: " + err.message);
    }
  });

  // Delete account button handler
  const deleteButton = document.getElementById("deleteAccountButton");
  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm("Are you sure you want to delete your account? This cannot be undone.");
      if (!confirmed) return;

      try {
        const res = await fetch(`${window.location.origin}/deleteAccount`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email: emailField.value }),
        });

        const result = await res.json();
        if (res.ok) {
          alert("Your account has been deleted.");
          window.location.href = "/index.html";
        } else {
          alert("Delete failed: " + result.error);
        }
      } catch (err) {
        alert("Error deleting profile: " + err.message);
      }
    });
  }
});