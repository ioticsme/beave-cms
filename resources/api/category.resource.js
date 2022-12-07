const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class CategoryResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            slug: this.slug,
            name: this.name,
            position: this.position,
            image: this.image,
        }
    }
}

module.exports = CategoryResource
