require("dotenv").config();
const { MongoClient } = require('mongodb')

const state = {
    db: null
}

const mongoURI = process.env.MONGO_URI;
const dbName = 'Visages_Treasure_Hunt'

const client = new MongoClient(mongoURI);
const connectDb = async (done) => {
    try {
        await client.connect();
        const db = client.db(dbName)
        state.db = db
        return done()
    } catch (err) {
        return done(err)
    }
}

const get = () => state.db

module.exports = {
    connectDb,
    get
}