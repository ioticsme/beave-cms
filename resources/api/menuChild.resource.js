const Resource = require('resources.js')
// const UserAddressResource = require('./userAddress.resource');

class MenuChildResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            label: this.label,
            position: this.position,
            url: this.url,
            // content_path: this.content_path,
            active: this.active ? true : false,
            child: this.child
                ? MenuChildResource.collection(this.child)
                : undefined,
        }
    }
}

module.exports = MenuChildResource
