const { openDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const db = openDatabase(process.env.DB_FILE);
const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(`Trailhead running at http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
