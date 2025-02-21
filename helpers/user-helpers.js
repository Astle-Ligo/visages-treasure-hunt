const db = require('../config/connection');
const collection = require('../config/collection');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0h 0m 0s"; // Handle invalid cases

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

const getDb = () => {
    const database = db.get();
    if (!database) {
        console.error("❌ Database is null when calling db.get()");
        throw new Error("Database connection not established");
    }
    return database;
};

module.exports = {
    doSignup: async (userData) => {
        userData.Password = await bcrypt.hash(userData.Password, 10);
        const result = await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
        userData._id = result.insertedId;
        return userData;
    },

    doLogin: async (userData) => {
        let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
        if (user && await bcrypt.compare(userData.Password, user.Password)) {
            return { status: true, user };
        }
        return { status: false };
    },

    // Get Game Settings from DB
    getGameSettings: async () => {
        return await db.get().collection(collection.GAME_SETTINGS_COLLECTION).findOne({});
    },

    // Get the first clue
    getFirstClue: async () => {
        return await db.get().collection(collection.CLUE_COLLECTION).find().sort({ clueNumber: 1 }).limit(1).toArray();
    },

    // Get Clue by ID
    getClue: async (clueId) => {
        try {
            const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });
            return clue;
        } catch (error) {
            console.error("Error in getClue function:", error);
            throw new Error("Failed to fetch clue");
        }
    },

    // ✅ Check Clue Answer
    checkClueAnswer: async (userId, clueId, answer, startTime) => {
        try {
            const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });
            if (!clue) return { error: "Clue not found" };

            const isCorrect = clue.answer.toLowerCase() === answer.toLowerCase();
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);

            await module.exports.storeUserResponse(userId, clueId, clue.clueNumber, null, answer, isCorrect, timeTaken, formatTime(timeTaken));

            if (isCorrect) {
                return {
                    success: "✅ Correct answer! Proceeding to task...",
                    nextStep: `/task/${clue.taskName}/${clue._id}`
                };
            } else {
                return { error: "❌ Incorrect answer, try again!" };
            }
        } catch (error) {
            console.error("❌ Error in checkClueAnswer:", error);
            return { error: "Error processing answer" };
        }
    },

    checkTaskAnswer: async (userId, clueId, taskAnswer, startTime) => {
        try {
            console.log("Checking task answer for clueId:", clueId);

            let objectId;
            try {
                objectId = new ObjectId(clueId);
            } catch (error) {
                console.error("Invalid clueId format:", clueId);
                return { error: "Invalid clue ID" };
            }

            const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: objectId });

            if (!clue) {
                console.log("❌ Clue not found in DB for _id:", clueId);
                return { error: "Clue not found" };
            }

            const isCorrect = clue.taskAnswer.toLowerCase() === taskAnswer.toLowerCase();
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            const formattedTime = formatTime(timeTaken);

            await module.exports.storeUserResponse(userId, clueId, null, clue.taskName, taskAnswer, isCorrect, timeTaken, formattedTime);

            if (isCorrect) {
                console.log("✅ Task answer is correct!");

                await db.get().collection(collection.USER_COLLECTION).updateOne(
                    { _id: new ObjectId(userId) },
                    {
                        $set: { lastCompletedClue: clue.clueNumber },
                        $inc: { totalTimeTaken: timeTaken }
                    }
                );

                const nextClueNumber = (parseInt(clue.clueNumber) + 1).toString();
                const nextClue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ clueNumber: nextClueNumber });

                if (nextClue) {
                    console.log("✅ Next clue found:", nextClue._id);

                    await db.get().collection(collection.USER_COLLECTION).updateOne(
                        { _id: new ObjectId(userId) },
                        { $set: { currentClueId: nextClue._id } }
                    );

                    return {
                        success: "🎉 Task completed! Moving to the next clue...",
                        nextStep: `/clue/${nextClue._id}`
                    };
                } else {
                    console.log("🎉 Treasure hunt completed!");
                    return { celebration: true, message: "🏆 Congratulations! You completed the treasure hunt!" };
                }
            } else {
                console.log("❌ Wrong task answer, try again!");
                return { error: "❌ Incorrect answer, try again!" };
            }
        } catch (error) {
            console.error("❌ Error in checkTaskAnswer:", error);
            return { error: "Error processing task answer" };
        }
    },


    // ✅ Start game timer (only if not already started)
    startGameTimer: async (userId) => {
        try {
            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: new ObjectId(userId) });

            if (user && user.gameStartTime) {
                return user.gameStartTime;  // Return existing start time if already started
            }

            const startTime = new Date();
            await db.get().collection(collection.USER_COLLECTION).updateOne(
                { _id: new ObjectId(userId) },
                { $set: { gameStartTime: startTime } }
            );

            return startTime;
        } catch (error) {
            console.error("❌ Error in startGameTimer:", error);
            return null;
        }
    },

    // ✅ Get elapsed time (timer should continue even after logout)
    getGameTimer: async (userId) => {
        try {
            if (!ObjectId.isValid(userId)) return { error: "Invalid user ID format" };

            const user = await db.get().collection(collection.USER_COLLECTION).findOne(
                { _id: new ObjectId(userId) },
                { projection: { gameStartTime: 1 } }
            );

            if (!user || !user.gameStartTime) {
                return { error: "Game has not started yet." };
            }

            const startTime = new Date(user.gameStartTime).getTime();
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

            return {
                gameStartTime: user.gameStartTime,
                elapsedTime: elapsedSeconds,
                formattedTime: formatTime(elapsedSeconds),
            };
        } catch (error) {
            console.error("❌ Error fetching game timer:", error);
            return { error: "Failed to retrieve game timer." };
        }
    },

    getUser: async (userId) => {
        return await db.get().collection(collection.USER_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { currentClueId: 1 } } // Fetch only the necessary field
        );
    },


    // Store user responses
    storeUserResponse: async (userId, clueId, clueNumber, taskName, answer, isCorrect, timeTaken, formattedTime) => {
        const user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: new ObjectId(userId) });

        const responseEntry = {
            clueId: new ObjectId(clueId),
            clueNumber,
            taskName,
            answer,
            isCorrect,
            timeTaken,  // Store in seconds for calculations
            formattedTime,  // Store formatted time (h m s)
            timestamp: new Date(),
        };

        // Store response in USER_RESPONSE_COLLECTION
        await db.get().collection(collection.USER_RESPONSE_COLLECTION).updateOne(
            { userId: new ObjectId(userId) },
            {
                $setOnInsert: { userId: new ObjectId(userId), userName: user.Name },
                $push: { responses: responseEntry }
            },
            { upsert: true }
        );

        // Update user total time and formatted time
        await db.get().collection(collection.USER_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            {
                $inc: { totalTimeTaken: timeTaken },  // Increment total seconds
                $set: { formattedTime: formattedTime } // Store readable format
            }
        );
    },



    getFinalResults: async (userId) => {
        if (!ObjectId.isValid(userId)) {
            return { error: "Invalid user ID format" };
        }

        const user = await db.get().collection(collection.USER_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { Name: 1, formattedTime: 1 } }  // Fetch Name and formattedTime
        );

        console.log(user);

        if (!user) {
            console.log("User not found for ID:", userId);
            return { error: "User not found." };
        }

        console.log("Final results:", { teamName: user.Name, totalTime: user.formattedTime });

        return {
            teamName: user.Name,
            totalTime: user.formattedTime  // Corrected to return formatted time
        };
    }


}
