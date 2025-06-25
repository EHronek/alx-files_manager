// import sha1 from 'sha1';
import crypto from 'crypto';
import dbClient from '../utils/db';

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
}

export default UsersController;
