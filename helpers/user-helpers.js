const db = require('../config/connection');
const collection = require('../config/collection');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0h 0m 0s"; // Handle invalid cases

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
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

    // Check the answer to a clue
    checkClueAnswer: async (userId, clueId, answer, startTime) => {
        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });
        if (!clue) return { error: "Clue not found" };

        const isCorrect = clue.answer.toLowerCase() === answer.toLowerCase();
        const timeTaken = Math.floor((Date.now() - startTime) / 1000); // Time in seconds

        await module.exports.storeUserResponse(userId, clueId, clue.clueNumber, null, answer, isCorrect, formatTime(timeTaken));


        if (isCorrect) {
            return { nextStep: `/task/${clue.taskName}/${clue._id}` };
        } else {
            return { error: "Incorrect answer, try again!" };
        }
    },


    // Check task answer and move to the next clue
    checkTaskAnswer: async (userId, clueId, taskAnswer, startTime) => {
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

        await module.exports.storeUserResponse(userId, clueId, null, clue.taskName, taskAnswer, isCorrect, formattedTime);

        if (isCorrect) {
            console.log("✅ Task answer is correct!");

            await db.get().collection(collection.USER_COLLECTION).updateOne(
                { _id: new ObjectId(userId) },
                { $set: { lastCompletedClue: clue.clueNumber, timeTaken: formattedTime } }
            );

            const nextClueNumber = (parseInt(clue.clueNumber) + 1).toString();
            const nextClue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ clueNumber: nextClueNumber });

            if (nextClue) {
                console.log("✅ Next clue found:", nextClue._id);

                await db.get().collection(collection.USER_COLLECTION).updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { currentClueId: nextClue._id } }
                );

                return { nextStep: `/clue/${nextClue._id}` };
            } else {
                console.log("🎉 Treasure hunt completed!");
                return { celebration: true, message: "Congratulations! You completed the treasure hunt!" };
            }
        } else {
            console.log("❌ Wrong task answer, try again!");
            return { error: "Incorrect answer, try again!" };
        }
    },

    startGameTimer: async (userId) => {
        const startTime = new Date();
        await db.get().collection(collection.USER_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            { $set: { gameStartTime: startTime } }
        );
        return startTime;
    },

    getGameTimer: async (userId) => {
        const user = await db.get().collection(collection.USER_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { gameStartTime: 1 } }
        );
        return user ? user.gameStartTime : null;
    },

    getUser: async (userId) => {
        return await db.get().collection(collection.USER_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { currentClueId: 1 } } // Fetch only the necessary field
        );
    },


    // Store user responses
    storeUserResponse: async (userId, clueId, clueNumber, taskName, answer, isCorrect, timeTaken) => {
        const user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: new ObjectId(userId) });

        const responseEntry = {
            clueId: new ObjectId(clueId),
            clueNumber,
            taskName,
            answer,
            isCorrect,
            timeTaken,
            timestamp: new Date(),
        };

        await db.get().collection(collection.USER_RESPONSE_COLLECTION).updateOne(
            { userId: new ObjectId(userId) },
            {
                $setOnInsert: { userId: new ObjectId(userId), userName: user.Name }, // Add userName on first entry
                $push: { responses: responseEntry }
            },
            { upsert: true }
        );
    },


    getFinalResults: async (userId) => {
        if (!ObjectId.isValid(userId)) {
            return { error: "Invalid user ID format" };
        }

        const user = await db.get().collection(collection.USER_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { Name: 1, timeTaken: 1 } }  // Fetch Name and timeTaken
        );

        if (!user) {
            console.log("User not found for ID:", userId);
            return { error: "User not found." };
        }

        console.log("Final results:", { teamName: user.Name, totalTime: user.timeTaken });

        return {
            teamName: user.Name,  // Using Name instead of teamName
            totalTime: user.timeTaken
        };
    }

}
