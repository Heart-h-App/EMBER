document.addEventListener("DOMContentLoaded", async () => {
    const activityList = document.getElementById("myActivityList");

    try {
        const sessionResponse = await fetch(`${window.location.origin}/checkSession`, {
            credentials: "include",
        });
        const sessionData = await sessionResponse.json();

        if (!sessionData.loggedIn) {
            window.location.href = "../index.html";
            return;
        }

        const userEmail = sessionData.email;

        try {
            const response = await fetch(`${window.location.origin}/getMyActivitiesAndMatches?email=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error('Failed to fetch activities.');

            const activities = await response.json();

            activityList.innerHTML = ''; // Clear previous activities
            if (activities.length === 0) {
                activityList.innerHTML = '<p>No activities found.</p>';
            } else {
                activityList.style.display = 'grid';
                activityList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
                activityList.style.gap = '16px';

                activities.forEach(activity => {
                    const activityDiv = document.createElement('div');
                    activityDiv.classList.add('activity');
                    activityDiv.style.border = '1px solid #ccc';
                    activityDiv.style.borderRadius = '8px';
                    activityDiv.style.padding = '16px';

                    // Render activity details
                    activityDiv.innerHTML = `
                        <h3>${activity.activitydescription}</h3>
                        <p><strong>Where:</strong> ${activity.activitylocation}</p>
                        <p><strong>When:</strong> ${activity.activitytiming}</p>
                        ${
                            activity.type === 'owned' && activity.matchRequests.length > 0
                                ? `<h4>Matches:</h4><ul>${activity.matchRequests
                                      .map(
                                          match => `
                                            <li>
                                              <p><strong>Name:</strong> ${match.name}</p>
                                              <p><strong>Location:</strong> ${match.location}</p>
                                              <p><strong>About Me:</strong> ${match.aboutme}</p>
                                              <p><strong>Online Presence:</strong> ${match.onlinepresence}</p>
                                              ${
                                                  match.status === 'approved'
                                                      ? `
                                                      <p><strong>Email:</strong> ${match.email}</p>
                                                      <p><strong>Phone:</strong> ${match.phone}</p>
                                                      `
                                                      : `<button class="approveMatchButton" data-id="${match.matchID}">
                                                           Approve Match
                                                         </button>`
                                              }
                                              <button class="deleteMatchButton" data-id="${match.matchID}">
                                                Delete Match
                                              </button>
                                            </li>
                                          `
                                      )
                                      .join('')}</ul>`
                                : activity.type === 'requested'
                                ? `
                                    <h4>Activity Owner:</h4>
                                    <p><strong>Name:</strong> ${activity.ownerName}</p>
                                    <p><strong>Location:</strong> ${activity.ownerLocation}</p>
                                    <p><strong>About Me:</strong> ${activity.ownerAboutMe}</p>
                                    <p><strong>Online Presence:</strong> ${activity.ownerOnlinePresence}</p>
                                    ${
                                        activity.status === 'approved'
                                            ? `<p><strong>Email:</strong> ${activity.ownerEmail}</p>
                                               <p><strong>Phone:</strong> ${activity.ownerPhone}</p>`
                                            : ''
                                    }
                                    <button class="deleteMatchButton" data-id="${activity.matchID}">
                                      Delete Match
                                    </button>
                                `
                                : `<p>No matches found.</p>`
                        }
                    `;

                    // Add "Approve Match" button listeners for owned activities
                    if (activity.type === 'owned') {
                        activityDiv.querySelectorAll('.approveMatchButton').forEach(button => {
                            button.addEventListener('click', async () => {
                                const matchID = button.getAttribute('data-id');

                                try {
                                    const approveMatch = { matchID };
                                    const matchResponse = await fetch(`${window.location.origin}/approveMatch`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(approveMatch),
                                    });

                                    if (!matchResponse.ok) throw new Error('Failed to approve match.');
                                    alert('Match approved successfully!');
                                    window.location.reload();
                                } catch (error) {
                                    alert(`Error approving match: ${error.message}`);
                                }
                            });
                        });
                    }

                    // Add Delete Match button listeners (for both owned + requested)
                    activityDiv.querySelectorAll('.deleteMatchButton').forEach(button => {
                        button.addEventListener('click', async () => {
                            const matchID = button.getAttribute('data-id');
                            const confirmed = confirm("Are you sure you want to delete this match?");
                            if (!confirmed) return;

                            try {
                                const response = await fetch(`${window.location.origin}/deleteMatch`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ matchID }),
                                });

                                if (!response.ok) throw new Error('Failed to delete match.');
                                alert('Match deleted successfully!');
                                window.location.reload();
                            } catch (error) {
                                alert(`Error deleting match: ${error.message}`);
                            }
                        });
                    });

                    // Add 'Delete Activity' Button for owned activities
                    if (activity.type === "owned") {
                        const deleteButton = document.createElement("button");
                        deleteButton.textContent = "Delete Activity";
                        deleteButton.addEventListener("click", async () => {
                            const confirmed = confirm("Are you sure you want to delete this activity?");
                            if (!confirmed) return;

                            try {
                                const response = await fetch(`${window.location.origin}/deleteActivity`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ activityId: activity.id }),
                                });

                                if (!response.ok) throw new Error("Failed to delete activity");
                                alert("Activity deleted successfully");
                                window.location.reload();
                            } catch (err) {
                                alert("Error deleting activity: " + err.message);
                            }
                        });

                        activityDiv.appendChild(deleteButton);
                    }


                    activityList.appendChild(activityDiv);
                });
            }
        } catch (error) {
            activityList.innerHTML = `<p>Error loading activities: ${error.message}</p>`;
        }
    } catch (error) {
        console.error("Error checking session:", error);
    }
});
