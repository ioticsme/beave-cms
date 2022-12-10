const Resource = require('resources.js')
const OrderItemResource = require('./orderItem.resource')
const { format } = require('date-fns')
// const UserAddressResource = require('./userAddress.resource');

class OrderResource extends Resource {
    toArray() {
        return {
            _id: this.id,
            order_no: this.order_no,
            // user: this.user,
            // brand: this.brand,
            currency: this.country?.currency?.toUpperCase(),
            // country: {
            //     _id: this.country._id,
            //     name: this.country.name,
            //     code: this.country.code,
            //     currency: this.country.currency,
            //     currency_symbol: this.country.currency_symbol,
            // },
            items: OrderItemResource.collection(this.items),
            has_free_toy: this.has_free_toy || false,
            free_toy_qty: this.free_toy_qty || 0,
            free_toy_cards: this.free_toy.received_card_nos,
            payment_method: this.payment_method,
            payment_status: this.payment_status,
            semnox_status: this.semnox_status,
            order_status: this.order_status,
            amount: parseFloat(this.amount).toFixed(2),
            sub_total: parseFloat(this.amount_to_pay - this.vat.incl).toFixed(2),
            amount_to_pay: parseFloat(this.amount_to_pay).toFixed(2),
            created_at: this.created_at,
            created_at_formatted: this.created_at
                ? format(this.created_at, 'dd-MM-yyyy')
                : undefined,
            updated_at: this.updated_at,
            updated_at_formatted: this.updated_at
                ? format(this.updated_at, 'dd-MM-yyyy')
                : undefined,
            vat: {
                percentage: parseFloat(this.vat.percentage).toFixed(2),
                incl: parseFloat(this.vat.incl).toFixed(2),
                excl: parseFloat(this.vat.excl).toFixed(2),
            },
            discount: {
                amount: this.discount.amount || 0,
                applied_coupon: this.discount.applied_coupon,
                coupon: {
                    _id: this.discount.coupon?._id,
                    coupon_type: this.discount.coupon?.coupon_type,
                    discount_value: this.discount.coupon?.discount_value,
                    free_product: this.discount.coupon?.free_product,
                },
            },
            user: {
                _id: this.user?._id,
                name: this.user?.first_name,
                first_name: this.user?.first_name,
                last_name: this.user?.last_name,
                email: this.user?.email,
            },
            payment_response: this.payment_response,
            semnox_otp: this.semnox_transaction_otp,
        }
    }
}

module.exports = OrderResource
