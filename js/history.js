window.SinJeemHistory = {
    save(results, teams, title, mode) {
        SinJeemStorage.saveMatch({
            title: title || 'لعبة سين وجيم',
            mode: mode || 'normal',
            date: new Date().toLocaleString('ar-SA'),
            teams,
            results
        });
    },

    render() {
        const history = SinJeemStorage.readHistory();
        const list = document.getElementById('history-list');
        if (!list) return;
        list.innerHTML = history.length ? history.map(item => {
            const winner = item.results[0];
            const teams = (item.teams || []).join('، ');
            return `<div class="history-item"><div><strong>${item.title}</strong><small>${item.mode === 'tournament' ? 'بطولة' : 'لعبة عادية'} - ${item.date}</small><small>الفرق: ${teams || 'غير محفوظة'}</small></div><span class="winner">الفائز: ${winner.name} (${winner.score})</span></div>`;
        }).join('') : '<div class="empty-history">لا توجد مباريات محفوظة حتى الآن.</div>';
    },

    clear() {
        SinJeemStorage.clear();
        this.render();
    }
};
