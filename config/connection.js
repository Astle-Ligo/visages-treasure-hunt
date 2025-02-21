require("dotenv").config();
const { MongoClient } = require("mongodb");

const state = { db: null };

const mongoURI = process.env.MONGO_URI;
const dbName = "Visages_Treasure_Hunt";

if (!mongoURI) {
    console.error("❌ MONGO_URI is not defined.");
    process.exit(1);
}

// ✅ Remove deprecated options
const client = new MongoClient(mongoURI, {
    tls: true, // Ensures secure TLS connection
    tlsAllowInvalidCertificates: false // Prevents invalid certificates
});

const connectDb = async (done) => {
    try {
        console.log("🔄 Attempting MongoDB connection...");
        await client.connect();
        state.db = client.db(dbName);
        console.log("✅ MongoDB connected to:", dbName);
        return done();
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        console.error("🔍 Debug Info:", {
            message: err.message,
            name: err.name,
            stack: err.stack
        });
        return done(err);
    }
};


// ✅ Ensure that `db.get()` does not return null
const get = () => {
    if (!state.db) {
        console.error("❌ Database not connected when calling get()");
        throw new Error("Database connection not established");
    }
    return state.db;
};

module.exports = { connectDb, get };
