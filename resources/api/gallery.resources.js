const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class GalleryResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            slug: this.slug,
            title: this.title,
            description: this.description,
            image: this.image,
            gallery_items: this.gallery_items,
        }
    }
}

module.exports = GalleryResource
