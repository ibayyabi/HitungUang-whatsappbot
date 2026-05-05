const PROFILE_FIELDS = [
    'id',
    'telegram_user_id',
    'telegram_chat_id',
    'telegram_username',
    'display_name',
    'status_pekerjaan',
    'target_pengeluaran_bulanan',
    'target_pemasukan_bulanan',
    'last_alert_month',
    'created_at'
];

const PROFILE_INPUT_FIELDS = [
    'telegram_user_id',
    'telegram_chat_id',
    'telegram_username',
    'display_name'
];

module.exports = {
    PROFILE_FIELDS,
    PROFILE_INPUT_FIELDS
};
