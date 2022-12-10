require('dotenv').config()
const _ = require('lodash')
// const Content = require('../../node_modules/@ioticsme/cms/model/Content')
const Country = require('../../model/Country')
const Brand = require('../../model/Brand')
const OrderResource = require('../../resources/api/order.resource')

const {
    buyNewCard,
    getCard,
    getCustomers,
    saveCustomer,
} = require('../../helper/Semnox.helper')
// const { generatePdfInvoice } = require('../../helper/Operations.helper')
const Order = require('../../model/Order')
const { currencyConverter } = require('../../helper/Payfort.helper')
const { fileLogger } = require('../../helper/Operations.helper')
const { orderNotification } = require('../../helper/Slack.helper')

const brandList = async (req, res) => {
    try {
        const brand = await Brand.find()
        res.status(200).json(brand)
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const countryList = async (req, res) => {
    try {
        const country = await Country.find()
        res.status(200).json(country)
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

const test = async (req, res) => {
    // const test = await currencyConverter(100,'aed','aed')
    const test = {
        PAYFORT_URL: process.env.PAYFORT_URL,
        PAYFORT_API_URL: process.env.PAYFORT_API_URL,
        MERCHANT_IDENTIFIER: process.env.MERCHANT_IDENTIFIER,
        ACCESS_CODE: process.env.ACCESS_CODE,
        SHA_REQUEST_PARSE: process.env.SHA_REQUEST_PARSE,
        SHA_RESPONSE_PARSE: process.env.SHA_RESPONSE_PARSE,
        SHA_TYPE: process.env.SHA_TYPE,
    }

    // fileLogger('Helloooo', 'semnox-order-push-queue', 'transaction')
    fileLogger(
        `{"Amount":190,"ApprovedBy":"","AttractionBookingDTO":null,"Bonus":null,"CancelCode":"","CancelledBy":null,"CancelledTime":null,"CardGuid":null,"CardId":-1,"CardNumber":"TNJK3IRW","ClientGuid":null,"Courtesy":null,"CreatedBy":null,"CreationDate":"0001-01-01T00:00:00","CreditPlusConsumptionId":-1,"Credits":null,"ExpireWithMembership":"N","ForMembershipOnly":"N","GameplayId":-1,"Guid":null,"IsChanged":true,"IsWaiverSignRequired":null,"KDSSent":false,"KOTPrintCount":null,"LastUpdatedBy":null,"LastUpdatedDate":"0001-01-01T00:00:00","LineId":-1,"LoyaltyPoints":null,"MasterEntityId":-1,"MembershipId":-1,"MembershipRewardsId":-1,"OriginalLineId":-1,"ParentLineGuid":"","ParentLineId":-1,"Price":165.217391304348,"ProductDescription":null,"ProductDetail":null,"ProductId":226,"ProductName":"PKG AED 190 _ 31 PLAYS باقة 190 د _ 31 لعبة","ProductTypeCode":"CARDSALE","ProductsDTO":null,"PromotionId":-1,"Quantity":1,"ReceiptPrinted":false,"Remarks":"","Selected":false,"SiteId":-1,"SubscriptionHeaderDTO":null,"SynchStatus":false,"TaxAmount":24.7826086956522,"TaxId":4,"TaxName":"VAT","TaxPercentage":15,"Tickets":null,"Time":null,"TransactionDiscountsDTOList":null,"TransactionId":0,"UserPrice":false,"WaiverSignedDTOList":null,"taxAmount":24.7826086956522,"taxName":"VAT"},{"Amount":190,"ApprovedBy":"","AttractionBookingDTO":null,"Bonus":null,"CancelCode":"","CancelledBy":null,"CancelledTime":null,"CardGuid":null,"CardId":-1,"CardNumber":"TQ952086","ClientGuid":null,"Courtesy":null,"CreatedBy":null,"CreationDate":"0001-01-01T00:00:00","CreditPlusConsumptionId":-1,"Credits":null,"ExpireWithMembership":"N","ForMembershipOnly":"N","GameplayId":-1,"Guid":null,"IsChanged":true,"IsWaiverSignRequired":null,"KDSSent":false,"KOTPrintCount":null,"LastUpdatedBy":null,"LastUpdatedDate":"0001-01-01T00:00:00","LineId":-1,"LoyaltyPoints":null,"MasterEntityId":-1,"MembershipId":-1,"MembershipRewardsId":-1,"OriginalLineId":-1,"ParentLineGuid":"","ParentLineId":-1,"Price":165.217391304348,"ProductDescription":null,"ProductDetail":null,"ProductId":226,"ProductName":"PKG AED 190 _ 31 PLAYS باقة 190 د _ 31 لعبة","ProductTypeCode":"CARDSALE","ProductsDTO":null,"PromotionId":-1,"Quantity":1,"ReceiptPrinted":false,"Remarks":"","Selected":false,"SiteId":-1,"SubscriptionHeaderDTO":null,"SynchStatus":false,"TaxAmount":24.7826086956522,"TaxId":4,"TaxName":"VAT","TaxPercentage":15,"Tickets":null,"Time":null,"TransactionDiscountsDTOList":null,"TransactionId":0,"UserPrice":false,"WaiverSignedDTOList":null,"taxAmount":24.7826086956522,"taxName":"VAT"},{"Amount":0,"ApprovedBy":"","AttractionBookingDTO":null,"Bonus":null,"CancelCode":"","CancelledBy":null,"CancelledTime":null,"CardGuid":null,"CardId":-1,"CardNumber":"IWX9W6SJ","ClientGuid":null,"Courtesy":null,"CreatedBy":null,"CreationDate":"0001-01-01T00:00:00","CreditPlusConsumptionId":-1,"Credits":null,"ExpireWithMembership":"N","ForMembershipOnly":"N","GameplayId":-1,"Guid":null,"IsChanged":true,"IsWaiverSignRequired":null,"KDSSent":false,"KOTPrintCount":null,"LastUpdatedBy":null,"LastUpdatedDate":"0001-01-01T00:00:00","LineId":-1,"LoyaltyPoints":null,"MasterEntityId":-1,"MembershipId":-1,"MembershipRewardsId":-1,"OriginalLineId":-1,"ParentLineGuid":"","ParentLineId":-1,"Price":0,"ProductDescription":null,"ProductDetail":null,"ProductId":237,"ProductName":"Free Toy","ProductTypeCode":"CARDSALE","ProductsDTO":null,"PromotionId":-1,"Quantity":1,"ReceiptPrinted":false,"Remarks":"","Selected":false,"SiteId":-1,"SubscriptionHeaderDTO":null,"SynchStatus":false,"TaxAmount":0,"TaxId":-1,"TaxName":"","TaxPercentage":0,"Tickets":null,"Time":null,"TransactionDiscountsDTOList":null,"TransactionId":0,"UserPrice":false,"WaiverSignedDTOList":null,"taxAmount":0,"taxName":""}`,
        'semnox-order-push-queue',
        'debug',
        'debug'
    )

    const order = new OrderResource(await Order.findOne().populate('user')).exec()
    console.log(order)
    await orderNotification(order)

    return res.json(test)
}

const semnoxCardDetail = async (req, res) => {
    const response = await getCard(
        req.authPublicUser.selected_brand,
        'customerId',
        // 'TG5GGNNY'
        '35',
        'dg57sdsdgsdf8'
    )
    res.json(response)
}

const semnoxCustomerDetail = async (req, res) => {
    const response = await getCustomers(
        req.authPublicUser.selected_brand,
        '8789878986',
        'phone' // Optional and default will be email
    )
    res.json(response)
}

const semnoxSaveCustomer = async (req, res) => {
    const userObject = {
        firstName: 'Ebrahim',
        lastName: 'Nayakkan',
        // dob: '11-12-1983',
        // gender: 'M',
        mobile: '971526510732',
        email: 'ebrahim@iotics.me',
    }
    const response = await saveCustomer(
        req.authPublicUser.selected_brand,
        userObject
    )
    res.json(response)
}

const pdfGenerate = async (req, res) => {
    const order = await Order.findOne()
        .select('-__v -updated_at -deletedAt -isDeleted')
        .populate('country')
        .populate('user', 'first_name last_name email mobile')
    if (order) {
        const invocieData = {
            order: new OrderResource(order).exec(),
            generic_details: {
                invoice_address:
                    req.brand.settings.ecommerce_settings.invoice_address,
                terms_and_conditions:
                    req.brand.settings.ecommerce_settings.terms_and_conditions,
                footer_text:
                    req.brand.settings.ecommerce_settings.terms_and_conditions,
                trn_number: req.brand.settings.ecommerce_settings.trn_number,
                vat_percentage:
                    req.brand.settings.ecommerce_settings.vat_percentage,
            },
            year: 2022,
        }
        // const generate = await generatePdfInvoice(invocieData)
        return res.send(generate)
    }
}

module.exports = {
    brandList,
    countryList,
    test,
    semnoxCardDetail,
    semnoxCustomerDetail,
    semnoxSaveCustomer,
    pdfGenerate,
}
