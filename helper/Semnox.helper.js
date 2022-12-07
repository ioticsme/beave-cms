require('dotenv').config()
const https = require('https')
const axios = require('axios')
const { formatInTimeZone } = require('date-fns-tz')
const { getCache, setCache } = require('../helper/Redis.helper')
const { format, addDays, parseISO } = require('date-fns')
const Order = require('../model/Order')
const TransactionLog = require('../model/TransactionLog')

const agent = new https.Agent({
    rejectUnauthorized: false,
})

const login = async (selectedBrand) => {
    const settings = selectedBrand.settings
    const cache_key = `semnox-auth-${selectedBrand.name.en}-${selectedBrand.country_name}`
    const loginURL = `${settings.semnox_base_url}/Login/AuthenticateSystemUsers`
    const loginData = {
        LoginId: settings.semnox_login_id,
        Password: settings.semnox_password,
        SiteId: settings.semnox_site_id,
        MachineName: settings.semnox_machine_name,
    }

    const auth = await getCache(cache_key)
        .then(async (data) => {
            if (data) {
                return {
                    token: data,
                    is_redis: true,
                }
            } else {
                const liveData = await axios
                    .post(loginURL, loginData, { httpsAgent: agent })
                    .then(async (response) => {
                        const { WebApiToken } = response.data.data
                        return {
                            token: WebApiToken,
                        }
                    })
                    .catch((err) => {
                        // TODO:: Send slack notification for semnox login fail
                        // console.log('LOGIN ERR', err)
                        return err
                    })

                await TransactionLog.create({
                    type: 'semnox',
                    event: 'SEMNOX-AUTH',
                    url: loginURL,
                    call_request: loginData,
                    call_response: liveData,
                })

                if (liveData?.token) {
                    await setCache(
                        cache_key,
                        liveData.token,
                        parseInt(settings.cache_expiry_time)
                    )
                }

                return {
                    token: liveData?.token,
                    is_redis: false,
                }
            }
        })
        .catch((err) => {
            // TODO:: Send slack notification for redis connection fail on authentication
            // console.log(err)
            return false
        })

    // console.log(auth)

    return auth
}

// Get products
const getProducts = async (selectedBrand) => {
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    const cache_key = `semnox-products-${selectedBrand.name.en}-${selectedBrand.country_name}`
    const start_date = formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd')
    const end_date = format(
        addDays(
            parseISO(formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd')),
            2
        ),
        'yyyy-MM-dd'
    )
    const url = `${settings.semnox_base_url}/Product/ProductPriceContainer?userRoleId=13&startDateTime=${start_date}&endDateTime=${end_date}&posMachineId=9&siteId=1013`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }
    const getLiveProducts = async () => {
        return await axios
            .get(url, headerConfig)
            .then(async (res) => {
                // Setting products to cache
                // await Cache.set('SEMNOX_PRODUCTS', res?.data?.data)
                return res?.data?.data?.ProductPriceContainerSnapshotDTOList[0]
                    ?.ProductsPriceContainerDTOList
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox login fail
                return false
            })
    }

    const productList = await getCache(cache_key)
        .then(async (data) => {
            if (data) {
                // console.log(JSON.parse(data))
                return {
                    data: JSON.parse(data),
                    is_redis: true,
                }
            } else {
                const liveData = await getLiveProducts()
                // console.log(liveData)
                if (liveData.length) {
                    setCache(
                        cache_key,
                        JSON.stringify(liveData),
                        parseInt(settings.cache_expiry_time)
                    )
                }
                return {
                    data: liveData,
                    is_redis: false,
                }
            }
        })
        .catch((err) => {
            // console.log(err)
            // TODO:: Send slack notification for redis connection fail on product pull
        })

    return productList
}

