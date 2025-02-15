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

    getGameSettings: async () => {
        return await db.get().collection(collection.GAME_SETTINGS_COLLECTION).findOne({});
    },

    getFirstClue: async () => {
        return await db.get().collection(collection.CLUE_COLLECTION)
            .findOne({}, { sort: { clueNumber: 1 } });
    },

    checkAnswer: async (clueId, userAnswer) => {
        const clue = await db.get().collection(collection.CLUE_COLLECTION).findOne({ _id: new ObjectId(clueId) });
        return clue && clue.answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
    },

    getNextClue: async (currentClueNumber) => {
        return await db.get().collection(collection.CLUE_COLLECTION)
            .findOne({ clueNumber: parseInt(currentClueNumber) + 1 });
    }
};
