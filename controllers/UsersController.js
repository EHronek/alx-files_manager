// import sha1 from 'sha1';
import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // check if email exists
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // check for missing password
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const usersCollection = dbClient.client.db().collection('users');

      // check if email exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // hash tje password
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Insert new User
      const result = await usersCollection.insertOne({
        email,
        password: hashedPassword,
      });

      // Return the new user (without password)
      return res.status(201).json({
        id: result.insertedId,
        email,
      });
    } catch (error) {
      console.error(`Error creating user: ${error}`);
      return res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const usersCollection = dbClient.client.db().collection('users');
      const user = await usersCollection.findOne(
        { _id: dbClient.getObjectId(userId) },
        { projection: { email: 1 } },
      );

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({ id: userId, email: user.email });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UsersController;
