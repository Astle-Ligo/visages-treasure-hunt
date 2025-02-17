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

    // Get Clue by ID
    getClue: async (clueId) => {
        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: ObjectId(clueId) });
        return clue;
    },

    // Check the answer to a clue
    checkClueAnswer: async (clueId, answer) => {
        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: ObjectId(clueId) });
        if (!clue) return { error: "Clue not found" };

        if (clue.answer.toLowerCase() === answer.toLowerCase()) {
            // Find next clue by clueNumber
            const nextClue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ clueNumber: clue.clueNumber + 1 });

            return nextClue
                ? { nextStep: `/task/${nextClue.taskPage}?clueId=${nextClue._id}` }
                : { message: "Congratulations! You finished the game!" };
        } else {
            return { error: "Incorrect answer, try again!" };
        }
    },

    // Check the answer to a task
    checkTaskAnswer: async (clueId, taskAnswer) => {
        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: ObjectId(clueId) });
        if (!clue) return { error: "Task not found" };

        if (clue.taskAnswer.toLowerCase() === taskAnswer.toLowerCase()) {
            // Find next clue automatically
            const nextClue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ clueNumber: clue.clueNumber + 1 });

            return nextClue
                ? { nextClue: `/clue/${nextClue._id}` }
                : { message: "Congratulations! You completed the treasure hunt!" };
        } else {
            return { error: "Wrong task answer, try again!" };
        }
    }
};
