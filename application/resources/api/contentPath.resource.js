const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class ContentPathResource extends Resource {
    toArray() {
        return {
            params: { slug: this.slug },
            locale: `${this.country.code}`,
        }
    }
}

module.exports = ContentPathResource
