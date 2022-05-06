const { connect, connection } = require("mongoose")

const schemas = require("./schemas")

const cache = {
    messageCounts: {},
    dataCollectionPolicies: {}
}

// Database functions

/**
 * Update a server message count
 * Does upsert if required
 * @param {string} id The server id
 */
async function incrementMessageCount(id) {
    const template = {
        count: 0,
        id,
        date: new Date().toDateString()
    }
    const server = await schemas.MessageCountModel.findOne({ id }).exec()
    if (server !== null) {
        // The count exists
        if (server.date !== new Date().toDateString()) {
            template.count = 0
        } else template.count = (typeof server.count === "number" ? server.count : 0) + 1
    }
    cache.messageCounts[id] = { timestamp: new Date().getTime(), count: server.count }
    await schemas.MessageCountModel.findOneAndUpdate({ id }, template, { upsert: true })
}

/**
 * Get server's daily message count, cache of 3 seconds
 * @param {string} id
 * @returns {Promise<null|Number>}
 */
async function getMessageCount(id) {
    if (cache.messageCounts[id] && cache.messageCounts[id].timestamp + 3000 > new Date().getTime()) return cache.messageCounts[id].count
    const template = {
        count: 0,
        id,
        date: new Date().toDateString()
    }
    const server = await schemas.MessageCountModel.findOne({ id }).exec()
    if (server !== null) {
        // The count exists
        if (server.date !== new Date().toDateString()) {
            template.count = 0
            await schemas.MessageCountModel.findOneAndUpdate({ id }, template, { upsert: true })
        }
    }
    cache.messageCounts[id] = { timestamp: new Date().getTime(), count: server?.count }
    return server?.count
}

/**
 * Update data collection policy allowed list
 * @param {"add" | "remove"} mode Add or remove from allowed list
 * @param {string} serverId Server id
 * @param {string} userId user id
 */
async function updateDataCollectionPolicy(mode, serverId, userId) {
    const config = await schemas.DataCollectionConfigurationModel.findOne({ id: serverId })
    const template = {
        id: serverId,
        allowed: config?.allowed ?? []
    }
    if (mode === "remove") template.allowed.splice(template.allowed.indexOf(userId), 1)
    else if (mode === "add") template.allowed.push(userId)
    cache.dataCollectionPolicies[serverId] = template
    return schemas.DataCollectionConfigurationModel.findOneAndUpdate({ id: serverId }, template, { upsert: true })
}

/**
 * Get server's data collection config
 * @param {string} id The server Id
 */
async function getDataCollectionConfig(id) {
    return cache.dataCollectionPolicies[id] ?? schemas.DataCollectionConfigurationModel.findOne({ id }).exec()
}

/**
 * Update user's info in the database
 * @param {string} id User id
 * @param {string} bio The user bio
 * @param {string} connectedAccounts Connected accounts
 */
async function setUserInfo(id, bio, connectedAccounts) {
    const template = {
        id,
        bio,
        connectedAccounts
    }
    const initial = await schemas.UserInfoModel.findOne({ id }).exec()
    if (template.bio === undefined) template.bio = initial?.bio
    if (template.connectedAccounts === undefined) template.connectedAccounts = initial?.connectedAccounts
    return schemas.UserInfoModel.findOneAndUpdate({ id }, template, { upsert: true }).exec()
}

/**
 * Remove user's info from the database
 * @param {string} id User id
 */
async function removeUserInfo(id) {
    return schemas.UserInfoModel.findOneAndDelete({ id }).exec()
}

/**
 * Get user's info from the database
 * @param {string} id User id
 */
async function getUserInfo(id) {
    return schemas.UserInfoModel.findOne({ id }).exec()
}

/**
 * Initialize the database
 */
async function init() {
    return connect(process.env.TEST_CLUSTER ?? `mongodb://${process.env.MONGODB_HOST || "testausapis_mongo"}:27017/main`)
}

module.exports = {
    incrementMessageCount,
    updateDataCollectionPolicy,
    getDataCollectionConfig,
    setUserInfo,
    removeUserInfo,
    getUserInfo,
    init,
    getMessageCount,
    connection
}
