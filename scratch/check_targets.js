const dbService = require('../src/services/dbService');

async function checkProfiles() {
    try {
        console.log('--- Checking Profile for reo ---');
        const { data, error } = await dbService.supabase
            .from('profiles')
            .select('display_name, telegram_user_id, target_pengeluaran_bulanan, last_alert_month')
            .eq('display_name', 'reo');
        
        if (error) throw error;
        
        if (data.length === 0) {
            console.log('User "reo" not found.');
        } else {
            data.forEach(p => {
                console.log(`User: ${p.display_name}, Phone: ${p.telegram_user_id}, Target: ${p.target_pengeluaran_bulanan}, LastAlert: ${p.last_alert_month}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkProfiles();
