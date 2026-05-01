const finance = require('./finance');
const profile = require('./profile');
const auth = require('./auth');
const dashboardSummary = require('./dashboardSummary');

module.exports = {
    ...finance,
    ...profile,
    ...auth,
    ...dashboardSummary
};
