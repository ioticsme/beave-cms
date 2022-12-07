const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class AppBannerResource extends Resource {
    toArray() {
        return {
            _id: this._id,
            slug: this.slug,
            title: this.title,
            // image: this.image,
            banner_items: AppBannerItemResource.collection(this.banner_items),
        }
    }
}

class AppBannerItemResource extends Resource {
    toArray() {
        return {
            _id: this._id,
            title: this.title,
            description: this.description,
            btn_text: this.btn_text,
            btn_url: this.btn_url,
            images: this.images?.common_image,
            position: this.position,
        }
    }
}

module.exports = AppBannerResource
