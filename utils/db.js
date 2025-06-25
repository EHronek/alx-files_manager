import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    // Get configs from the environment variables
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';

    // MongoDB connection URL
    this.url = `mongodb://${this.host}:${this.port}`;

    // create Mongodb Client
    this.client = new MongoClient(this.url, { useUnifiedTopology: true });

    // connect to mongodb
    this.client.connect()
      .then(() => {
        console.log('Connected to MongoDB');
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
      });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      const db = this.client.db(this.database);
      const count = await db.collection('users').countDocuments();
      return count;
    } catch (err) {
      console.error(`Error counting users: ${err}`);
      return 0;
    }
  }

  async nbFiles() {
    try {
      const db = this.client.db(this.database);
      const count = await db.collection('files').countDocuments();
      return count;
    } catch (err) {
      console.error(`Error counting files: ${err}`);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
