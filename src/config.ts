
export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  server: process.env.SERVER || '0.0.0.0',
  mongodb: {
    database: {
      connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27018',
      databaseName: process.env.MONGODB_DB_NAME || 'local'
    }
  }
});
