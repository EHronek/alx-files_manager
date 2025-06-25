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
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json(
        { error: 'Unauthorized' },
      );
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(404).json({ error: 'Not found' });

    try {
      const file = await dbClient.client.db()
        .collection('files')
        .findOne({
          _id: dbClient.getObjectId(id),
          userId: dbClient.getObjectId(userId),
        });

      if (!file) return res.status(404).json({ error: 'Not found' });

      // format the response
      const response = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? '0' : file.parentId,
      };

      // Add localPath if it exists (not folder)
      if (file.localPath) {
        response.localPath = file.localPath;
      }
      return res.status(200).json(response);
    } catch (err) {
      console.error('Error retrieving file:', err);
      return res.status(404).json({ error: 'Not found' });
    }
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const limit = 20;
    const skip = page * limit;

    try {
      const files = await dbClient.client.db()
        .collection('files')
        .aggregate([
          {
            $match: {
              userId: dbClient.getObjectId(userId),
              parentId: parentId === '0' ? '0' : dbClient.getObjectId(parentId),
            },
          },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: '$_id',
              userId: 1,
              name: 1,
              type: 1,
              isPublic: 1,
              parentId: {
                $cond: {
                  if: { $eq: ['$parentId', '0'] },
                  then: '0',
                  else: '$parentId',
                },
              },
              localPath: 1,
            },
          },
        ])
        .toArray();

      return res.status(200).json(files);
    } catch (err) {
      console.error('Error listing files:', err);
      return res.status(200).json([]);
    }
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(404).json({ error: 'Not found' });

    try {
      const result = await dbClient.client.db()
        .collection('files')
        .findOneAndUpdate(
          {
            _id: dbClient.getObjectId(id),
            userId: dbClient.getObjectId(userId),
          },
          { $set: { isPublic: true } },
          { returnDocument: 'after' },
        );

      if (!result.value) return res.status(404).json({ error: 'Not found' });

      const file = result.value;
      const response = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? '0' : file.parentId,
      };

      if (file.localPath) {
        response.localPath = file.localPath;
      }

      return res.status(200).json(response);
    } catch (err) {
      console.error('Error publishing file:', err);
      return res.status(404).json({ error: 'Not found' });
    }
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(404).json({ error: 'Not found' });

    try {
      const result = await dbClient.client.db()
        .collection('files')
        .findOneAndUpdate(
          {
            _id: dbClient.getObjectId(id),
            userId: dbClient.getObjectId(userId),
          },
          { $set: { isPublic: false } },
          { returnDocument: 'after' },
        );

      if (!result.value) return res.status(404).json({ error: 'Not found' });

      const file = result.value;
      const response = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? '0' : file.parentId,
      };

      if (file.localPath) {
        response.localPath = file.localPath;
      }

      return res.status(200).json(response);
    } catch (err) {
      console.error('Error unpublishing file:', err);
      return res.status(404).json({ error: 'Not found' });
    }
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');

    const file = await DBClient.db.collection('files').findOne({ _id: ObjectId(id) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    // If private, check auth
    if (!file.isPublic) {
      if (!token) return res.status(404).json({ error: 'Not found' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    // If it's a folder
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // Read the file
    try {
      const data = fs.readFileSync(file.localPath);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(data);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
