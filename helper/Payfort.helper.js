const crypto = require('crypto')
const axios = require('axios')
const TransactionLog = require('../model/TransactionLog')

const createHash = function (string, secret) {
    // let hash = crypto.createHash("sha256");
    //   return hash.update(string).digest("hex");

    // return crypto.createHash('sha256').update(string).digest('hex');
    const sha256Hasher = crypto.createHmac('sha256', secret)

    // return sha256Hasher.update(string).digest("hex")
    var hash2 = crypto.createHash('sha256').update(string).digest('hex')
    return hash2
}

const calculateSignature = function (object, type) {
    const passphrase =
        type == 'request'
            ? process.env.SHA_REQUEST_PARSE
            : process.env.SHA_RESPONSE_PARSE
    var signatureText = ''
    var keys = []
    for (var eachKey in object) {
        keys.push(eachKey)
    }
    keys.sort(compare)

    var len = keys.length

    for (var i = 0; i < len; i++) {
        var k = keys[i]
        signatureText = signatureText + (k + '=' + object[k])
    }
    var signature = createHash(
        passphrase + signatureText + passphrase,
        passphrase
    )
    // console.log(signatureText)
    // console.log(passphrase)
    // console.log(signature)
    // console.log(object);
    return signature
}

function compare(a, b) {
    if (a < b) return -1
    if (a > b) return 1
    return 0
}

// function testSignature() {
//     const data = {
//         merchant_identifier: 'PAFGHYMV',
//         access_code: 'OZ5Cuu6qLjE3CwpByuJG',
//         merchant_reference: 'ABC123',
//         service_command: 'TOKENIZATION',
//         language: 'en',
//         return_url: `${process.env.FRONTEND_URL}/en-ae/order/payment`,
//         // signature: 'd667468d8e89af1a563414e741e3c80249f68554e51bb3a834b31cf66a137976'
//     }

//     const iframeParams = {
//         merchant_identifier: 'PAFGHYMV',
//         access_code: 'OZ5Cuu6qLjE3CwpByuJG',
//         merchant_reference: '1839252644',
//         service_command: 'TOKENIZATION',
//         language: 'en',
//         // 'return_url'          : 'http://localhost:8000/route.php?r=merchantPageReturn',
//         return_url: `${process.env.FRONTEND_URL}/en-ae/order/payment`,
//     }

//     const responseParams = {
//         access_code: 'OZ5Cuu6qLjE3CwpByuJG',
//         card_bin: '512345',
//         card_holder_name: '******',
//         card_number: '****************',
//         expiry_date: '****',
//         language: 'en',
//         merchant_identifier: 'PAFGHYMV',
//         merchant_reference: 'ABC1663505855302',
//         response_code: '18000',
//         response_message: 'Success',
//         return_url: `${process.env.FRONTEND_URL}/en-ae/order/payment`,
//         service_command: 'TOKENIZATION',
//         status: '18',
//         token_name: '9cec38201a4945b390d0371769321836',
//     }

//     // [merchant_identifier] => PAFGHYMV
//     // [access_code] => OZ5Cuu6qLjE3CwpByuJG
//     // [merchant_reference] => 1839252644
//     // [service_command] => TOKENIZATION
//     // [language] => en
//     // [return_url] => http://localhost:8000/route.php?r=merchantPageReturn
//     // [signature] => 72338e7ab2066d8d0f818212bc6b49a4836133519245a807db27664eed8671e8
//     // const merchantPageData = getMerchantPageData();
//     // const postData = merchantPageData['params'];
//     // const gatewayUrl = merchantPageData['url'];

//     // const signature = calculateSignature(iframeParams, 'request');
//     const signature = calculateSignature(responseParams, 'response')

//     const signature2 =
//         '4e76093b6c6712450355ea9109c3a6c7811649b01f1dfa81b29dc97636223f78'
//     return { signature, signature2 }
//     return JSON.stringify({ form: form, url: gatewayUrl, params: postData })
// }

// function processRequest() {
//     const merchantPageData = getMerchantPageData()
//     const postData = merchantPageData['params']
//     const gatewayUrl = merchantPageData['url']

//     // const form = getPaymentForm(gatewayUrl, postData);
//     return { url: gatewayUrl, params: postData }
//     // return JSON.stringify({'form': form, 'url': gatewayUrl, 'params': postData});
// }

function makeid(length) {
    var result = ''
    var characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for (var i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        )
    }
    return result
}

