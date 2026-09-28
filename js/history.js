window.SinJeemHistory = {
    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>\'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[character]));
    },

    roundLabel(round, teamCount) {
        const labels = teamCount >= 16
            ? ['', 'دور 16', 'ربع النهائي', 'نصف النهائي', 'النهائي']
            : teamCount >= 8
                ? ['', 'ربع النهائي', 'نصف النهائي', 'النهائي']
                : ['', 'نصف النهائي', 'النهائي'];
        return labels[Number(round)] || `الجولة ${round}`;
    },

    save(results, teams, title, mode, matches = []) {
        SinJeemStorage.saveMatch({
            title: title || 'لعبة سين وجيم',
            mode: mode || 'normal',
            date: new Date().toLocaleString('ar-SA'),
            teams,
            results,
            matches
        });
    },

    render() {
        const history = SinJeemStorage.readHistory();
        const list = document.getElementById('history-list');
        if (!list) return;
        list.innerHTML = history.length ? history.map(item => {
            const results = Array.isArray(item.results) ? item.results : [];
            const topScore = results.length ? Math.max(...results.map(result => Number(result.score) || 0)) : 0;
            const leaders = results.filter(result => (Number(result.score) || 0) === topScore);
            const teams = (item.teams || []).map(team => this.escapeHtml(team)).join('، ');
            const outcome = leaders.length > 1
                ? `تعادل بين ${leaders.map(result => this.escapeHtml(result.name)).join(' و ')} (${topScore} نقطة)`
                : leaders.length
                    ? `الفائز: ${this.escapeHtml(leaders[0].name)} (${topScore})`
                    : 'لا توجد نتيجة محفوظة';
            const matches = Array.isArray(item.matches) ? item.matches : [];
            const matchDetails = item.mode === 'tournament' && matches.length
                ? `<details class="history-details"><summary>تفاصيل المواجهات (${matches.length})</summary><ol class="history-matches">${matches.map(match => {
                    const score = Number.isFinite(Number(match.rightScore)) && Number.isFinite(Number(match.leftScore))
                        ? ` (${match.rightScore} - ${match.leftScore})`
                        : '';
                    return `<li>${this.roundLabel(match.round, (item.teams || []).length)}: ${this.escapeHtml(match.right)}${score} ضد ${this.escapeHtml(match.left)}، المتأهل: ${this.escapeHtml(match.winner)}</li>`;
                }).join('')}</ol></details>`
                : '';
            return `<div class="history-item"><div class="history-item-main"><strong>${this.escapeHtml(item.title || 'لعبة سين وجيم')}</strong><small>${item.mode === 'tournament' ? 'بطولة' : 'لعبة عادية'} - ${this.escapeHtml(item.date || '')}</small><small>الفرق: ${teams || 'غير محفوظة'}</small>${matchDetails}</div><span class="history-item-outcome ${leaders.length > 1 ? 'history-tie' : 'winner'}">${outcome}</span></div>`;
        }).join('') : '<div class="empty-history">لا توجد مباريات محفوظة حتى الآن.</div>';
    },

    clear() {
        SinJeemStorage.clear();
        this.render();
    }
};
