import { expect } from 'chai';
import request from 'supertest';
import app from '../../server';

describe('appController', () => {
  describe('gET /status', () => {
    it('should return status of services', async () => {
      const res = await request(app).get('/status');
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        redis: true,
        db: true,
      });
    });
  });

  describe('gET /stats', () => {
    it('should return stats of collections', async () => {
      const res = await request(app).get('/stats');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('users');
      expect(res.body).to.have.property('files');
    });
  });
});
