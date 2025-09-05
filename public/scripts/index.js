document.addEventListener("DOMContentLoaded", () => {
    const emberEmail = document.getElementById("emberEmail");
    const emberMessage = document.getElementById("emberMessage");
    const emberLfgButton = document.getElementById("emberLfgButton");
    const passwordContainer = document.getElementById("passwordContainer");
    const tendEmail = document.getElementById("tendEmail");
    const tendLfgButton = document.getElementById("tendLfgButton");
    const tendMessage = document.getElementById("tendMessage");


    // 📥Waitlist add for Tend
    tendLfgButton.addEventListener("click", async () => {
      const email = tendEmail.value.trim();
      if (!email) {
        message.textContent = "Please enter a valid email";
        return;
      }

      const res = await fetch("/requestAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      tendMessage.textContent = res.ok
        ? "You're on the Tend waitlist - we'll be in touch"
        : "How embarrassing, that failed - please try again";
    });

    // 🔹 Step 1 for Ember: User enters email, clicks LFG, check profile existence
    emberLfgButton.addEventListener("click", async () => {
        const email = emberEmail.value.trim();
        if (!email) {
            message.textContent = "Please enter a valid email";
            return;
        }

        try {
            const profileResponse = await fetch(`${window.location.origin}/checkProfile?email=${encodeURIComponent(email)}`);
            if (!profileResponse.ok) throw new Error("Server error.");
            const profileData = await profileResponse.json();

            if (profileData.exists) {
                // ✅ Existing user → Ask for password
                emberEmail.disabled = true;
                passwordContainer.style.display = "block";
                emberLfgButton.style.display = "none";
            } else {
                // ❌ New user → Redirect to profile creation
                window.location.href = "pages/createprofile.html?email=" + encodeURIComponent(email);
            }
        } catch (error) {
            message.textContent = "Error checking profile: " + error.message;
        }
    });

    // 🔹 Step 2a: Existing user login
    const loginButton = document.getElementById("loginButton");
    const passwordInput = document.getElementById("password");

    if (loginButton) {
        loginButton.addEventListener("click", async () => {
            const email = emberEmail.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                message.textContent = "Please enter both email and password";
                return;
            }

            try {
                const response = await fetch(`${window.location.origin}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = "pages/findconnection.html";
                } else {
                    message.textContent = "Invalid email or password";
                }
            } catch (error) {
                message.textContent = "Error logging in: " + error.message;
            }
        });
    }

    // 👁️ Toggle password visibility
    const togglePasswordButton = document.getElementById("togglePassword");
    if (togglePasswordButton) {
        togglePasswordButton.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePasswordButton.textContent = "🙈";
            } else {
                passwordInput.type = "password";
                togglePasswordButton.textContent = "👁️";
            }
        });
    }
});