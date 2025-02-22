var db = require('../config/connection');
var collection = require('../config/collection');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

module.exports = {
    doSignup: (adminData) => {
        return new Promise(async (resolve, reject) => {
            try {
                adminData.Password = await bcrypt.hash(adminData.Password, 10);
                let data = await db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData);
                adminData._id = data.insertedId;
                resolve(adminData);
            } catch (error) {
                reject(error);
            }
        });
    },

    doLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {};
                let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email });

                if (admin) {
                    let status = await bcrypt.compare(adminData.Password, admin.Password);
                    if (status) {
                        console.log("Login Success");
                        response.admin = admin;
                        response.status = true;
                        resolve(response);
                    } else {
                        console.log("Login Failed");
                        resolve({ status: false });
                    }
                } else {
                    console.log("No User Found");
                    resolve({ status: false });
                }
            } catch (error) {
                reject(error);
            }
        });
    },

    findAdminCount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(collection.ADMIN_COLLECTION).countDocuments();
                resolve({ status: count > 0 });
            } catch (error) {
                reject(error);
            }
        });
    },

    addClue: (clue, callback) => {
        db.get().collection(collection.CLUE_COLLECTION).insertOne(clue)
            .then((data) => callback(data.insertedId.toString()))
            .catch((error) => console.error("Error adding clue:", error));
    },

    getAllClues: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let clues = await db.get().collection(collection.CLUE_COLLECTION).find().toArray();
                resolve(clues);
            } catch (error) {
                reject(error);
            }
        });
    },

    getClueDetails: (clueId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });
                resolve(clue);
            } catch (error) {
                reject(error);
            }
        });
    },

    updateClue: (clueId, clueDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.CLUE_COLLECTION).updateOne(
                    { _id: new ObjectId(clueId) },
                    { $set: { clueNumber: clueDetails.clueNumber, clue: clueDetails.clue, answer: clueDetails.answer, taskName: clueDetails.taskName, taskAnswer: clueDetails.taskAnswer } }
                );
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    deleteClue: (clueId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = await db.get().collection(collection.CLUE_COLLECTION).deleteOne({ _id: new ObjectId(clueId) });
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    },

    getGameSettings: async () => {
        return await db.get().collection(collection.GAME_SETTINGS_COLLECTION).findOne({});
    },

    setGameStartTime: async (gameStartTime) => {
        await db.get().collection(collection.GAME_SETTINGS_COLLECTION).updateOne(
            {},
            { $set: { gameStartTime: new Date(gameStartTime) } },
            { upsert: true }
        );
    },

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
                resolve(users);
            } catch (error) {
                reject(error);
            }
        });
    },

    getUserResponses: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let responses = await db.get().collection(collection.USER_RESPONSE_COLLECTION).find().toArray();
                resolve(responses);
            } catch (error) {
                reject(error);
            }
        });
    },

    getLeaderboard: async () => {
        try {
            let leaderboard = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $project: {
                        _id: 1,
                        teamName: "$Name",
                        collegeName: "$collegeName",
                        lastCompletedClue: {
                            $toInt: { $ifNull: [{ $toString: "$lastCompletedClue" }, "0"] }
                        },
                        timeTaken: "$formattedTime",
                        totalTimeTaken: {
                            $toInt: { $ifNull: [{ $toString: "$totalTimeTaken" }, "0"] }
                        }
                    }
                },
                { $sort: { lastCompletedClue: -1, totalTimeTaken: 1 } }
            ]).toArray();

            return leaderboard;
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            throw error;
        }
    }
};
