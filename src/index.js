import "./header"
import "dotenv/config"
import express from "express"
import Package from "../package.json" // assert {type: "json"}
import database from "./database/database"

import discordRoute from "./discord"
import githubRoute from "./github"
import miscRoute from "./misc"

/**
 * Database connection
 */
console.log("Connecting to database...")
database.init()
    .then(() => {
        console.log("Database connected")
    })
    .catch((e) => {
        console.error("Failed to connect to the database", e)
        process.exit(1)
    })

/**
 * HTTP server
 */
const app = express()

app.use((_, res, next) => { // Allow everyone for CORS
    res.setHeader("Access-Control-Allow-Origin", "*")
    next()
})

app.get("/", (_, res) => {
    res.status(200).json({
        name: Package.name,
        author: Package.author,
        version: Package.version,
        repository: Package.repository,
        bugs: Package.bugs.url,
        homepage: Package.homepage
    })
})

// eslint-disable-next-line new-cap
const router = express.Router()

router.use("/discord", discordRoute)
router.use("/github", githubRoute)
router.use("/misc", miscRoute)

app.use("/v1", router)

app.use((_, res) => {
    if (!res.headersSent) res.status(404).json({ error: "What?" })
})

const port = process.env.HTTP_PORT || 8080

app.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`)
})
