import S3 from 'aws-sdk/clients/s3'

const s3 = new S3({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true, // for MinIO and compatible
})

const BUCKET = process.env.S3_BUCKET || 'space-files'

export const s3Service = {
  async upload(key: string, body: File | Blob, contentType?: string) {
    const buffer = Buffer.from(await body.arrayBuffer())
    await s3.upload({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }).promise()
  },

  async getSignedUrl(key: string, expiresIn = 3600) {
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET,
      Key: key,
      Expires: expiresIn,
    })
    // If public URL is configured, replace the endpoint
    if (process.env.S3_PUBLIC_URL) {
      return url.replace(s3.endpoint?.href || '', process.env.S3_PUBLIC_URL)
    }
    return url
  },

  async delete(key: string) {
    await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise()
  },

  async list(prefix: string) {
    const result = await s3.listObjectsV2({
      Bucket: BUCKET,
      Prefix: prefix,
    }).promise()

    return (result.Contents || []).map(obj => ({
      key: obj.Key!,
      size: obj.Size!,
      lastModified: obj.LastModified!.toISOString(),
    }))
  },
}
