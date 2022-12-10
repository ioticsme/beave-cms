const Resource = require('resources.js')
const MenuChildResource = require('./menuChild.resource')
// const UserAddressResource = require('./userAddress.resource');

class MenuResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            label: this.nav_label,
            menu_type: this.menu_type,
            position: this.nav_position,
            url: this.url,
            // content_path: this.content_path,
            child: this.nav_items ? MenuChildResource.collection(this.nav_items) : undefined,
        }
    }
}

module.exports = MenuResource