function getMerchantPageData(
    order_no,
    merchant_ref_v,
    locale = 'en-ae',
    brand_settings
) {
    // const merchantReference = generateMerchantReference()
    // const returnUrl = getUrl('route.php?r=merchantPageReturn');
    // const returnUrl = `${process.env.FRONTEND_URL}/${locale}/order/payment-process`
    const returnUrl = `${brand_settings?.ecommerce_settings?.frontend_url}/api/payment-process`

    const iframeParams = {
        merchant_identifier: process.env.MERCHANT_IDENTIFIER,
        access_code: process.env.ACCESS_CODE,
        merchant_reference: `${order_no}-${merchant_ref_v}`,
        service_command: 'TOKENIZATION',
        language: locale.split('-')[0],
        return_url: returnUrl,
    }

    iframeParams['signature'] = calculateSignature(iframeParams, 'request')
    // iframeParams['returnUrl'] = returnUrl;

    const gatewayUrl = `${process.env.PAYFORT_URL}/FortAPI/paymentPage`
    // const gatewayUrl = `https://sbcheckout.PayFort.com/FortAPI/paymentPage`

    // const debugMsg = 'Fort Merchant Page Request Parameters'
    // console.log(debugMsg)
    // console.log(iframeParams)

    return { url: gatewayUrl, params: iframeParams }
}

function getMerchantPageDataSavedCard(
    order_no,
    merchant_ref_v,
    token_name,
    card_security_code,
    locale = 'en-ae',
    brand_settings
) {
    // const merchantReference = generateMerchantReference()
    // const returnUrl = getUrl('route.php?r=merchantPageReturn');
    const returnUrl = `${brand_settings?.ecommerce_settings?.frontend_url}/api/payment-process`

    // $params['token_name'] = $card['token'];
    // $params['card_security_code'] = $card['cvv'];
    // $params['response_code'] = '99000';
    // $params['response_message'] = 'Local token.';

    const iframeParams = {
        token_name: token_name,
        card_security_code: card_security_code,
        merchant_reference: `${order_no}-${merchant_ref_v}`,
        merchant_identifier: process.env.MERCHANT_IDENTIFIER,
        access_code: process.env.ACCESS_CODE,
        response_code: '99000',
        response_message: 'Local token.',
        language: locale.split('-')[0],
        return_url: returnUrl,
    }

    iframeParams['signature'] = calculateSignature(iframeParams, 'response')
    // iframeParams['returnUrl'] = returnUrl;

    const gatewayUrl = `${process.env.PAYFORT_URL}/FortAPI/paymentPage`
    // const gatewayUrl = `https://sbcheckout.PayFort.com/FortAPI/paymentPage`

    // const debugMsg = 'Fort Merchant Page Request Parameters'
    // console.log(debugMsg)
    // console.log(iframeParams)

    return { url: gatewayUrl, params: iframeParams }
}

function getPaymentForm(gatewayUrl, postData) {
    // return postData;
    let form = `<form style="display:block;background-color: #00ff00; border: 10px;" name="payfort_payment_form" id="payfort_payment_form" method="post" action="${gatewayUrl}">`
    Object.keys(postData).forEach((k) => {
        form += `<input type="hidden" name="${k}" value="${postData[k]}" />`
    })
    form += '<input type="submit" id="submit-payfort" />'
    form += '</form>'
    return form
}

