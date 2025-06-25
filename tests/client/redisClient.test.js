import { expect } from 'chai';
import redisClient from '../../utils/redis';

describe('redisClient', () => {
  it('should be alive', () => {
    expect(redisClient.isAlive()).to.equal(true);
  });

  it('should set and get value', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should delete key', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    await redisClient.del('test_key');
    const value = await redisClient.get('test_key');
    expect(value).to.equal(null);
  });
});
