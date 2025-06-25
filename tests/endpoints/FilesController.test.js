import { expect } from 'chai';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../server';
import dbClient from '../../utils/db';

describe('FilesController', () => {
  const user = {
    email: 'files@test.com',
    password: 'password123',
  };
  let token;

  before(async () => {
    // Create user and get token
    await dbClient.client.db()
      .collection('users')
      .deleteMany({ email: user.email });
    
    await request(app).post('/users').send(user);
    const auth = `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`;
    const res = await request(app)
      .get('/connect')
      .set('Authorization', auth);
    token = res.body.token;
  });

  describe('POST /files', () => {
    it('should create a new folder', async () => {
      const res = await request(app)
        .post('/files')
        .set('X-Token', token)
        .send({
          name: 'testFolder',
          type: 'folder',
        });
      
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('id');
      expect(res.body.type).to.equal('folder');
    });

    it('should upload a file', async () => {
      const res = await request(app)
        .post('/files')
        .set('X-Token', token)
        .send({
          name: 'test.txt',
          type: 'file',
          data: Buffer.from('Hello World').toString('base64'),
        });
      
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('id');
      expect(res.body.type).to.equal('file');
    });
  });

  describe('GET /files/:id', () => {
    let fileId;

    before(async () => {
      const res = await request(app)
        .post('/files')
        .set('X-Token', token)
        .send({
          name: 'testGet.txt',
          type: 'file',
          data: Buffer.from('Test content').toString('base64'),
        });
      fileId = res.body.id;
    });

    it('should retrieve file info', async () => {
      const res = await request(app)
        .get(`/files/${fileId}`)
        .set('X-Token', token);
      
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('id', fileId);
    });
  });

  describe('GET /files/:id/data', () => {
    let fileId;

    before(async () => {
      const res = await request(app)
        .post('/files')
        .set('X-Token', token)
        .send({
          name: 'testData.txt',
          type: 'file',
          data: Buffer.from('Test data content').toString('base64'),
          isPublic: true,
        });
      fileId = res.body.id;
    });

    it('should return file content', async () => {
      const res = await request(app)
        .get(`/files/${fileId}/data');
      
      expect(res.status).to.equal(200);
      expect(res.text).to.equal('Test data content');
    });
  });
});
