require('dotenv').config()
const axios = require('axios')
const { getCache, setCache, removeCache } = require('../helper/Redis.helper')
const TransactionLog = require('../model/TransactionLog')
const { fileLogger } = require('../helper/Operations.helper')

const url = process.env.PAM_URL
const headerConfig = {
    headers: {
        'affiliate-key': process.env.PAM_KEY,
    },
}

const getParent = async (user) => {
    const bodyParams = {
        mobile: user.mobile,
    }

    const parentData = await axios
        .post(`${url}/parent`, bodyParams, headerConfig)
        .then((res) => {
            return res.data
        })
        .catch((err) => {
            // TODO:: Send slack notification for semnox buy new card fail
            fileLogger(
                `PAM getParent Helper error : ${err}`,
                'pam-getParent',
                'pam-transaction',
                'error'
            )
            return err
        })

    return parentData
}

const getPamMemberships = async () => {
    const parentData = await axios
        .get(`${url}/memberships`, headerConfig)
        .then((res) => {
            return res.data
        })
        .catch((err) => {
            // TODO:: Send slack notification for PAM api call fail
            // console.log(err)
            fileLogger(
                `PAM getPamMemberships Helper error : ${err}`,
                'pam-getPamMemberships',
                'pam-transaction',
                'error'
            )
            return false
        })

    return parentData
}

const renewMembership = async (user, order) => {
    // console.log('PAM 2:', order)
    try {
        order.items.forEach(async (item) => {
            if (item.pam && item.pam.membership_no) {
                // console.log('HAS PAM PRODUCT')
                const pamData = {
                    child_id: item.pam.child_id,
                    invoice_no: order.semnox_transaction_id,
                    bar_code: item.card.card_number,
                    membership_id: item.pam.pam_id,
                    child_membership_rel_id: item.pam.membership_no,
                    zone_id:
                        user.selected_brand?.settings?.pam_settings?.zone_id,
                }

                // console.log('PAM DATA:')
                // console.log(pamData)
                const orderData = await axios
                    .post(`${url}/renew-membership`, pamData, headerConfig)
                    .then((res) => {
                        return res.data
                    })
                    .catch((err) => {
                        // TODO:: Send slack notification for semnox buy new card fail
                        // console.log(err)
                        fileLogger(
                            `PAM renewMembership Helper error : ${err}`,
                            'pam-renewMembership',
                            'pam-transaction',
                            'error'
                        )
                        return err
                    })

                await TransactionLog.create({
                    type: 'pam',
                    event: 'RENEW-MEMBERSHIP',
                    url: url,
                    call_request: pamData,
                    call_response: orderData,
                })
            }
        })

        removeCache([`pam-parent-${user.id}`])

        return true
    } catch (err) {
        console.log(err)
        return false
    }
}

module.exports = {
    getParent,
    getPamMemberships,
    renewMembership,
}
