const db = require('../config/connection');
const collection = require('../config/collection');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

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
    checkClueAnswer: async (clueId, answer) => {
        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });
        if (!clue) return { error: "Clue not found" };

        if (clue.answer.toLowerCase() === answer.toLowerCase()) {
            console.log("Answer is correct, moving to task page.");

            // Fetch task details (taskName, taskAnswer) from the clue
            const taskName = clue.taskName;
            const taskAnswer = clue.taskAnswer;

            return {
                nextStep: `/task/${taskName}/${clue._id}`,
                taskName: taskName,
                taskAnswer: taskAnswer
            };
        } else {
            return { error: "Incorrect answer, try again!" };
        }
    },

    // Check task answer and move to the next clue
    checkTaskAnswer: async (clueId, taskAnswer, userId) => {
        console.log("Checking task answer for clueId:", clueId);

        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });

        if (!clue) return { error: "Clue not found" };

        if (clue.taskAnswer.toLowerCase() === taskAnswer.toLowerCase()) {
            console.log("Task answer is correct, moving to next clue.");

            const nextClueNumber = (parseInt(clue.clueNumber) + 1).toString();
            const nextClue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ clueNumber: nextClueNumber });

            if (nextClue) {
                // ✅ Update user's last solved clue
                await db.get().collection(collection.USER_COLLECTION).updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { currentClueId: nextClue._id } }
                );

                return { nextClue: `/clue/${nextClue._id}` };
            } else {
                return { celebration: true, message: "Congratulations! You completed the treasure hunt!" };
            }
        } else {
            return { error: "Wrong task answer, try again!" };
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
    }

};
