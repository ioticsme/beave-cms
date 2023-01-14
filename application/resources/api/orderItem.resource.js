const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class OrderItemResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            name: this.name,
            price: this.sales_price > 0 ? this.sales_price : this.actual_price,
            actual_price: this.actual_price,
            sales_price: this.sales_price,
            new_card: this.new_card,
            // card_name: this.card_name,
            transaction_type: this.transaction_type,
            card: this.card,
            qty: this.qty,
            pam: this.pam,
            item_total: ((this.sales_price > 0 ? this.sales_price : this.actual_price) * this.qty).toFixed(2),
        }
    }
}

module.exports = OrderItemResource