// Get product price controller
const getProductPriceController = async (selectedBrand) => {
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    const cache_key = `semnox-products-${selectedBrand.name.en}-${selectedBrand.country_name}`
    const start_date = formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd')
    const url = `${settings.semnox_base_url}/Product/ProductPrice?dateTime=${start_date}`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }
    const getLiveProducts = async () => {
        return await axios
            .get(url, headerConfig)
            .then(async (res) => {
                // Setting products to cache
                // await Cache.set('SEMNOX_PRODUCTS', res?.data?.data)
                return res?.data?.data
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox login fail
                return false
            })
    }

    const productList = await getCache(cache_key)
        .then(async (data) => {
            if (data) {
                // console.log(JSON.parse(data))
                return {
                    data: JSON.parse(data),
                    is_redis: true,
                }
            } else {
                const liveData = await getLiveProducts()
                // console.log(liveData)
                if (liveData.length) {
                    setCache(
                        cache_key,
                        JSON.stringify(liveData),
                        parseInt(settings.cache_expiry_time)
                    )
                }
                return {
                    data: liveData,
                    is_redis: false,
                }
            }
        })
        .catch((err) => {
            // console.log(err)
            // TODO:: Send slack notification for redis connection fail on product pull
        })

    return productList
}

// Get Card
const getCard = async (selectedBrand, searchField, searchValue, userId) => {
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    const url = `${settings.semnox_base_url}/Customer/Account/Accounts?${searchField}=${searchValue}&buildChildRecords=true`
    // console.log(url)
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }
    try {
        const apiCall = await axios
            .get(url, headerConfig)
            .then(async (res) => {
                // console.log(res.data)
                return res?.data?.data
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                return false
            })

        await TransactionLog.create({
            user: userId,
            type: 'semnox',
            event: 'SEMNOX-GET-CARD',
            url: url,
            call_request: {
                field: searchField,
                value: searchValue,
            },
            call_response: apiCall,
        })

        return apiCall
    } catch (e) {
        return false
    }
}

// Link Card to customer
const linkCardToCustomer = async (
    selectedBrand,
    accountId,
    cardNumber,
    userId,
    order_id = false
) => {
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    const url = `${settings.semnox_base_url}/Customer/Account/AccountService/LinkAccountToCustomers`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }
    try {
        let body = {
            SourceAccountDTO: {
                AccountId: accountId,
                TagNumber: cardNumber,
                CustomerId: -1,
            },
            CustomerDTO: {
                Id: userId,
            },
        }

        const apiCall = await axios
            .post(url, body, headerConfig)
            .then(async (res) => {
                return {
                    status: true,
                    data: res?.data?.data,
                }
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                return {
                    status: false,
                    data: err.response?.data?.data,
                }
            })

        // if (order_id) {
        await TransactionLog.create({
            order_id: order_id || undefined,
            // user: userId || undefined,
            type: 'semnox',
            event: 'SEMNOX-CARD-LINKING',
            url: url,
            call_request: body,
            call_response: apiCall,
        })
        // }

        return apiCall
    } catch (e) {
        return false
    }
}

// Get Customers
const getCustomers = async (selectedBrand, userId, idType = 'email') => {
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    let concatString
    if (idType == 'email') {
        concatString = `emailId=${userId}`
    } else {
        concatString = `contactNumber=${userId}`
    }
    // concatString = `emailId=${email}`
    const url = `${settings.semnox_base_url}/Customer/Customers?buildChildRecords=true&${concatString}`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }
    try {
        return await axios
            .get(url, headerConfig)
            .then(async (res) => {
                return res?.data?.data[0]
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                return false
            })
    } catch (e) {
        return false
    }
}

// Save Customer
const saveCustomer = async (selectedBrand, customerObject) => {
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    const url = `${settings.semnox_base_url}/Customer/Customers`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }

    const userData = {
        Id: -1,
        IsActive: true,
        ProfileId: -1,
        MembershipId: -1,
        UniqueIdentifier: '',
        TaxCode: '',
        Verified: true,
        ProfileDTO: {
            Id: -1,
            ProfileTypeId: 1,
            ProfileType: 1,
            Title: 'Ms.',
            FirstName: customerObject.first_name || '',
            MiddleName: customerObject.middle_name || '',
            LastName: customerObject.last_name || '',
            Notes: '',
            DateOfBirth: customerObject.dob || '',
            Gender: customerObject.gender || '',
            Anniversary: '',
            PhotoURL: '',
            RightHanded: false,
            TeamUser: true,
            UserName: '',
            Password: '',
            ContactDTOList: [
                {
                    Id: -1,
                    ProfileId: -1,
                    ContactTypeId: 1,
                    ContactType: 'PHONE',
                    Attribute1: customerObject.mobile || '',
                    Attribute2: '',
                    IsChanged: true,
                },
                {
                    Id: -1,
                    ProfileId: -1,
                    ContactTypeId: 2,
                    ContactType: 'EMAIL',
                    Attribute1: customerObject.email || '',
                    Attribute2: '',
                    IsChanged: true,
                },
            ],
            AddressDTOList: [],
            IsActive: true,
            IsChanged: true,
            IsChangedRecursive: true,
        },
        IsChanged: true,
        IsChangedRecursive: true,
    }

    // console.log(userData)

    try {
        return await axios
            .post(url, userData, headerConfig)
            .then(async (res) => {
                return res?.data?.data
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                // console.log(err.response)
                return false
            })
    } catch (e) {
        return false
    }
}