const processMerchantPageResponse = async (
    payfort_obj,
    amount,
    currency,
    customer,
    customer_ip,
    order_id,
    brand_settings
) => {
    const fortParams = payfort_obj

    // const debugMsg = 'Fort Merchant Page Response Parameters \n'.print_r(
    //     fortParams,
    //     1
    // )
    // console.log(payfort_obj)
    let reason = ''
    let response_code = ''
    let success = true
    if (!fortParams) {
        success = false
        reason = 'Invalid Response Parameters'
        // console.log(reason)
        return { success, reason }
    } else {
        //validate payfort response
        // console.log(fortParams)
        // return false;
        let params = fortParams
        let responseSignature = fortParams['signature']
        delete params['r']
        delete params['signature']
        delete params['integration_type']
        delete params['3ds']
        // let merchantReference = params['merchant_reference'];
        // console.log(params)
        let calculatedSignature = calculateSignature(params, 'response')
        let success = true
        let reason = ''

        if (responseSignature != calculatedSignature) {
            success = false
            reason = 'Invalid signature.'
            // debugMsg = sprintf(
            //     'Invalid Signature. Calculated Signature: %1s, Response Signature: %2s',
            //     responseSignature,
            //     calculatedSignature
            // )
            // console.log(reason)
            return { success, order_complete: false, reason }
        } else {
            let response_code = params['response_code']
            const response_message = params['response_message']
            const status = params['status']
            if (response_code.substring(2) != '000') {
                // console.log(response_message)
                reason = response_message
                return { success, order_complete: false, reason }
            } else {
                success = true
                const host2HostParams = await merchantPageNotifyFort(
                    fortParams,
                    amount,
                    currency,
                    customer,
                    customer_ip,
                    order_id,
                    brand_settings
                )

                // console.log('H2H')
                // console.log(host2HostParams)
                // return false
                // debugMsg =
                //     'Fort Merchant Page Host2Hots Response Parameters \n'.print_r(
                //         fortParams,
                //         1
                //     )
                // console.log(debugMsg)
                if (!host2HostParams) {
                    success = false
                    reason = 'Invalid response parameters.'
                    // debugMsg = reason
                    // console.log(reason)
                    return { success, order_complete: false, reason }
                } else {
                    params = host2HostParams
                    responseSignature = host2HostParams['signature']
                    merchantReference = params['merchant_reference']
                    delete params['r']
                    delete params['signature']
                    delete params['integration_type']
                    calculatedSignature = calculateSignature(params, 'response')
                    if (responseSignature != calculatedSignature) {
                        success = false
                        reason = 'Invalid signature.'
                        // debugMsg =
                        //     'Invalid Signature. Calculated Signature: %1s, Response Signature: %2s'
                        // console.log(reason)
                        // console.log(responseSignature, calculatedSignature)
                        return { success, order_complete: false, reason }
                    } else {
                        response_code = params['response_code']
                        if (response_code == '20064' && params['3ds_url']) {
                            success = true
                            // debugMsg = 'Redirect to 3DS URL : '.params[
                            //     '3ds_url'
                            // ]
                            // console.log(debugMsg)
                            // echo "<html><body onLoad=\"javascript: window.top.location.href='" . params['3ds_url'] . "'\"></body></html>";
                            // return `<html><body onLoad="javascript: window.top.location.href='${params['3ds_url']}'"></body></html>`
                            return {
                                success,
                                order_complete: false,
                                '3ds_url': params['3ds_url'],
                                params,
                            }
                            // exit;
                            //header('location:'.params['3ds_url']);
                        } else {
                            if (response_code.substring(2) != '000') {
                                success = false
                                reason = host2HostParams['response_message']
                                // debugMsg = reason
                                // console.log(reason)
                                return {
                                    success,
                                    order_complete: false,
                                    reason,
                                }
                            }
                        }
                    }
                }
            }
        }

        // let return_url = ''
        if (!success) {
            return {
                success,
                order_complete: false,
                reason,
            }
        } else {
            return {
                success,
                order_complete: true,
                merchant_ref: payfort_obj.merchant_reference,
                reason: reason,
                params,
            }
        }
    }
}

const merchantPageNotifyFort = async (
    fortParams,
    amount,
    currency,
    customer,
    customer_ip,
    order_id,
    brand_settings
) => {
    //send host to host
    let gatewayUrl = process.env.PAYFORT_HOST + 'FortAPI/paymentPage'

    let currency_code = currency
    let converted_amount = amount
    if (currency.toUpperCase() != 'AED') {
        converted_amount = await currencyConverter(amount, currency, 'aed')
        currency_code = 'aed'
    }

    // converted_amount = convertFortAmount(amount, currency_code)

    // console.log(customer_ip)
    const postData = {
        merchant_reference: fortParams.merchant_reference,
        access_code: fortParams.access_code,
        command: 'PURCHASE',
        merchant_identifier: fortParams.merchant_identifier,
        customer_ip: customer_ip?.length > 6 ? customer_ip : '197.168.1.1',
        amount: parseFloat(converted_amount) * 100, //TODO: USE PAYFORT DECIMAL CONVERTER
        currency: currency_code.toUpperCase(),
        customer_email: customer.email,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        token_name: fortParams.token_name,
        language: fortParams.language,
        return_url: `${brand_settings?.ecommerce_settings?.frontend_url}/order/payment-process/${fortParams.merchant_reference}`,
    }

    if (fortParams.card_security_code) {
        postData.card_security_code = fortParams.card_security_code
    }

    // if(isset(fortParams['3ds']) && fortParams['3ds'] == 'no') {
    //     postData['check_3ds'] = 'NO';
    // }

    //calculate request signature
    // console.log('done')
    const signature = calculateSignature(postData, 'request')
    postData['signature'] = signature

    // const debugMsg = 'Fort Host2Host Request Parameters'
    // console.log(debugMsg)
    // console.log(signature)

    gatewayUrl = `${process.env.PAYFORT_API_URL}/FortAPI/paymentApi`

    const array_result = await callApi(postData, gatewayUrl, order_id)

    // debugMsg = 'Fort Host2Host Response Parameters \n'
    // log(debugMsg)
    // log(array_result)

    return array_result
}

