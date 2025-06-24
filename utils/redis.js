import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.error(`Redis client err: ${err}`));

    // Promisify the Redis methods
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
    this.expireAsync = promisify(this.client.expire).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      const value = await this.getAsync(key);
      return value;
    } catch (err) {
      console.error(`Redis get error: ${err}`);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.setAsync(key, value);
      if (duration) {
        await this.expireAsync(key, duration);
      }
      return true;
    } catch (err) {
      console.error(`Redis get error ${err}`);
      return false;
    }
  }

  async del(key) {
    try {
      const result = await this.delAsync(key);
      return result === 1;
    } catch (err) {
      console.error(`Redis del error: ${err}`);
      return false;
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
