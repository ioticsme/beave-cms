const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class PAMMembershipResource extends Resource {
    toArray() {
        return {
            // id: this.id,
			membership_no : this.id,
            membership_id : this.get_member_ship_name?.id,
            membership_name: this.get_member_ship_name?.membership_name,
            validity_days: this.validity_days,
            valid_group: this.get_member_ship_name?.valid_group,
            expiry: this.expiry,
            expiry_date: this.expiry_date,

			duration : this.get_member_ship_name?.validity_days,
//			renewed_on : this.renewed_on,
			// expiry : this.expiry,
			days_left : this.balance_days,
			expired : this.expired,
			since : this.since,
        }
    }
}

module.exports = PAMMembershipResource
