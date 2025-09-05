const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const dbUrl = process.env.DATABASE_URL;
const dbPath = dbUrl ? new URL(dbUrl).pathname : (process.env.NODE_ENV === 'production' ? '/data/hearth.sqlite' : './database/hearth.sqlite');
const db = new sqlite3.Database(dbPath);
const UNIVERSAL_ACCESS_CODE = "tryHeart(h)2025"

// Initialize tables if they don’t exist
function initializeSchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        aboutme TEXT,
        onlinepresence TEXT,
        email TEXT NOT NULL UNIQUE,
        phone TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS passwords (
        email TEXT PRIMARY KEY,
        hashed_password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activityowner TEXT NOT NULL,
        activitydescription TEXT,
        activitylocation TEXT,
        activitytiming TEXT,
        activitybuddydescription TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS activity_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activityId INTEGER NOT NULL,
        matchEmail TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested'
      );
    `);
  });
}

initializeSchema();

// Access Request Operations
const AccessRequests = {
    validateAccessCode: (accessCode) => {
        return new Promise((resolve) => {
            resolve(accessCode === UNIVERSAL_ACCESS_CODE);
        });
    },

    addRequest: (email) => {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO access_requests (email) VALUES (?)`;
            db.run(query, [email], function (err) {
                if (err) reject(err);
                else resolve({ success: true, email });
            });
        });
    }
};

