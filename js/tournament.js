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
                ? ['ربع النهائي', 'نصف النهائي']
                : ['دور 16', 'ربع النهائي', 'نصف النهائي'];
        const bracketHeight = Math.max(300, sideMatchCount * 132);
        const labels = {};
        const roundResults = new Map();
        const setLabel = (matchId, slot, value) => {
            if (value) labels[`${matchId}-${slot}`] = value;
        };
        matches.forEach(match => {
            const round = Number(match.round);
            const matchIndex = Number(match.matchIndex);
            if (round < 1 || round > sideRoundCount) return;
            const matchesPerSide = sideMatchCount / (2 ** (round - 1));
            const side = matchIndex < matchesPerSide ? 'R' : 'L';
            const sideIndex = side === 'R' ? matchIndex : matchIndex - matchesPerSide;
            const matchId = `${side}-${round}-${sideIndex}`;
            roundResults.set(`${round}-${matchIndex}`, match);
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
        const finalMatch = matches.find(match => Number(match.round) === sideRoundCount + 1);

        const renderSide = (side, sideNames) => {
            const columns = [];
            for (let round = 0; round < sideRoundCount; round++) {
                const matchCount = Math.max(1, sideMatchCount / (2 ** round));
                const matches = [];
                const rowSpan = 2 ** round;
                for (let index = 0; index < matchCount; index++) {
                    const matchId = `${side}-${round + 1}-${index}`;
                    const first = labels[`${matchId}-0`] || (round === 0 ? sideNames[index * 2] : `الفائز ${index * 2 + 1}`);
                    const second = labels[`${matchId}-1`] || (round === 0 ? sideNames[index * 2 + 1] : `الفائز ${index * 2 + 2}`);
                    const matchesPerSide = sideMatchCount / (2 ** round);
                    const globalMatchIndex = side === 'R' ? index : matchesPerSide + index;
                    const result = roundResults.get(`${round + 1}-${globalMatchIndex}`);
                    const firstStatus = result ? result.winner === first ? 'selected' : 'eliminated' : '';
                    const secondStatus = result ? result.winner === second ? 'selected' : 'eliminated' : '';
                    const state = result ? 'مكتملة' : 'قادمة';
                    const gridRow = index * rowSpan + 1;
                    const cardClass = roundTitles[round] === 'ربع النهائي' && index === 1
                        ? 'bracket-card bracket-lower-quarterfinal'
                        : 'bracket-card';
                    matches.push(`<div class="${cardClass}" style="grid-row:${gridRow} / span ${rowSpan}"><div class="bracket-match-label"><span>مواجهة ${globalMatchIndex + 1}</span><span class="bracket-match-state">${state}</span></div><button class="bracket-team ${firstStatus}" data-match="${matchId}" data-slot="0" title="${this.escapeHtml(first)}" aria-label="${this.escapeHtml(first)}" onclick="advanceWinner(this)">${this.escapeHtml(first)}</button><button class="bracket-team ${secondStatus}" data-match="${matchId}" data-slot="1" title="${this.escapeHtml(second)}" aria-label="${this.escapeHtml(second)}" onclick="advanceWinner(this)">${this.escapeHtml(second)}</button></div>`);
                }
                columns.push(`<div class="bracket-column"><div class="bracket-column-title">${roundTitles[round]}</div>${matches.join('')}</div>`);
                if (round < sideRoundCount - 1) {
                    const nextMatchCount = matchCount / 2;
                    const connectors = Array.from({ length: nextMatchCount }, (_, index) => {
                        const connectorSpan = rowSpan * 2;
                        const gridRow = index * connectorSpan + 1;
                        return `<span class="bracket-connector" style="grid-row:${gridRow} / span ${connectorSpan}" aria-hidden="true"></span>`;
                    }).join('');
                    columns.push(`<div class="bracket-connector-column">${connectors}</div>`);
                }
            }
            const sideTitle = side === 'R' ? 'الجهة اليمنى' : 'الجهة اليسرى';
            const sideClass = side === 'R' ? 'bracket-right' : 'bracket-left';
            return `<div class="bracket-side ${sideClass}" style="--bracket-slots:${sideMatchCount};--bracket-height:${bracketHeight}px"><div class="bracket-side-title">${sideTitle}</div>${columns.join('')}</div>`;
        };
        const finalRight = finalMatch?.right || labels['F-1-0-0'] || 'الفائز من اليمين';
        const finalLeft = finalMatch?.left || labels['F-1-0-1'] || 'الفائز من اليسار';
        const finalRightStatus = finalMatch ? finalMatch.winner === finalRight ? 'selected' : 'eliminated' : '';
        const finalLeftStatus = finalMatch ? finalMatch.winner === finalLeft ? 'selected' : 'eliminated' : '';
        const championLabel = champion || finalMatch?.winner || 'في انتظار البطل';
        const final = `<div class="bracket-center" style="--bracket-height:${bracketHeight}px"><div class="bracket-trophy">🏆</div><div class="bracket-center-title">النهائي</div><div class="bracket-card bracket-final-card"><div class="bracket-match-label"><span>المواجهة الحاسمة</span><span class="bracket-match-state">${finalMatch ? 'مكتملة' : 'قادمة'}</span></div><button class="bracket-team ${finalRightStatus}" data-match="F-1-0" data-slot="0" title="${this.escapeHtml(finalRight)}" aria-label="${this.escapeHtml(finalRight)}" onclick="advanceWinner(this)">${this.escapeHtml(finalRight)}</button><button class="bracket-team ${finalLeftStatus}" data-match="F-1-0" data-slot="1" title="${this.escapeHtml(finalLeft)}" aria-label="${this.escapeHtml(finalLeft)}" onclick="advanceWinner(this)">${this.escapeHtml(finalLeft)}</button></div><div class="bracket-champion"><strong>👑 بطل البطولة</strong><span>${this.escapeHtml(championLabel)}</span></div></div>`;
        return `${renderSide('L', names.slice(names.length / 2))}${final}${renderSide('R', names.slice(0, names.length / 2))}`;
    }
};
