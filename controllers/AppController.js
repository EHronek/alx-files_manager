import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static async getStatus(req, res) {
    const redisAlive = redisClient.isAlive();
    const dbAlive = dbClient.isAlive();

    res.status(200).json({
      redis: redisAlive,
      db: dbAlive,
    });
  }

  static async getStats(req, res) {
    try {
      const userCount = await dbClient.nbUsers();
      const filesCount = await dbClient.nbFiles();

      res.status(200).json({
        users: userCount,
        files: filesCount,
      });
    } catch (error) {
      console.error(`Error getting stats ${error}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AppController;