/**
 * Send host to host request to the Fort
 * @param array postData
 * @param string gatewayUrl
 * @return mixed
 */
const callApi = async (postData, gatewayUrl, order_id) => {
    // console.log(JSON.stringify(postData))

    const response = await axios
        .post(gatewayUrl, JSON.stringify(postData), {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            // 'Content-Type': 'application/x-www-form-urlencoded',
        })
        .then(function (response) {
            // console.log(response.data)
            // console.log('Call Api Sucess : line no: 350')
            return response.data
        })
        .catch(function (error) {
            console.log(error)
            return error
        })

    await TransactionLog.create({
        order_id: order_id,
        type: 'payfort',
        event:
            postData.service_command ||
            postData.command ||
            postData.query_command,
        url: gatewayUrl,
        call_request: postData,
        call_response: response,
    })

    // const response = await fetch(gatewayUrl, {
    //     method: 'POST', // *GET, POST, PUT, DELETE, etc.
    //     // mode: 'cors', // no-cors, *cors, same-origin
    //     cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    //     credentials: 'same-origin', // include, *same-origin, omit
    //     headers: {
    //         'Content-Type': 'application/json;charset=UTF-8',
    //         // 'Content-Type': 'application/x-www-form-urlencoded',
    //     },
    //     redirect: 'follow', // manual, *follow, error
    //     referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    //     body: JSON.stringify(postData), // body data type must match "Content-Type" header
    // })

    // //open connection
    // ch = curl_init();

    // //set the url, number of POST vars, POST data
    // useragent = "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:20.0) Gecko/20100101 Firefox/20.0";
    // curl_setopt(ch, CURLOPT_USERAGENT, useragent);
    // curl_setopt(ch, CURLOPT_HTTPHEADER, array(
    //     'Content-Type: application/json;charset=UTF-8',
    //         //'Accept: application/json, application/*+json',
    //         //'Connection:keep-alive'
    // ));
    // curl_setopt(ch, CURLOPT_URL, gatewayUrl);
    // curl_setopt(ch, CURLOPT_POST, 1);
    // curl_setopt(ch, CURLOPT_FAILONERROR, 1);
    // curl_setopt(ch, CURLOPT_ENCODING, "compress, gzip");
    // curl_setopt(ch, CURLOPT_RETURNTRANSFER, true);
    // curl_setopt(ch, CURLOPT_FOLLOWLOCATION, 1); // allow redirects
    // //curl_setopt(ch, CURLOPT_RETURNTRANSFER, 1); // return into a variable
    // curl_setopt(ch, CURLOPT_CONNECTTIMEOUT, 0); // The number of seconds to wait while trying to connect
    // //curl_setopt(ch, CURLOPT_TIMEOUT, Yii::app()->params['apiCallTimeout']); // timeout in seconds
    // curl_setopt(ch, CURLOPT_POSTFIELDS, json_encode(postData));

    // response = curl_exec(ch);

    // //response_data = array();
    // //parse_str(response, response_data);
    // curl_close(ch);

    // array_result = response.json()

    if (!response) {
        return false
    }
    return response
}

function http_build_query(q) {
    const params = new URLSearchParams(q)
    return params.toString()
}

function convertFortAmount(amount, currencyCode) {
    new_amount = 0
    total = amount
    decimalPoints = getCurrencyDecimalPoints(currencyCode)
    new_amount = Math.round(total, decimalPoints) * Math.pow(10, decimalPoints)
    return new_amount
}

function castAmountFromFort(amount, currencyCode) {
    decimalPoints = getCurrencyDecimalPoints(currencyCode)
    //return amount / (pow(10, decimalPoints));
    new_amount = Math.round(amount, decimalPoints) / Math.pow(10, decimalPoints)
    return new_amount
}

function getCurrencyDecimalPoints(currency) {
    decimalPoint = 2
    arrCurrencies = {
        JOD: 3,
        KWD: 3,
        OMR: 3,
        TND: 3,
        BHD: 3,
        LYD: 3,
        IQD: 3,
    }
    if (arrCurrencies[currency]) {
        decimalPoint = arrCurrencies[currency]
    }
    return decimalPoint
}

function getUrl(path) {
    // scheme = (isset(_SERVER['HTTPS']) && _SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    const url = `${process.env.FRONTEND_URL}/payfort/` + path
    return url
}

function generateMerchantReference() {
    return makeid(6) + Math.floor(Math.random() * 100000)
}

