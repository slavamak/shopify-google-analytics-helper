export const productVariantFragment = `fragment variant on ProductVariant {
	id
	sku
	title
	price { amount }
	compareAtPrice { amount }
	image { originalSrc }
	product {
		id
		title
		handle
		productType
		vendor
	}
}`

export const fetchVariantQuery = `query($id: ID!) {
	node(id: $id) {
		...variant
	}
}
${productVariantFragment}`
