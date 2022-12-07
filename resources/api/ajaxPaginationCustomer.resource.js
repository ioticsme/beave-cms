const Resource = require('resources.js')

class AjaxPaginationCustomerResource extends Resource {
    toArray() {
        return {
            data: this.docs,
            draw: this.draw,
            recordsTotal: this.totalDocs,
            recordsFiltered: this.totalItems,
            // pagination: {
            //     current_page: this.page,
            //     next_page: this.nextPage ? this.nextPage : null,
            //     prev_page: this.prevPage ? this.prevPage : null,
            //     limit: this.limit,
            //     total_items: this.totalDocs,
            //     total_pages: this.totalPages,
            //     paging_counter: this.pagingCounter,
            //     has_prev_page: this.hasPrevPage == 'true',
            //     has_next_page: this.hasNextPage == 'true',
            // },
        }
    }
}

module.exports = AjaxPaginationCustomerResource