// /**
//  * Log the error on the disk
//  */
// function log(messages) {
//     messages = "========================================================\n\n".messages."\n\n";
//     file = __DIR__.'/trace.log';
//     if (filesize(file) > 907200) {
//         fp = fopen(file, "r+");
//         ftruncate(fp, 0);
//         fclose(fp);
//     }

//     myfile = fopen(file, "a+");
//     fwrite(myfile, messages);
//     fclose(myfile);
// }

function getPaymentOptionName(po) {
    switch (po) {
        case 'creditcard':
            return 'Credit Cards'
        case 'cc_merchantpage':
            return 'Credit Cards (Merchant Page)'
        case 'installments_merchantpage':
            return 'Installments (Merchant Page)'
        case 'installments':
            return 'Installments'
        case 'sadad':
            return 'SADAD'
        case 'naps':
            return 'NAPS'
        default:
            return ''
    }
}

const statusCheck = async (order) => {
    try {
        const gatewayUrl = `${process.env.PAYFORT_API_URL}/FortAPI/paymentApi`

        const postData = {
            query_command: 'CHECK_STATUS',
            access_code: order.payment_response?.access_code,
            merchant_identifier: order.payment_response?.merchant_identifier,
            merchant_reference: order.payment_response?.merchant_reference,
            language: order.payment_response?.language,
        }

        const signature = calculateSignature(postData, 'request')

        postData.signature = signature

        const response = await axios
            .post(gatewayUrl, JSON.stringify(postData), {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                },
                cache: 'no-cache',
                credentials: 'same-origin',
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                // 'Content-Type': 'application/x-www-form-urlencoded',
            })
            .then(function (response) {
                // console.log(response.data)
                // console.log(response)
                return response.data
            })
            .catch(function (error) {
                console.log(error)
                return false
            })
        return response
    } catch (e) {
        console.log(e)
        return false
    }
}

const currencyConverter = async (amount, from, to) => {
    const data = {
        service_command: 'CURRENCY_CONVERSION',
        access_code: process.env.ACCESS_CODE,
        merchant_identifier: process.env.MERCHANT_IDENTIFIER,
        amount: convertFortAmount(amount, from.toUpperCase()),
        currency: from.toUpperCase(),
        language: 'en',
        converted_currency: to.toUpperCase(),
    }
    data.signature = calculateSignature(data, 'request')

    gatewayUrl = `${process.env.PAYFORT_API_URL}/FortAPI/paymentApi`

    const array_result = await callApi(data, gatewayUrl)

    if (!array_result || !array_result.signature) {
        return false
    }
    const responseSignature = array_result.signature
    delete array_result['signature']
    // console.log(array_result)
    // console.log(responseSignature)
    const calculatedSignature = calculateSignature(array_result, 'response')
    // console.log(calculatedSignature)
    if (responseSignature !== calculatedSignature) {
        return 'Signature miss match'
    }
    const response_code = array_result['response_code']
    if (response_code.substring(2) != '000') {
        return false
    }
    if (
        !array_result['converted_amount'] ||
        !array_result['converted_currency']
    ) {
        return false
    }

    const converted_amount = parseFloat(
        castAmountFromFort(
            array_result['converted_amount'],
            array_result['converted_currency']
        )
    )

    return converted_amount
}

const removeSavedToken = async (card) => {
    const gatewayUrl = `${process.env.PAYFORT_API_URL}/FortAPI/paymentApi`

    const postData = {
        service_command: 'UPDATE_TOKEN',
        access_code: process.env.ACCESS_CODE,
        merchant_identifier: process.env.MERCHANT_IDENTIFIER,
        merchant_reference: card.merchant_reference + new Date().getTime(),
        language: 'en',
        token_name: card.token_name,
        token_status: 'INACTIVE',
    }

    const signature = calculateSignature(postData, 'request')

    postData.signature = signature

    // console.log(postData)

    const array_result = await callApi(postData, gatewayUrl)

    // console.log(array_result)

    if (!array_result || !array_result.signature) {
        return false
    }
    const responseSignature = array_result.signature
    delete array_result['signature']
    // console.log(array_result)
    // console.log(responseSignature)
    const calculatedSignature = calculateSignature(array_result, 'response')
    // console.log(calculatedSignature)
    if (responseSignature !== calculatedSignature) {
        return 'Signature miss match'
    }
    const response_code = array_result['response_code']
    if (response_code.substring(2) != '000') {
        return false
    }

    // console.log(array_result)
    return true
}

module.exports = {
    getMerchantPageData,
    getMerchantPageDataSavedCard,
    processMerchantPageResponse,
    statusCheck,
    currencyConverter,
    removeSavedToken,
    // compare,
    // processRequest,
    // testSignature,
}