// Transaction
const transactionEstimate = async (user, order) => {
    // Getting token
    // console.log(user)
    let AUTH_DATA = await login(user.selected_brand)
    const settings = user.selected_brand.settings
    const url = `${settings.semnox_base_url}/Transaction/Transactions`
    const paymentModeId = settings.semnox_payment_mode
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }

    let transactionLinesDTOList = []

    // Pulling Regular Items
    order.items.forEach((item) => {
        transactionLinesDTOList.push({
            LineId: -1,
            ProductId: item.semnox.id,
            Quantity: item.qty,
            CardNumber: item.card?.card_number || '',
        })
        // Adding free product if selected item have:
        if (item.free_product?._id) {
            transactionLinesDTOList.push({
                LineId: -1,
                ProductId: item.free_product.semnox.id,
                Quantity: 1,
                CardNumber: item.card?.card_number || '',
            })
        }
    })

    // Pulling Free Toy Items
    if (order.has_free_toy && order.free_toy_qty) {
        if (order.free_toy?.semnox?.id) {
            for (let i = 0; i < order.free_toy_qty; i++) {
                transactionLinesDTOList.push({
                    LineId: -1,
                    ProductId: order.free_toy.semnox.id,
                    Quantity: 1,
                })
            }
        }
    }

    // order.discount?.coupon?.

    const transactionData = {
        TransactionId: -1,
        SiteId: settings.semnox_site_id,
        PosMachine: 'webplatform',
        PrimaryCardId: -1,
        CustomerId: user.semnox_user_id || -1,
        // CustomerId: -1,
        UserName: '',
        TransactionLinesDTOList: transactionLinesDTOList,
        TrxPaymentsDTOList: null,
        TrxDiscountsDTOList: null,
        PrimaryCard: '',
        CustomerName: '',
        ShouldCommit: false,
        CloseTransaction: false,
        ApplyOffset: true,
        PaymentProcessingCompleted: false,
        ReverseTransaction: false,
        PaymentModeId: paymentModeId, //Cash Payment
        PaymentReference: 'cash',
    }

    // console.log(transactionData)

    try {
        const apiCall = await axios
            .post(url, transactionData, headerConfig)
            .then(async (res) => {
                // console.log(res.data.data)
                return {
                    status: true,
                    data: res?.data?.data,
                }
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                // console.log(err.response)
                return {
                    status: false,
                    data: err.response?.data?.data,
                }
            })

        await TransactionLog.create({
            order_id: order._id,
            type: 'semnox',
            event: 'SEMNOX-TRANSACTION',
            url: url,
            call_request: transactionData,
            call_response: apiCall,
        })

        return apiCall
    } catch (e) {
        // console.log(e)
        return {
            status: false,
            data: 'API Call error',
        }
    }
}

