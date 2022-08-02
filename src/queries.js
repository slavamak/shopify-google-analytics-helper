// Product Variant fragment
export const productVariantFragment = `fragment variant on ProductVariant {
	id
	sku
	title
	price
	compareAtPrice
	image { originalSrc }
	product {
		id
		title
		handle
		productType
		vendor
	}
}`

// Graphql query to fetch a variant by id
export const fetchVariantQuery = `query($id: ID!) {
	node(id: $id) {
		...variant
	}
}
${productVariantFragment}`

// Graphql query to fetch a cart by id
export const fetchCartQuery = `query($id: ID!) {
	node: cart(id: $id) {
		... on Cart {
			id
			webUrl: checkoutUrl
			estimatedCost {
				subtotalAmount { amount }
				totalAmount { amount }
			}
			lineItems: lines (first: 250) {
				edges {
					node {
						... on CartLine {
							id
							quantity
							variant: merchandise { ...variant }
						}
					}
				}
			}
		}
	}
}
${productVariantFragment}`

// Graphql query to fetch a checkout by id
export const fetchCheckoutQuery = `query($id: ID!) {
	node(id: $id) {
		... on Checkout {
			id
			webUrl
			subtotalPrice
			totalPrice
			lineItems (first: 250) {
				edges {
					node {
						... on CheckoutLineItem {
							id
							quantity
							variant { ...variant }
						}
					}
				}
			}
		}
	}
}
${productVariantFragment}`
