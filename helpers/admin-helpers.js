var db = require('../config/connection')

var collection = require('../config/collection')

const bcrypt = require('bcrypt')

const { ObjectId } = require('mongodb')

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

}