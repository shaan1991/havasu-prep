/* Vercel serverless entry: every request warms the DB once, then runs the Express app.
   server.js itself exports a ready aware request handler, so this just delegates. */
const handler = require('../server');

let warmed = false;
module.exports = async (req, res) => {
  if (!warmed) {
    await handler.ready;
    warmed = true;
  }
  return handler(req, res);
};
