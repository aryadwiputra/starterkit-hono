import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { requirePermission } from '../middleware/rbac.middleware'
import { uploadFile, getPresignedUrl, deleteFile } from '../lib/storage'
import { db, files } from '../db'

const upload = new Hono()

/**
 * Upload schema
 */
const uploadSchema = z.object({
  folder: z.string().optional(),
})

const maxFileSize = 10 * 1024 * 1024 // 10MB

/**
 * POST /upload
 * Upload file
 * Body: multipart/form-data dengan field 'file'
 */
upload.post(
  '/',
  authMiddleware,
  requirePermission('files:create'),
  async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body.file

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Check file size
    if (file.size > maxFileSize) {
      return c.json({ error: 'File too large. Max size: 10MB' }, 400)
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'File type not allowed' }, 400)
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())

      const result = await uploadFile(
        {
          buffer,
          originalname: file.name,
          mimetype: file.type,
        },
        { userId: user.id }
      )

      // Save metadata to database
      const fileRecord = await db.insert(files).values({
        userId: user.id,
        key: result.key,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      }).returning()

      return c.json({
        data: {
          id: fileRecord[0].id,
          key: result.key,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          url: result.url,
        },
      }, 201)
    } catch (error) {
      console.error('Upload error:', error)
      return c.json({ error: 'Failed to upload file' }, 500)
    }
  }
)

/**
 * GET /upload
 * List user's uploaded files
 */
upload.get(
  '/',
  authMiddleware,
  async (c) => {
    const user = c.get('user')

    const userFiles = await db.query.files.findMany({
      where: (f, { eq }) => eq(f.userId, user.id),
      orderBy: (f, { desc }) => [desc(f.createdAt)],
    })

    return c.json({ data: userFiles })
  }
)

/**
 * GET /upload/:id/url
 * Get presigned URL untuk download
 */
upload.get(
  '/:id/url',
  authMiddleware,
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))

    const file = await db.query.files.findFirst({
      where: (f, { eq, and }) => and(eq(f.id, id), eq(f.userId, user.id)),
    })

    if (!file) {
      return c.json({ error: 'File not found' }, 404)
    }

    try {
      const url = await getPresignedUrl(file.key)
      return c.json({ data: { url, expiresIn: 3600 } })
    } catch (error) {
      console.error('Presigned URL error:', error)
      return c.json({ error: 'Failed to generate URL' }, 500)
    }
  }
)

/**
 * DELETE /upload/:id
 * Delete uploaded file
 */
upload.delete(
  '/:id',
  authMiddleware,
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))

    const file = await db.query.files.findFirst({
      where: (f, { eq, and }) => and(eq(f.id, id), eq(f.userId, user.id)),
    })

    if (!file) {
      return c.json({ error: 'File not found' }, 404)
    }

    try {
      // Delete from S3
      await deleteFile(file.key)

      // Delete from database
      await db.delete(files).where((f, { eq }) => eq(f.id, id))

      return c.json({ message: 'File deleted' })
    } catch (error) {
      console.error('Delete error:', error)
      return c.json({ error: 'Failed to delete file' }, 500)
    }
  }
)

export default upload
