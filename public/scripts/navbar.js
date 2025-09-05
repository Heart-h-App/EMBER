document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("../navbar.html"); // Load navbar file
        if (!response.ok) throw new Error("Failed to load navbar");

        const navbarHTML = await response.text(); // Convert response to HTML
        document.getElementById("navbar").innerHTML = navbarHTML;

        // 🔹 Add logout functionality (optional)
        document.getElementById("logout").addEventListener("click", (e) => {
            e.preventDefault(); // Prevent default link behavior
            fetch(`${window.location.origin}/logout`, { method: "POST", credentials: "include" })
                .then(() => {
                    window.location.href = "../index.html";
                })
                .catch(err => console.error("Logout failed:", err));
        });

    } catch (error) {
        console.error("Error loading navbar:", error);
    }
});
