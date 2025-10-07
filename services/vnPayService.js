const crypto = require('crypto');
const querystring = require('querystring');
const dayjs = require('dayjs');

function sortObject(obj) {
    const sorted = {};
    Object.keys(obj).sort().forEach(k => {
        const v = obj[k];
        if (v !== '' && v !== null && v !== undefined) sorted[k] = v;
    });
    return sorted;
}

// Encode theo chuẩn VNPAY (space -> '+') - chỉ encode OrderInfo, không encode URL
function encodeParamsForVnp(params) {
    const enc = {};
    for (const k of Object.keys(params)) {
        if (k === 'vnp_OrderInfo') {
            // Chỉ encode OrderInfo
            enc[k] = encodeURIComponent(String(params[k])).replace(/%20/g, '+');
        } else {
            // Giữ nguyên các field khác (đặc biệt là vnp_ReturnUrl)
            enc[k] = String(params[k]);
        }
    }
    return enc;
}

exports.createVNPayUrl = async (orderId, amount, orderInfo) => {
    try {
        const tmnCode = process.env.VNP_TMN_CODE;
        const secretKey = process.env.VNP_HASH_SECRET;
        const vnpUrl = process.env.VNP_URL;
        const returnUrl = process.env.VNP_RETURN_URL;

        console.log('VNPay Config Check:');
        console.log('TMN_CODE:', tmnCode);
        console.log('HASH_SECRET:', secretKey ? '***' : 'MISSING');
        console.log('URL:', vnpUrl);
        console.log('RETURN_URL:', returnUrl);

        if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
            throw new Error('Missing VNPay configuration');
        }

        const createDate = dayjs().format('YYYYMMDDHHmmss');

        // Lưu ý: amount phải là số nguyên * 100, TxnRef nên là chuỗi A-Z0-9
        const vnpParamsRaw = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Amount: Math.round(Number(amount) * 100),
            vnp_CurrCode: 'VND',
            vnp_TxnRef: String(orderId),
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: '127.0.0.1',
            vnp_CreateDate: createDate,
        };

        console.log('VNPay params before sorting:', vnpParamsRaw);

        // 1) Sort parameters
        const sortedRaw = sortObject(vnpParamsRaw);

        // 2) Encode giá trị trước khi ký
        const sortedEnc = encodeParamsForVnp(sortedRaw);

        // 3) Tạo signData bằng querystring.stringify với đúng tham số
        const signData = querystring.stringify(sortedEnc, '&', '=', { encode: false });
        console.log('Sign data (encoded):', signData);

        // 4) Ký HMAC-SHA512
        const secureHash = crypto.createHmac('sha512', secretKey)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');
        
        console.log('Generated signature:', secureHash);

        // 5) Gắn chữ ký và tạo URL cuối cùng
        const finalParams = { ...sortedEnc, vnp_SecureHash: secureHash };
        const finalUrl = `${vnpUrl}?${querystring.stringify(finalParams, '&', '=', { encode: false })}`;
        
        console.log('Final VNPay URL:', finalUrl);
        return finalUrl;
    } catch (error) {
        console.error('VNPay URL creation error:', error);
        throw error;
    }
};

exports.verifyReturnUrl = (vnpParams) => {
    try {
        const secretKey = process.env.VNP_HASH_SECRET;
        const secureHash = vnpParams.vnp_SecureHash;

        // Bỏ các trường hash ra khỏi dữ liệu ký lại
        const { vnp_SecureHash, vnp_SecureHashType, ...rest } = vnpParams;

        console.log('Verifying params:', rest);

        // Sort và tạo signData - KHÔNG encode vì VNPay đã trả về data đã encode
        const sortedRaw = sortObject(rest);
        const signData = querystring.stringify(sortedRaw, '&', '=', { encode: false });
        
        console.log('Sign data for verification:', signData);

        const expected = crypto.createHmac('sha512', secretKey)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        console.log('Expected signature:', expected);
        console.log('Received signature:', secureHash);

        return expected === secureHash;
    } catch (e) {
        console.error('VNPay verify error:', e);
        return false;
    }
};