// Apply Discount
const applyDiscount = async (user, order) => {
    // Getting token
    // console.log(user)
    let AUTH_DATA = await login(user.selected_brand)
    const settings = user.selected_brand.settings
    const url = `${settings.semnox_base_url}/Transaction/ApplyDiscounts`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }

    const transactionData = {
        TransactionId: 0,
        TransactionDate: new Date(),
        TransactionAmount: 49.0,
        TransactionDiscountPercentage: null,
        TransactionDiscountAmount: 0.0,
        TaxAmount: 6.39130434782608,
        TransactionNetAmount: 49.0,
        PosMachine: 'webplatform',
        UserId: -1,
        PaymentMode: -1,
        PaymentModeName: null,
        CashAmount: null,
        CreditCardAmount: null,
        GameCardAmount: null,
        PaymentReference: null,
        PrimaryCardId: -1,
        OrderId: -1,
        POSTypeId: -1,
        TransactionNumber: '',
        TransactionOTP: null,
        Remarks: null,
        POSMachineId: -1,
        OtherPaymentModeAmount: null,
        Status: 'OPEN',
        TransactionProfileId: -1,
        LastUpdateTime: '0001-01-01T00:00:00',
        LastUpdatedBy: null,
        TokenNumber: null,
        OriginalSystemReference: null,
        CustomerId: -1,
        ExternalSystemReference: null,
        ReprintCount: 0,
        OriginalTransactionId: -1,
        OrderTypeGroupId: -1,
        TableNumber: null,
        Paid: null,
        UserName: null,
        CreatedBy: -1,
        CreationDate: '0001-01-01T00:00:00',
        Guid: null,
        SynchStatus: false,
        SiteId: 1013,
        MasterEntityId: -1,
        Selected: false,
        Tickets: null,
        Receipt: null,
        TicketsHTML: null,
        ReceiptHTML: null,
        VisitDate: null,
        ApplyVisitDate: false,
        IsChanged: true,
        IsChangedRecursive: true,
        TransactionLinesDTOList: [
            {
                taxAmount: 6.39130434782608,
                taxName: 'VAT',
                TransactionId: 0,
                LineId: -1,
                ApprovedBy: '',
                ProductId: 242,
                Price: 42.6086956521739,
                Quantity: 1.0,
                Amount: 49.0,
                CardId: -1,
                CardNumber: 'TWU2H30K',
                Credits: null,
                Courtesy: null,
                TaxPercentage: 15.0,
                TaxId: 4,
                Time: null,
                Bonus: null,
                Tickets: null,
                LoyaltyPoints: null,
                Remarks: '',
                PromotionId: -1,
                ReceiptPrinted: false,
                ParentLineId: -1,
                UserPrice: false,
                KOTPrintCount: null,
                GameplayId: -1,
                KDSSent: false,
                CreditPlusConsumptionId: -1,
                CancelledTime: null,
                CancelledBy: null,
                ProductDescription: null,
                IsWaiverSignRequired: null,
                OriginalLineId: -1,
                Guid: null,
                ClientGuid: null,
                SynchStatus: false,
                SiteId: -1,
                MasterEntityId: -1,
                MembershipId: -1,
                MembershipRewardsId: -1,
                ExpireWithMembership: 'N',
                ForMembershipOnly: 'N',
                IsChanged: true,
                ProductDetail: null,
                ProductName: 'Playzone _ AED 49',
                ProductTypeCode: 'CARDSALE',
                Selected: false,
                CreatedBy: null,
                CreationDate: '0001-01-01T00:00:00',
                LastUpdatedBy: null,
                LastUpdatedDate: '0001-01-01T00:00:00',
                CardGuid: null,
                ProductsDTO: null,
                WaiverSignedDTOList: null,
                AttractionBookingDTO: null,
                ParentLineGuid: '',
                TransactionDiscountsDTOList: null,
                CancelCode: '',
                TaxAmount: 6.39130434782608,
                TaxName: 'VAT',
                SubscriptionHeaderDTO: null,
            },
        ],
        TrxPaymentsDTOList: [],
        DiscountsSummaryDTOList: [],
        DiscountApplicationHistoryDTOList: [
            {
                DiscountId: 4,
                VariableDiscountAmount: 24,
            },
        ],
        PrimaryCard: 'TWU2H30K',
        ReceiptDTO: null,
        TicketDTOList: null,
        CustomerName: null,
        CommitTransaction: false,
        SaveTransaction: false,
        CloseTransaction: false,
        ApplyOffset: false,
        PaymentProcessingCompleted: false,
        ReverseTransaction: false,
        CustomerIdentifier: null,
        TrxPOSPrinterOverrideRulesDTO: null,
    }

    // console.log(userData)

    try {
        return await axios
            .post(url, transactionData, headerConfig)
            .then(async (res) => {
                // console.log(res.data.data)
                return res?.data?.data
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                // console.log(err.response)
                return false
            })
    } catch (e) {
        // console.log(e)
        return false
    }
}

