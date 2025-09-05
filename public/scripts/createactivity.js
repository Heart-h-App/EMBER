document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("activityForm");
    const errorDiv = document.getElementById("errorMessage");
    const successDiv = document.getElementById("successMessage");
    const savedActivityDisplay = document.getElementById("savedActivityDisplay");
    const savedActivityContent = document.getElementById("savedActivityContent");

    let userEmail = null; // Store email in memory

    try {
        // 🔹 Check if the user is logged in
        const sessionResponse = await fetch(`${window.location.origin}/checkSession`, {
            method: "GET",
            credentials: "include", // 🔹 Include session cookie
        });
        const sessionData = await sessionResponse.json();

        if (!sessionData.loggedIn) {
            console.error("User is not logged in. Redirecting to login.");
            window.location.href = "../index.html"; // Redirect to login page
            return;
        }

        // 🔹 Store user's email in memory instead of showing it in the UI
        userEmail = sessionData.email;

    } catch (error) {
        console.error("Error checking session:", error);
        errorDiv.textContent = "Error verifying session. Please try again.";
        return; // Prevent form submission if session check fails
    }

    // Function to save activity
    async function saveActivity(input) {
        try {
            const response = await fetch(`${window.location.origin}/saveActivity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // 🔹 Ensure session is sent
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                throw new Error("Failed to save activity.");
            }

            return await response.json(); // Return the saved activity data
        } catch (error) {
            console.error("Error saving activity:", error.message);
            throw error;
        }
    }

    // 🔹 Handle form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!userEmail) {
            errorDiv.textContent = "Error: User email is missing from session.";
            return;
        }

        const input = {
            activityowner: userEmail, // 🔹 Use session email instead of input field
            activitydescription: document.getElementById("activitydescription").value,
            activitylocation: document.getElementById("activitylocation").value,
            activitytiming: document.getElementById("activitytiming").value,
            activitybuddydescription: document.getElementById("activitybuddydescription").value,
        };

        try {
            const savedActivity = await saveActivity(input);

            successDiv.textContent = "Activity submitted successfully!";
            errorDiv.textContent = ""; // Clear error message

            // 🔹 Display saved activity
            savedActivityContent.innerHTML = `
                <strong>Activity:</strong> ${savedActivity.activitydescription}<br>
                <strong>Location:</strong> ${savedActivity.activitylocation}<br>
                <strong>Timing:</strong> ${savedActivity.activitytiming}<br>
                <strong>Ideal Buddy:</strong> ${savedActivity.activitybuddydescription}<br>
            `;
            savedActivityDisplay.style.display = "block";
        } catch (error) {
            errorDiv.textContent = "Error submitting activity: " + error.message;
            successDiv.textContent = ""; // Clear success message
        }
    });
});
