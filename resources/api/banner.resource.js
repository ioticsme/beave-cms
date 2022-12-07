const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class BannerResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            slug: this.slug,
            title: this.title,
            image: this.image,
            banner_items:this.banner_items
        }
    }
}

module.exports = BannerResource
