// tests/utils/redis.test.js
import redisClient from '../../utils/redis';

describe('redisClient', () => {
  it('should be connected to Redis', () => {
    expect(redisClient.isAlive()).toBe(true);
  });

  it('should set and get values', async () => {
    await redisClient.set('test_key', '123', 10);
    const val = await redisClient.get('test_key');
    expect(val).toBe('123');
  });

  it('should delete keys', async () => {
    await redisClient.set('delete_key', 'to_delete', 10);
    await redisClient.del('delete_key');
    const val = await redisClient.get('delete_key');
    expect(val).toBeNull();
  });
});
