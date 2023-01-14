const Resource = require('resources.js')

class CardResource extends Resource {
    toArray() {
        return {
            _id: this._id,
            card_name: this.card_name,
            card_number: this.card_number,
            linked_date: this.linked_date,
            card_balance: this.card_balance,
            created_at: this.created_at,
        }
    }
}

module.exports = CardResource
