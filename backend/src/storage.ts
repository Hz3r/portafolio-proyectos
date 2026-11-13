import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env } from './env.ts'

export interface Storage {
  /** URL firmada para que el navegador suba el archivo con PUT. */
  presignUpload(key: string, contentType: string, size: number): Promise<string>
  /** URL firmada de lectura (el bucket es privado). */
  presignRead(key: string): Promise<string>
  /** Sube un cuerpo en streaming (respaldo cuando el navegador no puede subir directo). */
  put(key: string, body: ReadableStream<Uint8Array>, contentType: string, size: number): Promise<void>
  remove(keys: string[]): Promise<void>
}

const UPLOAD_TTL = 60 * 60
const READ_TTL = 60 * 60

export function createS3Storage(env: Env): Storage {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    return missingStorage()
  }
  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  })
  const Bucket = S3_BUCKET

  return {
    presignUpload: (Key, ContentType, ContentLength) =>
      getSignedUrl(client, new PutObjectCommand({ Bucket, Key, ContentType, ContentLength }), {
        expiresIn: UPLOAD_TTL,
      }),
    presignRead: (Key) =>
      getSignedUrl(client, new GetObjectCommand({ Bucket, Key }), { expiresIn: READ_TTL }),
    async put(Key, body, ContentType, ContentLength) {
      const { Readable } = await import('node:stream')
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key,
          ContentType,
          ContentLength,
          Body: Readable.fromWeb(body as import('node:stream/web').ReadableStream),
        }),
      )
    },
    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        const Objects = keys.slice(i, i + 1000).map((Key) => ({ Key }))
        await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects, Quiet: true } }))
      }
    },
  }
}

function missingStorage(): Storage {
  const fail = async (): Promise<never> => {
    throw new Error('Almacenamiento sin configurar: define S3_ENDPOINT, S3_BUCKET y las credenciales.')
  }
  return { presignUpload: fail, presignRead: fail, put: fail, remove: async () => {} }
}
