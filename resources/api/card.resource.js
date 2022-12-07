const Resource = require('resources.js')

class CardResource extends Resource {
    toArray() {
        return {
            _id: this._id,
            semnox_account_id: this.semnox_account_id,
            card_name: this.card_name,
            card_number: this.card_number,
            linked_date: this.linked_date,
            card_balance: this.card_balance,
            created_at: this.created_at,
        }
    }
}

module.exports = CardResource
