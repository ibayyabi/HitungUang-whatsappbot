function getJakartaDate(now = new Date()) {
    const jakartaString = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).format(now);
    
    return new Date(jakartaString);
}

function getJakartaMonthKey(now = new Date()) {
    const d = getJakartaDate(now);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getJakartaMonthRange(now = new Date()) {
    const d = getJakartaDate(now);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    const lastDay = new Date(year, month + 1, 0);
    
    return {
        firstDayIso: `${year}-${String(month+1).padStart(2,'0')}-01T00:00:00.000+07:00`,
        lastDayIso: `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}T23:59:59.999+07:00`
    };
}

module.exports = {
    getJakartaDate,
    getJakartaMonthKey,
    getJakartaMonthRange
};
