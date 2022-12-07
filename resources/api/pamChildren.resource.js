const Resource = require('resources.js')
const PAMMembershipResource = require('./pamMembership.resource')

class PAMChildResource extends Resource {
    toArray() {
        return {
            id: this.id,
            parent_id: this.parent_id,
            first_name: this.first_name,
            last_name: this.last_name,
            dob: this.dob,
            height: this.height,
            height_updated_at: this.height_updated_at,
            gender: this.gender,
            check_in: this.check_in,
            guest: this.guest,
            signature_id: this.signature_id,
            memberships: PAMMembershipResource.collection(
                this.get_ecom_memberships
            ),
        }
    }
}

module.exports = PAMChildResource
