import { expect } from 'chai';
import request from 'supertest';
import app from '../../server';
import dbClient from '../../utils/db';

describe('authController', () => {
  const user = {
    email: 'test@example.com',
    password: 'password123',
  };

  before(async () => {
    // Create a test user
    await dbClient.client.db()
      .collection('users')
      .deleteMany({ email: user.email });

    await request(app)
      .post('/users')
      .send(user);
  });

  describe('gET /connect', () => {
    it('should return a token for valid credentials', async () => {
      const auth = `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`;
      const res = await request(app)
        .get('/connect')
        .set('Authorization', auth);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token');
    });
  });

  describe('gET /disconnect', () => {
    it('should invalidate the token', async () => {
      const auth = `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`;
      const connectRes = await request(app)
        .get('/connect')
        .set('Authorization', auth);

      const { token } = connectRes.body;
      const res = await request(app)
        .get('/disconnect')
        .set('X-Token', token);

      expect(res.status).to.equal(204);
    });
  });
});
