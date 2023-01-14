const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class UserResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            email: this.email,
            mobile: this.mobile,
            verified: {
                email: this.email_verified || false,
                mobile: this.mobile_verified || false,
            },
        }
    }
}

module.exports = UserResource
