const Resource = require('resources.js')
const CategoryResource = require('./category.resource')

class ProductResource extends Resource {
    toArray() {
        return {
            _id: this._id,
            slug: this.slug,
            name: this.name,
            description: this.description,
            terms_and_conditions: this.terms_and_conditions,
            price: {
                display:
                    this.sales_price > 0
                        ? this.sales_price?.toFixed(this.decimal_points || 2)
                        : this.actual_price?.toFixed(this.decimal_points || 2),
                actual: this.actual_price?.toFixed(this.decimal_points || 2),
                sales: this.sales_price?.toFixed(this.decimal_points || 2),
            },
            currency: this.currency?.toUpperCase(),
            category: this.category?.length
                ? CategoryResource.collection(this.category)
                : undefined,
            image: this.image,
            featured: this.featured,
            membership: this.membership
        }
    }
}

module.exports = ProductResource
