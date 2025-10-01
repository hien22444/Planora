const crypto = require('crypto');
const querystring = require('qs');
const dayjs = require('dayjs');

function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
        if (obj[key]) {
            sorted[key] = obj[key];
        }
    }
    return sorted;
}

exports.createVNPayUrl = async (orderId, amount, orderInfo) => {
    try {
        const tmnCode = process.env.VNP_TMN_CODE;
        const secretKey = process.env.VNP_HASH_SECRET;
        const vnpUrl = process.env.VNP_URL;
        const returnUrl = process.env.VNP_RETURN_URL;

        const date = new Date();
        const createDate = dayjs(date).format('YYYYMMDDHHmmss');
        const orderPrefix = dayjs(date).format('HHmmss');

        const currCode = 'VND';
        let vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: currCode,
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: amount * 100, // Convert to smallest currency unit
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: '127.0.0.1', // Should be replaced with actual IP
            vnp_CreateDate: createDate
        };

        vnpParams = sortObject(vnpParams);
        const signData = querystring.stringify(vnpParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');
        vnpParams['vnp_SecureHash'] = signed;

        const finalUrl = vnpUrl + '?' + querystring.stringify(vnpParams, { encode: false });
        return finalUrl;
    } catch (error) {
        console.error('VNPay URL creation error:', error);
        throw error;
    }
};

exports.verifyReturnUrl = (vnpParams) => {
    try {
        const secretKey = process.env.VNP_HASH_SECRET;
        const secureHash = vnpParams['vnp_SecureHash'];

        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        const sortedParams = sortObject(vnpParams);
        const signData = querystring.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

        return secureHash === signed;
    } catch (error) {
        console.error('VNPay return verification error:', error);
        return false;
    }
};