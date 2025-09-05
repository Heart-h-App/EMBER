require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendEmail({ to, subject, text, html }) {
    try {
        await transporter.sendMail({
            from: `"Heart(h) Alerts" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        console.log(`📧 Email sent: ${subject}`);
    } catch (err) {
        console.error("❌ Email error:", err.message);
    }
}

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { Profiles, Activities, Passwords, AccessRequests, db } = require("./backend/hearth.db");

const app = express();
const PORT = 3000;
const path = require("path");

//Trust proxy for forwarded headers
app.set("trust proxy", 1);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:63342",
    credentials: true,
}));


app.use(session({
    secret: "mackmackmack",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax" }
}));


// Routes

// Check if access code is valid
app.post("/checkAccessCode", async (req, res) => {
    try {
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({ error: "Access code is required." });
        }

        const isValid = await AccessRequests.validateAccessCode(accessCode);
        if (isValid) {
            res.status(200).json({ valid: true });
        } else {
            res.status(401).json({ valid: false });
        }
    } catch (error) {
        res.status(500).json({ error: "Server error: " + error.message });
    }
});

// Request Beta Access
app.post("/requestAccess", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        const requestSaved = await AccessRequests.addRequest(email);
        if (requestSaved) {
            res.status(200).json({ success: true, message: "Access request submitted!" });
        } else {
            res.status(500).json({ error: "Failed to save access request." });
        }
    } catch (error) {
        res.status(500).json({ error: "Server error: " + error.message });
    }
});

// Login API: Check password & create session
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        const hashedPassword = await Passwords.getHashedPasswordByEmail(email);
        if (!hashedPassword) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        req.session.user = { email };
        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: "Server error: " + err.message });
    }
});


// 🔹 Logout API
app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// 🔹 Check if user is logged in
app.get("/checkSession", (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, email: req.session.user.email });
    } else {
        res.json({ loggedIn: false });
    }
});


// Check if profile exists
app.get("/checkProfile", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        const profile = await Profiles.getProfileByEmail(email);
        if (profile) {
            res.status(200).json({ exists: true });
        } else {
            res.status(200).json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a profile
app.post("/saveProfile", async (req, res) => {
    try {
        const profile = req.body;

        if (!profile.password) {
            return res.status(400).json({ error: "Password is required." });
        }

        // Save both profile and password using the transaction function
        const savedProfile = await Profiles.createProfileWithPassword(profile);

        // Send internal email to admin (paul) on profile creation
        await sendEmail({
            to: process.env.ADMIN_NOTIFY,
            subject: "🧍 New Profile Created",
            text: `New profile created by ${profile.name} (${profile.email})\nLocation: ${profile.location}\nAbout: ${profile.aboutme}`,
            html: `<p><strong>New profile created</strong></p>
                   <p><strong>Name:</strong> ${profile.name}<br>
                   <strong>Email:</strong> ${profile.email}<br>
                   <strong>Location:</strong> ${profile.location}<br>
                   <strong>About:</strong> ${profile.aboutme}</p>`
        });

        res.status(200).json({ message: "Profile and password saved successfully!", savedProfile });


    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get profile by email
app.get("/getProfile", async (req, res) => {
  try {
    const email = req.query.email;
    const profile = await Profiles.getProfileByEmail(email);
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Update profile
app.post("/updateProfile", async (req, res) => {
    try {
        const { email, name, location, aboutme, onlinepresence, phone } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required for profile update." });
        }

        const updatedProfile = { name, location, aboutme, onlinepresence, phone };
        const result = await Profiles.updateProfile(email, updatedProfile);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Create an activity
app.post("/saveActivity", async (req, res) => {
    try {
        const activity = req.body;
        const savedActivity = await Activities.saveActivity(activity);

        // Send internal email to admin (paul) on profile creation
        await sendEmail({
            to: process.env.ADMIN_NOTIFY,
            subject: "🎯 New Activity Created",
            text: `New activity posted by ${activity.activityowner}\n\nWhat: ${activity.activitydescription}\nWhere: ${activity.activitylocation}\nWhen: ${activity.activitytiming}\nWith Whom: ${activity.activitybuddydescription}`,
            html: `<p><strong>New activity created by ${activity.activityowner}</strong></p>
                   <p><strong>What:</strong> ${activity.activitydescription}<br>
                   <strong>Where:</strong> ${activity.activitylocation}<br>
                   <strong>When:</strong> ${activity.activitytiming}<br>
                   <strong>Ideal Buddy:</strong> ${activity.activitybuddydescription}</p>`
        });

        res.status(200).json(savedActivity);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get activities
app.get("/getActivities", async (req, res) => {
    try {
        const { email } = req.query;
        const activities = await Activities.getActivities(email);  // Pass email filter
        res.status(200).json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send match request for an activity
app.post("/matchRequest", async (req, res) => {
    try {
        const { activityId, matchEmail } = req.body;
        const result = await Activities.addMatchRequest(activityId, matchEmail);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all activities for a specific user
app.get("/getMyActivities", async (req, res) => {
    try {
        const { email } = req.query;
        const activities = await Activities.getActivitiesByOwner(email);
        res.status(200).json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all activities and matches for a specific user
app.get("/getMyActivitiesAndMatches", async (req, res) => {
    try {
        const { email } = req.query;
        const activitiesWithRequests = await Activities.getMyActivitiesAndMatches(email);
        res.status(200).json(activitiesWithRequests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an activity
app.post("/deleteActivity", async (req, res) => {
    try {
        const { activityId } = req.body;
        if (!activityId) {
            return res.status(400).json({ error: "Activity ID is required." });
        }

        const result = await Activities.deleteActivityById(activityId);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a match
app.post("/deleteMatch", async (req, res) => {
    try {
        const { matchID } = req.body;
        if (!matchID) {
            return res.status(400).json({ error: "Match ID is required." });
        }

        const result = await Activities.deleteMatchById(matchID);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an account
app.post("/deleteAccount", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const result = await Profiles.deleteAccountByEmail(email);

    // Destroy session after deletion
    req.session.destroy(() => {
      res.status(200).json(result);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get match requests for a specific activity
app.get("/getMatchRequests", async (req, res) => {
    try {
        const { activityId } = req.query;
        const matchRequests = await Activities.getMatchRequests(activityId);
        res.status(200).json(matchRequests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve a match request
app.post("/approveMatch", async (req, res) => {
    try {
        const { matchID } = req.body;

        if (!matchID) {
            return res.status(400).json({ error: "Match ID is required." });
        }

        const result = await Activities.approveMatch(matchID);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback route for any non-API request (single-page app behavior)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Close the database connection on server shutdown
const closeDatabase = () => {
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        } else {
            console.log("Database connection closed.");
        }
    });
};

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("Shutting down gracefully...");
    closeDatabase();
    process.exit();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
