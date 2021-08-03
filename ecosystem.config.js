module.exports = {
    apps : [{
        name: "UH back",
        script: "./app.js",
        watch: true,
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        }
    }]
}