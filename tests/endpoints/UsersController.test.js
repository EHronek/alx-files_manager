import { expect } from 'chai';
import request from 'supertest';
import app from '../../server';
import dbClient from '../../utils/db';

describe('usersController', () => {
  const user = {
    email: 'test@example.com',
    password: 'password123',
  };

  before(async () => {
    // Clean up test user
    await dbClient.client.db()
      .collection('users')
      .deleteMany({ email: user.email });
  });

  describe('pOST /users', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/users')
        .send(user);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('email', user.email);
    });

    it('should fail if email is missing', async () => {
      const res = await request(app)
        .post('/users')
        .send({ password: user.password });

      expect(res.status).to.equal(400);
      expect(res.body).to.deep.equal({ error: 'Missing email' });
    });
  });

  describe('gET /users/me', () => {
    let token;

    before(async () => {
      // Create user and get token
      await request(app).post('/users').send(user);
      const auth = `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`;
      const res = await request(app)
        .get('/connect')
        .set('Authorization', auth);
      token = res.body.token;
    });

    it('should return user info', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('X-Token', token);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('email', user.email);
    });
  });
});
