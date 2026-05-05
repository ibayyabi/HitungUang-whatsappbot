const finance = require('./finance');
const profile = require('./profile');
const auth = require('./auth');
const dashboardSummary = require('./dashboardSummary');
const wallets = require('./wallets');

module.exports = {
    ...finance,
    ...profile,
    ...auth,
    ...dashboardSummary,
    ...wallets
};
