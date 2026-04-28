const AUTH_TOKEN_PURPOSES = [
    'login_web',
    'summary_link'
];

const AUTH_REQUEST_FIELDS = [
    'whatsapp_number',
    'purpose',
    'redirect_to'
];

const AUTH_VERIFY_FIELDS = [
    'token',
    'purpose'
];

function isValidAuthPurpose(value) {
    return AUTH_TOKEN_PURPOSES.includes(String(value || '').trim().toLowerCase());
}

module.exports = {
    AUTH_TOKEN_PURPOSES,
    AUTH_REQUEST_FIELDS,
    AUTH_VERIFY_FIELDS,
    isValidAuthPurpose
};
