import { fetchVariantQuery } from "./queries"
import { getShopifyId, getElementPosition } from "./utils"

export default function ShopifyGAHelper({
  storeUrl = "shops.myshopify.com",
  storefrontToken = "",
  currencyCode = "USD",
  debug = false,
}) {
  const queryStorefrontApi = async (payload) => {
    const response = await fetch(`https://${storeUrl}/api/2021-10/graphql`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify(payload),
    })

    const { data, errors } = await response.json()

    if (errors) {
      throw new Error(errors, payload)
    }

    return data
  }

  const pushEvent = (name, payload) => {
    if (debug) {
      console.log(`'${name}'`, payload)
    }

    if (!window.dataLayer) {
      window.dataLayer = []
    }

    // Clear previous ecommerce values
    if (payload.ecommerce) {
      window.dataLayer.push({
        ecommerce: null,
      })
    }

    // Add new event
    return window.dataLayer.push({
      event: name,
      ...payload,
    })
  }

  const fetchVariant = async (variantId) => {
    if (!variantId) {
      return false
    }

    const result = await queryStorefrontApi({
      variables: {
        id: btoa(`gid://shopify/ProductVariant/${variantId}`),
      },
      query: fetchVariantQuery,
    })

    return result.node
  }

  /**
   * Make flat object from a variant with nested product data
   */
  const makeFlatVariant = (variant) => {
    const { product } = variant
    const productUrl = `https://${storeUrl}/products/${product.handle}`
    const variantImage = variant.image
    const variantId = getShopifyId(variant.id)

    return {
      // Product level info
      productId: getShopifyId(product.id),
      productTitle: product.title,
      productVariantTitle: `${product.title} - ${variant.title}`,
      productType: product.productType || product.type,
      productVendor: product.vendor,
      productUrl,
      // Variant level data
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      variantId,
      variantTitle: variant.title,
      variantImage: variantImage.originalSrc || variant.image,
      variantUrl: `${productUrl}?variant=${variantId}`,
    }
  }

  const getFlatVariant = async (variantPayload) => {
    const variant =
      typeof variantPayload === "object"
        ? variantPayload
        : await fetchVariant(variantPayload)

    if (variant) {
      return makeFlatVariant(variant)
    }

    return console.error("Variant not found", variantPayload)
  }

  const makeGaProductFieldObject = (flatVariant) => ({
    currency: currencyCode,
    item_id: flatVariant.sku || flatVariant.variantId,
    item_name: flatVariant.productVariantTitle,
    item_brand: flatVariant.productVendor,
    item_category: flatVariant.productType,
    item_variant: flatVariant.variantTitle,
    price: flatVariant.price,
  })

  const viewItem = async (variantPayload, { el, list, position } = {}) => {
    const flatVariant = await getFlatVariant(variantPayload)
    const index = position || getElementPosition(el)

    if (!flatVariant) {
      return null
    }

    const item = {
      ...makeGaProductFieldObject(flatVariant),
      index,
    }

    if (list) {
      item.item_list_name = list
    }

    return pushEvent("view_item", {
      ecommerce: {
        items: [item],
      },
    })
  }

  const viewCart = async (checkoutOrCartPayload) => {
    if (checkoutOrCartPayload) {
      return pushEvent("view_cart", {
        ecommerce: {
          ...checkoutOrCartPayload,
        },
      })
    }

    return null
  }

  const checkoutOrCart = (gtmEvent) => (checkoutOrCartPayload) => {
    if (checkoutOrCartPayload) {
      return pushEvent(gtmEvent, {
        ecommerce: {
          ...checkoutOrCartPayload,
        },
      })
    }

    return null
  }

  const beginCheckout = (checkoutOrCartPayload) => {
    const fn = checkoutOrCart("begin_checkout")

    return fn(checkoutOrCartPayload)
  }

  const purchase = (checkoutOrCartPayload) => {
    const fn = checkoutOrCart("purchase")

    return fn(checkoutOrCartPayload)
  }

  const updateQuantity = async (variantPayload, quantity, gtmEvent) => {
    const flatVariant = await getFlatVariant(variantPayload)

    if (!flatVariant) {
      return null
    }

    return pushEvent(gtmEvent, {
      ecommerce: {
        items: [
          {
            ...makeGaProductFieldObject(flatVariant),
            quantity,
          },
        ],
      },
    })
  }

  /**
   * Used whenever there is a positive change in the quantity of a product in
   * the cart.
   */
  const addToCart = (variantPayload, quantity) =>
    updateQuantity(variantPayload, quantity, "add_to_cart")

  /**
   * Used whenever there is a negative change in the quantity of a product in
   * the cart.
   */
  const removeFromCart = (variantPayload, quantity) =>
    updateQuantity(variantPayload, quantity, "remove_from_cart")

  return {
    viewItem,
    addToCart,
    removeFromCart,
    viewCart,
    beginCheckout,
    purchase,
  }
}
