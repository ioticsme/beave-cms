const Resource = require('resources.js')
const BannerResource = require('./banner.resource')
const GalleryResource = require('./gallery.resources')
// const UserAddressResource = require('./userAddress.resource');

class ContentResource extends Resource {
    toArray() {
        return {
            _id: this._id,
            slug: this.slug,
            type_slug: this.type_slug,
            template_name: this.template_name,
            published: this.published,
            brand: this.brand,
            country: this.country,
            content: this.content,
            attached_content: this.attached_content,
            banner: this.banner ? new BannerResource(this.banner).exec() : undefined,
            gallery: this.gallery ? new GalleryResource(this.gallery).exec() : undefined,
            meta: this.meta,
        }
    }
}

module.exports = ContentResource
