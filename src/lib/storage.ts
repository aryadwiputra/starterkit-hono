import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { env } from './env'
import { logger } from './logger'

/**
 * S3 Storage Client
 *
 * Upload, download, delete files di S3-compatible storage
 */

let s3Client: S3Client | null = null

/**
 * Get or create S3 client
 */
export function getS3Client(): S3Client | null {
  if (!env.S3_BUCKET) {
    return null
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: env.S3_REGION || 'us-east-1',
      endpoint: env.S3_ENDPOINT, // Untuk S3-compatible (MinIO, etc.)
      credentials: env.S3_ACCESS_KEY && env.S3_SECRET_KEY
        ? {
            accessKeyId: env.S3_ACCESS_KEY,
            secretAccessKey: env.S3_SECRET_KEY,
          }
        : undefined,
      forcePathStyle: !!env.S3_ENDPOINT, // Need for MinIO
    })
  }

  return s3Client
}

interface UploadResult {
  key: string
  url: string
}

interface FileMetadata {
  size: number
  mimeType: string
  lastModified: Date
}

/**
 * Upload file ke S3
 */
export async function uploadFile(
  file: { buffer: Buffer; originalname: string; mimetype: string },
  options: { userId: number; folder?: string } = { userId: 0 }
): Promise<UploadResult> {
  const client = getS3Client()

  if (!client || !env.S3_BUCKET) {
    throw new Error('S3 not configured. Set S3_BUCKET environment variable.')
  }

  // Generate unique key
  const ext = file.originalname.split('.').pop() || ''
  const key = `${options.folder || 'uploads'}/${options.userId}/${randomUUID()}${ext ? '.' + ext : ''}`

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': file.originalname,
        'uploaded-by': String(options.userId),
      },
    })
  )

  logger.info({
    type: 'storage',
    operation: 'upload',
    key,
    size: file.buffer.length,
    mimeType: file.mimetype,
  })

  return {
    key,
    url: `${env.S3_PUBLIC_URL || `https://${env.S3_BUCKET}.s3.${env.S3_REGION || 'us-east-1'}.amazonaws.com`}/${key}`,
  }
}

/**
 * Delete file dari S3
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client()

  if (!client || !env.S3_BUCKET) {
    throw new Error('S3 not configured')
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  )

  logger.info({
    type: 'storage',
    operation: 'delete',
    key,
  })
}

/**
 * Generate presigned URL untuk download
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client()

  if (!client || !env.S3_BUCKET) {
    throw new Error('S3 not configured')
  }

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  })

  const url = await getSignedUrl(client, command, { expiresIn })

  return url
}

/**
 * Get file metadata tanpa download
 */
export async function getFileMetadata(key: string): Promise<FileMetadata | null> {
  const client = getS3Client()

  if (!client || !env.S3_BUCKET) {
    return null
  }

  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      })
    )

    return {
      size: result.ContentLength || 0,
      mimeType: result.ContentType || 'application/octet-stream',
      lastModified: result.LastModified || new Date(),
    }
  } catch {
    return null
  }
}

/**
 * Check jika file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  const metadata = await getFileMetadata(key)
  return metadata !== null
}
