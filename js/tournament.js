window.SinJeemTournament = {
    escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    },

    buildBracketMarkup(names, matches = [], champion = '') {
        const sideMatchCount = names.length / 4;
        const sideRoundCount = Math.log2(sideMatchCount) + 1;
        const roundTitles = names.length === 4
            ? ['نصف النهائي']
            : names.length === 8
                ? ['دور 8', 'نصف النهائي']
                : ['دور 16', 'ربع النهائي', 'نصف النهائي'];
        const labels = {};
        const setLabel = (matchId, slot, value) => {
            if (value) labels[`${matchId}-${slot}`] = value;
        };
        matches.forEach(match => {
            const round = Number(match.round);
            const matchIndex = Number(match.matchIndex);
            const matchesPerSide = sideMatchCount / (2 ** (round - 1));
            const side = matchIndex < matchesPerSide ? 'R' : 'L';
            const sideIndex = side === 'R' ? matchIndex : matchIndex - matchesPerSide;
            const matchId = `${side}-${round}-${sideIndex}`;
            setLabel(matchId, 0, match.right);
            setLabel(matchId, 1, match.left);
            if (round <= sideRoundCount) {
                if (round < sideRoundCount) {
                setLabel(`${side}-${round + 1}-${Math.floor(sideIndex / 2)}`, sideIndex % 2, match.winner);
                } else {
                    setLabel('F-1-0', side === 'R' ? 0 : 1, match.winner);
                }
            }
        });

        const renderSide = (side, sideNames) => {
            const columns = [];
            for (let round = 0; round < sideRoundCount; round++) {
                const matchCount = Math.max(1, sideMatchCount / (2 ** round));
                const matches = [];
                for (let index = 0; index < matchCount; index++) {
                    const matchId = `${side}-${round + 1}-${index}`;
                    const first = labels[`${matchId}-0`] || (round === 0 ? sideNames[index * 2] : `الفائز ${index * 2 + 1}`);
                    const second = labels[`${matchId}-1`] || (round === 0 ? sideNames[index * 2 + 1] : `الفائز ${index * 2 + 2}`);
                    matches.push(`<div class="bracket-card"><button class="bracket-team" data-match="${matchId}" data-slot="0" onclick="advanceWinner(this)">${this.escapeHtml(first)}</button><button class="bracket-team" data-match="${matchId}" data-slot="1" onclick="advanceWinner(this)">${this.escapeHtml(second)}</button></div>`);
                }
                columns.push(`<div class="bracket-column"><div class="bracket-column-title">${roundTitles[round]}</div>${matches.join('')}</div>`);
            }
            const sideTitle = side === 'R' ? 'الجهة اليمنى' : 'الجهة اليسرى';
            const sideClass = side === 'R' ? 'bracket-right' : 'bracket-left';
            return `<div class="bracket-side ${sideClass}"><div class="bracket-side-title">${sideTitle}</div>${columns.join('')}</div>`;
        };
        const finalRight = labels['F-1-0-0'] || 'الفائز من اليمين';
        const finalLeft = labels['F-1-0-1'] || 'الفائز من اليسار';
        const championLabel = champion || 'في انتظار البطل';
        const final = `<div class="bracket-center"><div class="bracket-trophy">🏆</div><div class="bracket-center-title">مباراة النهائي</div><div class="bracket-card bracket-final-card"><button class="bracket-team" data-match="F-1-0" data-slot="0" onclick="advanceWinner(this)">${this.escapeHtml(finalRight)}</button><button class="bracket-team" data-match="F-1-0" data-slot="1" onclick="advanceWinner(this)">${this.escapeHtml(finalLeft)}</button></div><div class="bracket-champion"><strong>👑 بطل البطولة</strong><span>${this.escapeHtml(championLabel)}</span></div></div>`;
        return `${renderSide('L', names.slice(names.length / 2))}${final}${renderSide('R', names.slice(0, names.length / 2))}`;
    }
};
