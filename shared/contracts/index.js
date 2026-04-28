const finance = require('./finance');
const profile = require('./profile');
const auth = require('./auth');

module.exports = {
    ...finance,
    ...profile,
    ...auth
};