// Profiles Operations
const Profiles = {
    createProfileWithPassword: async (profile) => {
        return new Promise(async (resolve, reject) => {
            db.serialize(async () => {
                try {
                    db.run("BEGIN TRANSACTION");

                    // Insert profile into profiles table
                    const profileQuery = `
                        INSERT INTO profiles (name, location, aboutme, onlinepresence, email, phone)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    db.run(profileQuery, [
                        profile.name,
                        profile.location,
                        profile.aboutme,
                        profile.onlinepresence,
                        profile.email,
                        profile.phone,
                    ], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return reject(err);
                        }

                        // Hash the password
                        bcrypt.hash(profile.password, 10, (err, hashedPassword) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return reject(err);
                            }

                            // Insert hashed password into passwords table
                            const passwordQuery = `
                                INSERT INTO passwords (email, hashed_password)
                                VALUES (?, ?)
                            `;
                            db.run(passwordQuery, [profile.email, hashedPassword], function (err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return reject(err);
                                }

                                db.run("COMMIT");
                                resolve({ id: this.lastID, ...profile });
                            });
                        });
                    });
                } catch (error) {
                    db.run("ROLLBACK");
                    reject(error);
                }
            });
        });
    },

    getProfileByEmail: (email) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM profiles WHERE email = ?`;
            db.get(query, [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateProfile: (email, updatedProfile) => {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE profiles
                SET name = ?, location = ?, aboutme = ?, onlinepresence = ?, phone = ?
                WHERE email = ?
            `;
            db.run(
                query,
                [
                    updatedProfile.name,
                    updatedProfile.location,
                    updatedProfile.aboutme,
                    updatedProfile.onlinepresence,
                    updatedProfile.phone,
                    email,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve({ message: "Profile updated successfully", email });
                }
            );
        });
    },

    deleteAccountByEmail: (email) => {
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          // Delete matches where the user is the match requester
          db.run(`DELETE FROM activity_matches WHERE matchEmail = ?`, [email], function (err) {
            if (err) {
              db.run("ROLLBACK");
              return reject(err);
            }

            // Delete matches for activities the user owns
            db.run(`
              DELETE FROM activity_matches
              WHERE activityId IN (SELECT id FROM activities WHERE activityowner = ?)
            `, [email], function (err) {
              if (err) {
                db.run("ROLLBACK");
                return reject(err);
              }

              // Delete activities by user
              db.run(`DELETE FROM activities WHERE activityowner = ?`, [email], function (err) {
                if (err) {
                  db.run("ROLLBACK");
                  return reject(err);
                }

                // Delete password
                db.run(`DELETE FROM passwords WHERE email = ?`, [email], function (err) {
                  if (err) {
                    db.run("ROLLBACK");
                    return reject(err);
                  }

                  // Delete profile
                  db.run(`DELETE FROM profiles WHERE email = ?`, [email], function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      return reject(err);
                    }

                    db.run("COMMIT");
                    resolve({ message: "Profile and related data deleted successfully", email });
                  });
                });
              });
            });
          });
        });
      });
    },

    getProfilesByEmails: (emails) => {
        return new Promise((resolve, reject) => {
            const placeholders = emails.map(() => '?').join(',');
            const query = `SELECT * FROM profiles WHERE email IN (${placeholders})`;
            db.all(query, emails, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
};

// Password Operations
const Passwords = {
    getHashedPasswordByEmail: (email) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT hashed_password FROM passwords WHERE email = ?`;
            db.get(query, [email], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.hashed_password : null);
            });
        });
    },

    createPassword: async (email, password) => {
        return new Promise(async (resolve, reject) => {
            try {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                const query = `INSERT INTO passwords (email, hashed_password) VALUES (?, ?)`;
                db.run(query, [email, hashedPassword], function (err) {
                    if (err) reject(err);
                    else resolve({ email, hashedPassword });
                });
            } catch (error) {
                reject(error);
            }
        });
    }
};

// Activities Operations
const Activities = {
    saveActivity: (activity) => {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO activities (activityowner, activitydescription, activitylocation, activitytiming, activitybuddydescription)
                VALUES (?, ?, ?, ?, ?)
            `;
            db.run(
                query,
                [
                    activity.activityowner,
                    activity.activitydescription,
                    activity.activitylocation,
                    activity.activitytiming,
                    activity.activitybuddydescription,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...activity });
                }
            );
        });
    },

    getActivities: (email) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM activities
                WHERE activityowner != ?
                AND id NOT IN (
                    SELECT activityId FROM activity_matches WHERE matchEmail = ?
                )
            `;
            db.all(query, [email, email], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },


    addMatchRequest: (activityId, matchEmail) => {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO activity_matches (activityId, matchEmail, status)
                VALUES (?, ?, 'requested')
            `;
            db.run(query, [activityId, matchEmail], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, activityId, matchEmail, status: 'requested' });
                }
            });
        });
    },

    getActivitiesByOwner: (email) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM activities WHERE activityowner = ?`;
            db.all(query, [email], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getMyActivitiesAndMatches: (email) => {
        return new Promise((resolve, reject) => {
            // Query for activities the user owns (excluding activityowner)
            const ownedActivitiesQuery = `
                SELECT id, activitydescription, activitylocation, activitytiming, activitybuddydescription
                FROM activities
                WHERE activityowner = ?
            `;

            // Query for matches for all owned activities
            const matchRequestsQuery = `
                SELECT m.id AS matchID, m.activityId, m.status, p.name, p.location, p.aboutme, p.onlinepresence,
                       CASE WHEN m.status = 'approved' THEN p.email ELSE NULL END AS email,
                       CASE WHEN m.status = 'approved' THEN p.phone ELSE NULL END AS phone
                FROM activity_matches AS m
                LEFT JOIN profiles AS p ON m.matchEmail = p.email
                WHERE m.activityId IN (
                    SELECT id FROM activities WHERE activityowner = ?
                )
            `;

            // Query for activities the user has requested to join (including activity owner's details)
            const requestedMatchesQuery = `
                SELECT m.id AS matchID, a.id, a.activitydescription, a.activitylocation, a.activitytiming, a.activitybuddydescription,
                       m.status, m.id AS matchID,
                       p.name AS ownerName, p.location AS ownerLocation, p.aboutme AS ownerAboutMe, p.onlinepresence AS ownerOnlinePresence,
                       CASE WHEN m.status = 'approved' THEN p.email ELSE NULL END AS ownerEmail,
                       CASE WHEN m.status = 'approved' THEN p.phone ELSE NULL END AS ownerPhone
                FROM activity_matches AS m
                JOIN activities AS a ON m.activityId = a.id
                LEFT JOIN profiles AS p ON a.activityowner = p.email
                WHERE m.matchEmail = ?
            `;

            // Execute queries
            db.all(ownedActivitiesQuery, [email], (err, ownedActivities) => {
                if (err) return reject(err);

                db.all(matchRequestsQuery, [email], (err, matchRequests) => {
                    if (err) return reject(err);

                    // Attach match requests to owned activities
                    const ownedActivitiesWithMatches = ownedActivities.map(activity => ({
                        ...activity,
                        type: 'owned',
                        matchRequests: matchRequests
                            .filter(match => match.activityId === activity.id)
                            .map(match => ({
                                matchID: match.matchID,
                                matchEmail: match.matchEmail,
                                status: match.status,
                                name: match.name,
                                location: match.location,
                                aboutme: match.aboutme,
                                onlinepresence: match.onlinepresence,
                                email: match.email,
                                phone: match.phone,
                            })),
                    }));

                    db.all(requestedMatchesQuery, [email], (err, requestedActivities) => {
                        if (err) return reject(err);

                        // Attach activity owner details to requested activities
                        const requestedActivitiesWithOwner = requestedActivities.map(activity => ({
                            ...activity,
                            type: 'requested',
                            matchRequests: [
                                {
                                    matchID: activity.matchID,
                                    status: activity.status,
                                    ownerName: activity.ownerName,
                                    ownerLocation: activity.ownerLocation,
                                    ownerAboutMe: activity.ownerAboutMe,
                                    ownerOnlinePresence: activity.ownerOnlinePresence,
                                    ownerEmail: activity.ownerEmail,
                                    ownerPhone: activity.ownerPhone,
                                },
                            ],
                        }));

                        // Combine owned and requested activities
                        const allActivities = [
                            ...ownedActivitiesWithMatches,
                            ...requestedActivitiesWithOwner,
                        ];

                        resolve(allActivities);
                    });
                });
            });
        });
    },

    deleteActivityById: (activityId) => {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM activities WHERE id = ?`;
            db.run(query, [activityId], function (err) {
                if (err) reject(err);
                else resolve({ message: "Activity deleted", activityId });
            });
        });
    },

    deleteMatchById: (matchID) => {
        return new Promise((resolve, reject) => {
            const sql = "DELETE FROM activity_matches WHERE id = ?";
            db.run(sql, [matchID], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
        });
    },

    getMatchRequests: (activityId) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT matchEmail, status FROM activity_matches WHERE activityId = ?`;
            db.all(query, [activityId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    approveMatch: (matchID) => {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE activity_matches
                SET status = 'approved'
                WHERE id = ?
            `;
            db.run(query, [matchID], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ message: 'Match approved successfully', matchID });
                }
            });
        });
    },
};

module.exports = { db, Profiles, Activities, Passwords, AccessRequests };