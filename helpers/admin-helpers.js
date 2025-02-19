var db = require('../config/connection')

var collection = require('../config/collection')

const bcrypt = require('bcrypt')

const { ObjectId } = require('mongodb')
const async = require('hbs/lib/async')
const { reject } = require('bcrypt/promises')

module.exports = {
    doSignup: (adminData) => {
        return new Promise(async (resolve, reject) => {
            adminData.Password = await bcrypt.hash(adminData.Password, 10)
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) => {
                adminData._id = data.insertedId
                resolve(adminData)
            })
        })

    },

    doLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })

            if (admin) {
                bcrypt.compare(adminData.Password, admin.Password).then((status) => {
                    if (status) {
                        console.log("Login Success");
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("Login Failed");
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("No User");
                resolve({ status: false })
            }
        })
    },

    findAdminCount: () => {
        return new Promise(async (resolve, reject) => {

            let count = await db.get().collection(collection.ADMIN_COLLECTION).count()

            if (count > 0) {
                resolve({ status: true })
            } else {
                resolve({ status: false })
            }
        })
    },

    addClue: (clue, callback) => {
        db.get().collection(collection.CLUE_COLLECTION).insertOne(clue).then((data) => {
            callback(data.insertedId.toString())
        })
    },

    getAllClues: () => {
        return new Promise(async (resolve, reject) => {
            let clues = await db.get().collection(collection.CLUE_COLLECTION).find().toArray()
            resolve(clues)
        })
    },

    getClueDetails: (clueId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) }).then((clue) => {
                resolve(clue)
            })
        })
    },

    updateClue: (clueId, clueDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CLUE_COLLECTION).updateOne({ _id: new ObjectId(clueId) }, {
                $set: {
                    clueNumber: clueDetails.clueNumber,
                    clue: clueDetails.clue,
                    answer: clueDetails.answer
                }
            }).then((response) => {
                resolve()
            })
        })
    },

    deleteClue: (clueId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CLUE_COLLECTION).deleteOne({ _id: new ObjectId(clueId) }).then((response) => {
                resolve(response)
            })
        })
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
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },

    getUserResponses: () => {
        return new Promise(async (resolve, reject) => {
            let responses = await db.get().collection(collection.USER_RESPONSE_COLLECTION).find().toArray()
            resolve(responses)
        })
    },

    getLeaderboard: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let leaderboard = await db.get().collection(collection.USER_COLLECTION).aggregate([
                    {
                        $project: {
                            _id: 1,
                            teamName: "$Name",
                            collegeName: "$collegeName",
                            lastCompletedClue: {
                                $toInt: {
                                    $ifNull: [
                                        { $toString: "$lastCompletedClue" }, // Convert to string first
                                        "0" // Default to "0" if null/undefined
                                    ]
                                }
                            },
                            timeTaken: "$formattedTime",
                            totalTimeTaken: {
                                $toInt: {
                                    $ifNull: [
                                        { $toString: "$totalTimeTaken" }, // Convert to string first
                                        "0" // Default to "0" if null/undefined
                                    ]
                                }
                            }
                        }
                    },
                    { $sort: { lastCompletedClue: -1, totalTimeTaken: 1 } } // Rank by level & time
                ]).toArray();

                resolve(leaderboard);
            } catch (error) {
                reject(error);
            }
        });
    },



}