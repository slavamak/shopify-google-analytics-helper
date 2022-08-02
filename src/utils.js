/**
 * Get the id from a Shopify gid:// style id.  This strips everything but the
 * last part of the string.  So gid://shopify/ProductVariant/34641879105581
 * becomes 34641879105581
 * https://regex101.com/r/3FIplL/1
 */
export const getShopifyId = (id) => {
  let shopifyId = id

  if (String(id).match(/^\d+$/)) {
    // Already simple id
    return id
  }

  if (!id.match(/^gid:\/\//)) {
    // De-base64
    shopifyId = atob(id)
  }

  shopifyId = shopifyId.match(/\/([^/]+)$/)

  return shopifyId ? shopifyId[1] : undefined
}

/**
 * Get the position of an element with respect to it's parent
 */
export const getElementPosition = (el) => {
  let child = el
  let i = 0 // The first position will be `0`

  if (child) {
    child = el.previousElementSibling

    while (child) {
      i += 1
    }
  }

  return i
}

/**
 * Fire callback when in viewport. Not exposing a way to manually disconnect or
 * unobserve because it _should_ be garbage collected when el is removed.
 */
export const whenFirstInViewport = (el, callback) => {
  const observer = new IntersectionObserver(([{ isIntersecting }]) => {
    if (!isIntersecting) {
      return false
    }

    observer.disconnect()

    return callback()
  })

  return observer.observe(el)
}
