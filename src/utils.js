/**
 * Get the identifier from the Shopify style identifier gid:// .
 * This removes everything but the last part of the string.
 *
 * @example
 * getShopifyId(34641879105581);
 * // returns 34641879105581
 *
 * @example
 * getShopifyId("Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC8zNDY0MTg3OTEwNTU4MQ==");
 * // returns "34641879105581"
 *
 * @example
 * getShopifyId("gid://shopify/ProductVariant/34641879105581");
 * // returns "34641879105581"
 *
 * @param {(string|number)} id
 * @returns {(number|string|undefined)}
 */
export const getShopifyId = (id) => {
  let shopifyId = id

  if (String(id).match(/^\d+$/)) {
    // Already simple id
    return id
  }

  if (!id.match(/^gid:\/\//)) {
    // Decodes a id which has been encoded using Base64 encoding
    shopifyId = window.atob(id)
  }

  // eslint-disable-next-line no-useless-escape
  shopifyId = shopifyId.match(/\/([^\/]+)$/)

  return shopifyId ? shopifyId[1] : undefined
}

/**
 * Get the position of an element with respect to it's parent.
 * @param {(HTMLElement|undefined)} el
 * @returns {number}
 */
export const getElementPosition = (el) => {
  let child = el
  let i = 0

  if (child) {
    child = el.previousElementSibling

    while (child) {
      i += 1
    }
  }

  return i
}

/**
 * Fire callback once when in viewport.
 * @param {HTMLElement} el
 * @param {function} callback
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
