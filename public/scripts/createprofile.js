document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (!email) {
        window.location.href = "../index.html";
        return;
    }

    // Auto-fill email field
    document.getElementById("email").value = email;

    try {
        // Check if profile already exists
        const response = await fetch(`${window.location.origin}/checkProfile?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error("Server error.");

        const data = await response.json();
        if (data.exists) {
            // Redirect to index.html if profile already exists
            window.location.href = "../index.html";
        }
    } catch (error) {
        console.error("Error checking profile:", error);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const profileAndFirstActivityForm = document.getElementById("profileAndFirstActivityForm");
    const activityForm = document.getElementById("activityForm");
    const errorDiv = document.getElementById("errorMessage");
    const successDiv = document.getElementById("successMessage");
    const savedProfileDisplay = document.getElementById("savedProfileDisplay");
    const savedProfileContent = document.getElementById("savedProfileContent");
    const savedActivityDisplay = document.getElementById("savedActivityDisplay");
    const savedActivityContent = document.getElementById("savedActivityContent");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const togglePassword1 = document.getElementById("togglePassword1");
    const togglePassword2 = document.getElementById("togglePassword2");
    const passwordError = document.getElementById("passwordError");
    const submitButton = document.getElementById("submitButton");


   // Password field functions
    function togglePasswordVisibility(input, button) {
        if (input.type === "password") {
            input.type = "text";
            button.textContent = "🙈";
        } else {
            input.type = "password";
            button.textContent = "👁️";
        }
    }

    togglePassword1.addEventListener("click", () => togglePasswordVisibility(passwordInput, togglePassword1));
    togglePassword2.addEventListener("click", () => togglePasswordVisibility(confirmPasswordInput, togglePassword2));

    function checkPasswordMatch() {
        if (passwordInput.value.length > 0 && confirmPasswordInput.value.length > 0) {
            if (passwordInput.value !== confirmPasswordInput.value) {
                passwordError.style.display = "block";
                passwordError.textContent = "Passwords do not match.";
                submitButton.disabled = true; // Disable submit button
            } else {
                passwordError.style.display = "none";
                submitButton.disabled = false; // Enable submit button
            }
        } else {
            passwordError.style.display = "none";
            submitButton.disabled = true; // Keep disabled if fields are empty
        }
    }

    // Listen for input changes
    passwordInput.addEventListener("input", checkPasswordMatch);
    confirmPasswordInput.addEventListener("input", checkPasswordMatch);

    // Function to save profile
    async function saveProfile(profileInput) {
        try {
            const response = await fetch(`${window.location.origin}/saveProfile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileInput),
            });

            if (!response.ok) {
                throw new Error("Failed to save profile.");
            }

            return await response.json(); // Return the saved profile data
        } catch (error) {
            console.error("Error submitting profile:", error.message);
            throw error;
        }
    }

    // Function to save activity
    async function saveActivity(activityInput) {
        try {
            const response = await fetch(`${window.location.origin}/saveActivity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(activityInput),
            });

            if (!response.ok) {
                throw new Error("Failed to save activity.");
            }

            return await response.json(); // Return the saved activity data
        } catch (error) {
            console.error("Error submitting activity:", error.message);
            throw error;
        }
    }

    // Form submission handler
    profileAndFirstActivityForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Gather profile input
        const profileInput = {
            name: document.getElementById("name").value,
            location: document.getElementById("location").value,
            aboutme: document.getElementById("aboutme").value,
            onlinepresence: document.getElementById("onlinepresence").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            password: document.getElementById("password").value,
        };

        // Gather activity input
        const activityInput = {
            activitydescription: document.getElementById("activitydescription").value,
            activitylocation: document.getElementById("activitylocation").value,
            activitytiming: document.getElementById("activitytiming").value,
            activitybuddydescription: document.getElementById("activitybuddydescription").value,
            activityowner: document.getElementById("email").value,
        };

        try {
            // Save the profile and use the email for activity
            const savedProfile = await saveProfile(profileInput);

            // Save the activity
            await saveActivity(activityInput);

            // ✅ Log the user in after profile creation
            const loginResponse = await fetch(`${window.location.origin}/login`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: profileInput.email, password: profileInput.password }),
            });

            const loginData = await loginResponse.json();
            if (!loginResponse.ok) {
                throw new Error(loginData.error || "Login failed after profile creation.");
            }

            // ✅ Redirect user to "Find Connection" page after successful login
            window.location.href = "../pages/findconnection.html";

        } catch (error) {
            // Display error message
            errorDiv.textContent = "Error submitting profile or logging in: " + error.message;
            successDiv.textContent = ""; // Clear success message
        }
    });
});