// Close Transaction
const closeTransaction = async (user, order, estimatedData) => {
    // Getting token
    // console.log(user)
    let AUTH_DATA = await login(user.selected_brand)
    const settings = user.selected_brand.settings
    const url = `${settings.semnox_base_url}/Transaction/Transactions`
    const paymentModeId = settings.semnox_payment_mode
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }

    // console.log(AUTH_DATA.token)

    const transactionData = {
        ...estimatedData.data,
        CustomerId: order?.user?.semnox_user_id || -1, // Check
        // Only in Close
        TrxPaymentsDTOList: [
            {
                PaymentId: -1,
                TransactionId: -1,
                PaymentModeId: paymentModeId, //Cash Payment
                Amount: order.amount_to_pay,
                // Amount: estimatedData.data.TransactionAmount,
                Reference: order.order_no
                    ? `Paid Online - ${order.order_no}`
                    : '',
            },
        ],
        // Only in close with discount
        // DiscountsSummaryDTOList: [
        //     {
        //         DiscountId: 4,
        //         DiscountPercentage: 48.97959183673469387755102041,
        //         DiscountName: 'Variable Discount',
        //         DiscountAmount: 24.0,
        //         Count: 1,
        //         VariableDiscountAmount: 0.0,
        //         DisplayChar: '*',
        //         TotalLineAmount: 49.0,
        //         ApprovedBy: 0,
        //         Remarks: null,
        //         TotalNoOfLines: 1,
        //         CouponNumbers: [],
        //     },
        // ],
        // Only in close with discount
        // DiscountApplicationHistoryDTOList: [
        //     {
        //         DiscountId: 4,
        //         CouponNumber: '',
        //         VariableDiscountAmount: 24.0,
        //         ApprovedBy: -1,
        //         Remarks: null,
        //         TransactionLineBL: null,
        //         IsCancelled: false,
        //         TransactionLineGuid: null,
        //     },
        // ],
        CloseTransaction: true, // only in close
    }

    // console.log(transactionData)

    try {
        const apiCall = await axios
            .post(url, transactionData, headerConfig)
            .then(async (res) => {
                // console.log(res.data.data)
                return {
                    status: true,
                    data: res?.data?.data,
                }
            })
            .catch(async (err) => {
                // TODO:: Send slack notification for semnox get card api fail
                // console.warn(err.response?.data?.data)
                return {
                    status: false,
                    data: err.response?.data?.data,
                }
            })

        await TransactionLog.create({
            order_id: order._id,
            type: 'semnox',
            event: 'SEMNOX-CLOSE-TRANSACTION',
            url: url,
            call_request: transactionData,
            call_response: apiCall,
        })
        return apiCall
    } catch (e) {
        // console.warn(e)
        return {
            status: false,
            data: 'API Call error',
        }
    }
}

// Buy New card
const buyNewCard = async (selectedBrand, commit = false, close = false) => {
    console.log(commit, close)
    // Getting token
    let AUTH_DATA = await login(selectedBrand)
    const settings = selectedBrand.settings
    // const cache_key = `semnox-products-${selectedBrand.name.en}-${selectedBrand.country_name}`
    const url = `${settings.semnox_base_url}/Transaction/Transactions`
    const headerConfig = {
        httpsAgent: agent,
        headers: {
            Authorization: AUTH_DATA.token,
        },
    }

    const bodyParams = {
        TransactionId: 11,
        SiteId: selectedBrand.settings.semnox_site_id,
        PosMachine: 'webplatform',
        PrimaryCardId: -1,
        CustomerId: -1,
        UserName: 'restapi',
        TransactionLinesDTOList: [
            {
                LineId: -1,
                ProductId: 132,
                Quantity: 1,
            },
            {
                LineId: -1,
                ProductId: 132,
                Quantity: 1,
            },
        ],

        CommitTransaction: commit,
        CloseTransaction: close,
    }

    const buyNewCardTransaction = await axios
        .post(url, bodyParams, headerConfig)
        .then(async (res) => {
            return res?.data?.data
        })
        .catch(async (err) => {
            // TODO:: Send slack notification for semnox buy new card fail
            console.log(err)
            return false
        })

    return buyNewCardTransaction
}

module.exports = {
    getProducts,
    getProductPriceController,
    getCard,
    linkCardToCustomer,
    getCustomers,
    saveCustomer,
    transactionEstimate,
    applyDiscount,
    closeTransaction,
    buyNewCard,
}
