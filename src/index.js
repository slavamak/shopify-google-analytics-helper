import { fetchVariantQuery } from "./queries"
import { getShopifyId, getElementPosition } from "./utils"

export default function ShopifyGAHelper({
  storeUrl = "shops.myshopify.com",
  storefrontToken = "",
  currencyCode = "USD",
  debug = false,
}) {
  const queryStorefrontApi = async (payload) => {
    const response = await fetch(`https://${storeUrl}/api/2022-07/graphql`, {
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
      const error = new Error(JSON.stringify(errors))
      error.metadata = payload

      throw error
    }

    return data
  }

  const pushDataLayerEvent = (gtmEvent, payload) => {
    if (debug) {
      console.log(`'${gtmEvent}'`, payload)
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
      event: gtmEvent,
      ...payload,
    })
  }

  const fetchVariant = async (variantId) => {
    if (!variantId) {
      return undefined
    }

    const result = await queryStorefrontApi({
      variables: {
        id: window.btoa(`gid://shopify/ProductVariant/${variantId}`),
      },
      query: fetchVariantQuery,
    })

    return result.node
  }

  /**
   * Make flat object from a variant with nested product data.
   */
  const makeFlatVariant = (variant) => {
    const { product } = variant
    const productUrl = `https://${storeUrl}/products/${product.handle}`
    const variantImage = variant.image
    const variantId = getShopifyId(variant.id)

    return {
      productId: getShopifyId(product.id),
      productTitle: product.title,
      productVariantTitle: `${product.title} - ${variant.title}`,
      productType: product.productType,
      productVendor: product.vendor,
      productUrl,
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

  const viewOrSelectItem =
    (gtmEvent) =>
    async (variantPayload, { el, list, position } = {}) => {
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

      return pushDataLayerEvent(gtmEvent, {
        ecommerce: {
          items: [item],
        },
      })
    }

  const viewItem = (variantPayload, { el, list, position } = {}) => {
    const pushEvent = viewOrSelectItem("view_item")

    return pushEvent(variantPayload, { el, list, position })
  }

  const selectItem = (variantPayload, { el, list, position } = {}) => {
    const pushEvent = viewOrSelectItem("select_item")

    return pushEvent(variantPayload, { el, list, position })
  }

  const viewCart = async (checkoutOrCartPayload) => {
    if (checkoutOrCartPayload) {
      return pushDataLayerEvent("view_cart", {
        ecommerce: {
          ...checkoutOrCartPayload,
        },
      })
    }

    return undefined
  }

  const checkoutOrCart = (gtmEvent) => (checkoutOrCartPayload) => {
    if (checkoutOrCartPayload) {
      return pushDataLayerEvent(gtmEvent, {
        ecommerce: {
          ...checkoutOrCartPayload,
        },
      })
    }

    return undefined
  }

  const beginCheckout = (checkoutOrCartPayload) => {
    const pushEvent = checkoutOrCart("begin_checkout")

    return pushEvent(checkoutOrCartPayload)
  }

  const purchase = (checkoutOrCartPayload) => {
    const pushEvent = checkoutOrCart("purchase")

    return pushEvent(checkoutOrCartPayload)
  }

  /**
   *
   * @param {Array.<Object>} itemsPayload
   * @returns
   */
  const viewItemList = (itemsPayload) => {
    if (itemsPayload) {
      return pushDataLayerEvent("view_item_list", {
        ecommerce: {
          items: [...itemsPayload],
        },
      })
    }

    return undefined
  }

  /**
   * Sends event of changes in the quantity of items in the cart.
   * @param {(Object.<string, (string|number)>|number|string)} variantPayload
   * @param {(number|string)} quantity
   * @param {string} gtmEvent
   * @returns
   */
  const updateQuantity = async (variantPayload, quantity, gtmEvent) => {
    const flatVariant = await getFlatVariant(variantPayload)

    if (!flatVariant) {
      return undefined
    }

    return pushDataLayerEvent(gtmEvent, {
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
   * the cart or add new product to cart.
   */
  const addToCart = (variantPayload, quantity) =>
    updateQuantity(variantPayload, quantity, "add_to_cart")

  /**
   * Used whenever there is a negative change in the quantity of a product in
   * the cart or remove product from cart.
   */
  const removeFromCart = (variantPayload, quantity) =>
    updateQuantity(variantPayload, quantity, "remove_from_cart")

  return {
    viewItem,
    selectItem,
    viewItemList,
    addToCart,
    removeFromCart,
    viewCart,
    beginCheckout,
    purchase,
  }
}
