window.SinJeemTournament = {
    escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    },

    buildBracketMarkup(names) {
        const sideMatchCount = names.length / 4;
        const sideRoundCount = Math.log2(sideMatchCount) + 1;
        const roundTitles = names.length === 4
            ? ['نصف النهائي']
            : names.length === 8
                ? ['دور 8', 'نصف النهائي']
                : ['دور 16', 'ربع النهائي', 'نصف النهائي'];
        const renderSide = (side, sideNames) => {
            const columns = [];
            for (let round = 0; round < sideRoundCount; round++) {
                const matchCount = Math.max(1, sideMatchCount / (2 ** round));
                const matches = [];
                for (let index = 0; index < matchCount; index++) {
                    const first = round === 0 ? sideNames[index * 2] : `الفائز ${index * 2 + 1}`;
                    const second = round === 0 ? sideNames[index * 2 + 1] : `الفائز ${index * 2 + 2}`;
                    const matchId = `${side}-${round + 1}-${index}`;
                    matches.push(`<div class="bracket-card"><button class="bracket-team" data-match="${matchId}" data-slot="0" onclick="advanceWinner(this)">${this.escapeHtml(first)}</button><button class="bracket-team" data-match="${matchId}" data-slot="1" onclick="advanceWinner(this)">${this.escapeHtml(second)}</button></div>`);
                }
                columns.push(`<div class="bracket-column"><div class="bracket-column-title">${roundTitles[round]}</div>${matches.join('')}</div>`);
            }
            const sideTitle = side === 'R' ? 'الجهة اليمنى' : 'الجهة اليسرى';
            const sideClass = side === 'R' ? 'bracket-right' : 'bracket-left';
            return `<div class="bracket-side ${sideClass}"><div class="bracket-side-title">${sideTitle}</div>${columns.join('')}</div>`;
        };
        const final = '<div class="bracket-center"><div class="bracket-trophy">🏆</div><div class="bracket-center-title">مباراة النهائي</div><div class="bracket-card bracket-final-card"><button class="bracket-team" data-match="F-1-0" data-slot="0" onclick="advanceWinner(this)">الفائز من اليمين</button><button class="bracket-team" data-match="F-1-0" data-slot="1" onclick="advanceWinner(this)">الفائز من اليسار</button></div><div class="bracket-champion"><strong>👑 بطل البطولة</strong><span>في انتظار البطل</span></div></div>';
        return `${renderSide('L', names.slice(names.length / 2))}${final}${renderSide('R', names.slice(0, names.length / 2))}`;
    }
};
