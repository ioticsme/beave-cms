const Resource = require('resources.js')
const PAMChildResource = require('./pamChildren.resource')

class PAMParentResource extends Resource {
    toArray() {
        return {
            id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            email: this.email,
            mobile: this.mobile,
            children: PAMChildResource.collection(this.get_children),
        }
    }
}

module.exports = PAMParentResource
