import { expect } from 'chai';
import dbClient from '../../utils/db';

describe('dbClient', () => {
  before(async () => {
    await dbClient.client.connect();
  });

  it('should be alive', () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  it('should count users', async () => {
    const count = await dbClient.nbUsers();
    expect(count).to.be.a('number');
  });

  it('should count files', async () => {
    const count = await dbClient.nbFiles();
    expect(count).to.be.a('number');
  });
});
