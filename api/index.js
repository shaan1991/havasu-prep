/* Vercel serverless entry: every request warms the DB once, then runs the Express app */
const { app, ready } = require('../server');

let warmed = false;
module.exports = async (req, res) => {
  if (!warmed) {
    await ready;
    warmed = true;
  }
  return app(req, res);
};
