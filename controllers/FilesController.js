import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;

    // validate required fields
    if (!name) return res.status(400).json({ error: 'Missing name' });

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // validate parent if provided
    if (parentId !== '0') {
      try {
        const parentFile = await dbClient.client.db()
          .collection('files')
          .findOne({ _id: dbClient.getObjectId(parentId) });

        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent not a folder' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Parent not found' });
      }
    }

    // Handle folder creation
    if (type === 'folder') {
      try {
        const newFile = {
          userId: dbClient.getObjectId(userId),
          name,
          type,
          isPublic,
          parentId: parentId === '0' ? '0' : dbClient.getObjectId(parentId),
        };

        const result = await dbClient.client.db()
          .collection('files')
          .insertOne(newFile);

        return res.status(201).json({
          id: result.insertedId,
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      } catch (error) {
        console.error('Error creating folder:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }

    // Handle file/image upload
    try {
      // create storage folder if dont exists
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Gnerate unique filename and path
      const filename = uuidv4();
      const filePath = path.join(folderPath, filename);
      const fileContent = Buffer.from(data, 'base64');

      // write file to disk
      fs.writeFileSync(filePath, fileContent);

      // save file metadata to DB
      const newFile = {
        userId: dbClient.getObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : dbClient.getObjectId(parentId),
        localPath: filePath,
      };
      const result = await dbClient.client.db()
        .collection('files')
        .insertOne(newFile);

      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        isPublic,
        parentId,
        localPath: filePath,
      });
    } catch (error) {
      console.error('Error uploading file:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;
