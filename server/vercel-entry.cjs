/**
 * Vercel invokes the Express app per request; Socket.IO is wired via io.engine.handleRequest in createApp.
 */
const { createApp } = require("./dist/app.js");

const { app } = createApp(require("path").join(__dirname, "dist"));

module.exports = app;
module.exports.default = app;
