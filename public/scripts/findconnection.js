document.addEventListener("DOMContentLoaded", async () => {
    const activityList = document.getElementById("activityList");

    try {
        const sessionResponse = await fetch(`${window.location.origin}/checkSession`, {
            credentials: "include",
        });
        const sessionData = await sessionResponse.json();

        if (!sessionData.loggedIn) {
            window.location.href = "../index.html";
            return;
        }

        const userEmail = sessionData.email; // 🔹 Get the logged-in user's email

        // 🔹 Fetch activities using the user's email
        const response = await fetch(`${window.location.origin}/getActivities?email=${encodeURIComponent(userEmail)}`);
        if (!response.ok) throw new Error("Failed to fetch activities.");

        const activities = await response.json();
        activityList.innerHTML = ""; // Clear previous activities

        if (activities.length === 0) {
            activityList.innerHTML = "<p>No activities found.</p>";
        } else {
            activityList.style.display = "grid";
            activityList.style.gridTemplateColumns = "repeat(auto-fill, minmax(300px, 1fr))";
            activityList.style.gap = "16px";

            activities.forEach(activity => {
                const activityDiv = document.createElement("div");
                activityDiv.classList.add("activity");
                activityDiv.style.border = "1px solid #ccc";
                activityDiv.style.borderRadius = "8px";
                activityDiv.style.padding = "16px";

                activityDiv.innerHTML = `
                    <h3>${activity.activitydescription}</h3>
                    <p><strong>Where:</strong> ${activity.activitylocation}</p>
                    <p><strong>When:</strong> ${activity.activitytiming}</p>
                    <p><strong>Ideal Buddy:</strong> ${activity.activitybuddydescription}</p>
                    <button class="matchButton">I want to do this</button>
                `;

                const matchButton = activityDiv.querySelector(".matchButton");
                matchButton.addEventListener("click", async () => {
                    try {
                        const matchRequest = {
                            activityId: activity.id,
                            matchEmail: userEmail, // 🔹 Use session email
                        };

                        const matchResponse = await fetch(`${window.location.origin}/matchRequest`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(matchRequest),
                        });

                        if (!matchResponse.ok) throw new Error("Failed to submit match request.");
                        alert("Match request submitted successfully!");

                        window.location.href = `${window.location.origin}/pages/myactivities.html`;

                    } catch (error) {
                        alert(`Error submitting match request: ${error.message}`);
                    }
                });

                activityList.appendChild(activityDiv);
            });
        }
    } catch (error) {
        activityList.innerHTML = `<p>Error loading activities: ${error.message}</p>`;
    }
});