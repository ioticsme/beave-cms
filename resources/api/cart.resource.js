const Resource = require('resources.js')
const CardResource = require('./card.resource');

class CartResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            user: this.user,
            qty: this.qty,
            item_sum: (
                this.qty *
                (this.product.sales_price > 0
                    ? this.product.sales_price
                    : this.product.actual_price)
            ).toFixed(2),
            new_card: this.card ? false : true,
            card: this.card ? new CardResource(this.card).exec() : {
                card_name: this.card_name
            },
            product: {
                _id: this.product.id,
                name: this.product.name,
                description: this.product.description,
                sales_price: this.product.sales_price.toFixed(2),
                actual_price: this.product.actual_price.toFixed(2),
                image: this.product.image.default_image.media_url,
            },
            pam: this.pam
        }
    }
}

module.exports = CartResource
