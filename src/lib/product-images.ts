import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'

const PRODUCT_IMAGES_BUCKET = 'product-images'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const extensionsByMimeType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export class ProductImageValidationError extends Error {}

export async function uploadProductImage(image: File) {
  const extension = extensionsByMimeType[image.type]

  if (!extension) {
    throw new ProductImageValidationError(
      'Image must be a JPEG, PNG, WebP, or GIF file.'
    )
  }

  if (image.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ProductImageValidationError(
      'Image must not be larger than 5 MB.'
    )
  }

  const objectPath = `products/${uuidv4()}.${extension}`
  const { error } = await db.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, await image.arrayBuffer(), {
      cacheControl: '31536000',
      contentType: image.type,
      upsert: false,
    })

  if (error) throw error

  const { data } = db.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(objectPath)

  if (!data.publicUrl) {
    throw new Error('Failed to create the product image URL.')
  }

  return data.publicUrl
}

export async function removeProductImage(imageUrl: string | null) {
  if (!imageUrl) return

  const publicPath = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`

  try {
    const pathname = new URL(imageUrl).pathname
    const start = pathname.indexOf(publicPath)

    if (start < 0) return

    const objectPath = decodeURIComponent(
      pathname.slice(start + publicPath.length)
    )

    if (!objectPath) return

    const { error } = await db.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([objectPath])

    if (error) throw error
  } catch (error) {
    console.error('PRODUCT IMAGE DELETE ERROR:', error)
  }
}
