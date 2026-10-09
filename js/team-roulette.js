(() => {
    const draftKey = 'sinJeemTeamRouletteDraft';
    const resultKey = 'sinJeemTeamRouletteResult';
    let currentDraw = null;
    let spinTimer = null;

    function normalize(value) {
        return String(value || '').normalize('NFC').toLocaleLowerCase('ar')
            .replace(/[\u064b-\u065f\u0670]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function cleanMember(line) {
        return String(line || '').replace(/\*+/g, '')
            .replace(/^\s*(?:[-•]|\d+\s*[-.)])\s*/, '')
            .trim();
    }

    function toMention(member) {
        return /^\d{15,20}$/.test(member) ? `<@${member}>` : member;
    }

    const teamLabel = '(?:ال|[اأإ])?سم\\s*الفريق\\s*[:：]';
    const teamLabelTest = new RegExp(teamLabel, 'u');

    function parseSurvey(text) {
        const chunks = text.split(new RegExp(`(?=^\\s*[*\`]{0,3}\\s*${teamLabel})`, 'gmu'))
            .filter(chunk => teamLabelTest.test(chunk));
        return chunks.map((chunk, index) => {
            const nameMatch = chunk.match(new RegExp(`${teamLabel}\\s*([^\\r\\n]+)`, 'u'));
            const name = cleanMember(nameMatch?.[1].replace(/\[[^\]]*\]\([^)]*\)/g, '')) || `فريق ${index + 1}`;
            const body = chunk.slice(nameMatch.index + nameMatch[0].length);
            const numberMatch = /فريق\s*رقم\s*كم\s*بالبطولة\s*[:：]\s*\(?\s*(\d+)/iu.exec(body);
            const memberText = numberMatch ? body.slice(0, numberMatch.index) : body;
            const mentions = memberText.match(/<@[!&]?\d+>/g);
            const members = mentions
                ? [...new Set(mentions)]
                : memberText.replace(/(?:الأعضاء|الاعضاء)\s*[:：]?/g, '').split(/\r?\n/)
                    .map(line => cleanMember(line).replace(/^(?:الكبتن|الكابتن|القائد)\s*[:：]/, ''))
                    .flatMap(line => line.split(/[،,;؛]/))
                    .map(cleanMember)
                    .filter(Boolean)
                    .map(toMention);
            return { name, members, teamNumber: numberMatch ? Number(numberMatch[1]) : null };
        });
    }

    function parseCompactList(text) {
        return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
            const [rawName, ...memberParts] = line.split('|');
            const name = rawName.trim();
            const members = memberParts.join('|').split(/[،,;؛]/).map(cleanMember).filter(Boolean).map(toMention);
            if (!name) throw new Error(`اسم الفريق في السطر ${index + 1} فارغ.`);
            if (!members.length) throw new Error(`أضف أعضاءً لفريق «${name}».`);
            return { name, members, teamNumber: null };
        });
    }

    function readTeams() {
        const teamCount = Number(document.getElementById('roulette-team-count').value);
        if (![4, 8, 16, 32].includes(teamCount)) throw new Error('اختر 4 أو 8 أو 16 أو 32 فريقاً.');
        const text = document.getElementById('roulette-team-list').value;
        const teams = teamLabelTest.test(text) ? parseSurvey(text) : parseCompactList(text);
        if (teams.length !== teamCount) {
            throw new Error(`أدخل ${teamCount} فريقاً بالضبط؛ المدخل حالياً ${teams.length}.`);
        }
        const names = teams.map(team => normalize(team.name));
        if (new Set(names).size !== names.length) throw new Error('أسماء الفرق يجب أن تكون فريدة.');
        const numberedTeams = teams.filter(team => team.teamNumber !== null);
        const numbers = numberedTeams.map(team => team.teamNumber);
        if (numbers.some(number => number < 1 || number > teamCount) || new Set(numbers).size !== numbers.length) {
            throw new Error(`أرقام الفرق يجب أن تكون فريدة ومن 1 إلى ${teamCount}.`);
        }
        teams.sort((left, right) => (left.teamNumber || Number.MAX_SAFE_INTEGER) - (right.teamNumber || Number.MAX_SAFE_INTEGER));
        return teams;
    }

    function randomIndex(max) {
        if (window.crypto?.getRandomValues) {
            const range = 0x100000000;
            const limit = Math.floor(range / max) * max;
            const value = new Uint32Array(1);
            do window.crypto.getRandomValues(value); while (value[0] >= limit);
            return value[0] % max;
        }
        return Math.floor(Math.random() * max);
    }

    function shuffle(items) {
        const result = items.slice();
        for (let index = result.length - 1; index > 0; index--) {
            const swapIndex = randomIndex(index + 1);
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    }

    function buildRounds(order) {
        let advancing = order.map(team => ({ name: team.name, members: team.members, teamNumber: team.teamNumber }));
        const rounds = [];
        let roundNumber = 1;
        if (order.length === 18) {
            const preliminaryTeams = advancing.slice(0, 4);
            const byeTeams = advancing.slice(4);
            const preliminaryMatches = [];
            for (let index = 0; index < preliminaryTeams.length; index += 2) {
                preliminaryMatches.push({
                    number: index / 2 + 1,
                    right: preliminaryTeams[index],
                    left: preliminaryTeams[index + 1]
                });
            }
            rounds.push({ number: roundNumber, label: 'الدور التمهيدي', matches: preliminaryMatches, byes: byeTeams });
            advancing = shuffle([
                ...byeTeams,
                ...preliminaryMatches.map((_, index) => ({ name: `الفائز من التمهيدي ${index + 1}`, members: [] }))
            ]);
            roundNumber++;
        }
        while (advancing.length > 1) {
            const matches = [];
            for (let index = 0; index < advancing.length; index += 2) {
                matches.push({
                    number: index / 2 + 1,
                    right: advancing[index],
                    left: advancing[index + 1]
                });
            }
            rounds.push({ number: roundNumber, matches });
            advancing = matches.map((_, index) => ({ name: `الفائز من المواجهة ${index + 1}`, members: [] }));
            roundNumber++;
        }
        return rounds;
    }

    function createDraw(teams, previousOrder = []) {
        if (![4, 8, 16, 32].includes(teams.length)) throw new Error('الروليت تدعم 4 أو 8 أو 16 أو 32 فريقاً.');
        let order = shuffle(teams);
        const prior = previousOrder.join('|');
        if (order.length > 1 && order.map(team => team.name).join('|') === prior) {
            order = [...order.slice(1), order[0]];
        }
        return { order, rounds: buildRounds(order), createdAt: Date.now() };
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function memberChips(team) {
        return team.members?.length
            ? `<span class="roulette-members">${team.members.map(member => `<code class="roulette-mention">${escapeHtml(member)}</code>`).join('')}</span>`
            : '';
    }

    function roundName(round) {
        if (round.label) return round.label;
        const matchCount = round.matches.length;
        const labels = {
            1: 'النهائي',
            2: 'نصف النهائي',
            4: 'ربع النهائي',
            8: 'دور 16',
            16: 'دور 32'
        };
        return labels[matchCount] || `الدور ${round.number}`;
    }

    function buildDrawText(draw, title) {
        const teamLines = team => [
            `${team.teamNumber ? `(${team.teamNumber}) ` : ''}${team.name}`,
            ...(team.members?.length ? [team.members.join(' ')] : [])
        ];
        const lines = [`**${title} - قرعة المواجهات**`];
        draw.rounds.forEach(round => {
            lines.push('', `**── ${roundName(round)} ──**`);
            round.matches.forEach(match => {
                lines.push('', `**مواجهة ${match.number}**`, ...teamLines(match.right), 'ضد', ...teamLines(match.left));
            });
            if (round.byes?.length) {
                lines.push('', '**إعفاء مباشر**');
                round.byes.forEach(team => lines.push(...teamLines(team), ''));
            }
        });
        return lines.join('\n').trim();
    }

    function getMatchProgress(progress, roundNumber, matchIndex) {
        if (!progress) return null;
        return (progress.matches || []).find(match =>
            Number(match.round) === Number(roundNumber) && Number(match.matchIndex) === matchIndex
        ) || null;
    }

    function getRoundTeams(round, roundIndex, progress, draw) {
        if (roundIndex === 0) return round.matches.flatMap(match => [match.right, match.left]);
        const previousRound = draw.rounds[roundIndex - 1];
        const previousWinners = previousRound.matches.map((_, index) =>
            getMatchProgress(progress, previousRound.number, index)?.winner
        );
        return round.matches.flatMap((match, index) => [
            previousWinners[index * 2] ? { name: previousWinners[index * 2], members: [] } : match.right,
            previousWinners[index * 2 + 1] ? { name: previousWinners[index * 2 + 1], members: [] } : match.left
        ]);
    }

    function renderDraw(draw) {
        const root = document.getElementById('roulette-draw-result');
        const progress = draw.progress;
        const html = draw.rounds.map((round, roundIndex) => {
            const teams = getRoundTeams(round, roundIndex, progress, draw);
            return `
            <section class="roulette-round">
                <h3>${roundName(round)}</h3>
                ${round.matches.map((match, matchIndex) => {
                    const right = teams[matchIndex * 2];
                    const left = teams[matchIndex * 2 + 1];
                    const completed = getMatchProgress(progress, round.number, matchIndex);
                    const isCurrent = !completed && Number(progress?.currentRound) === Number(round.number)
                        && Number(progress?.currentMatchIndex) === matchIndex && !progress?.completed;
                    const state = completed
                        ? `<span class="roulette-match-state complete">انتهت · المتأهل ${escapeHtml(completed.winner)}</span>`
                        : isCurrent
                            ? '<span class="roulette-match-state current">المواجهة الحالية</span>'
                            : '<span class="roulette-match-state">قادمة</span>';
                    const renderTeam = (team, opponent, side) => `<div class="roulette-team"><strong>${escapeHtml(team.name)}</strong><small class="roulette-opponent">خصمه: ${escapeHtml(opponent.name)}</small>${team.teamNumber ? `<small>رقم البطولة: ${team.teamNumber}</small>` : ''}${memberChips(team)}${completed ? `<small class="roulette-team-outcome ${completed.winner === team.name ? 'advanced' : 'eliminated'}">${completed.winner === team.name ? 'تأهل' : 'خرج'}</small>` : ''}</div>`;
                    return `<article class="roulette-match ${isCurrent ? 'is-current' : ''} ${completed ? 'is-complete' : ''}"><div class="roulette-match-topline"><span class="roulette-match-number">${roundName(round)} · مواجهة ${match.number}</span>${state}</div>${renderTeam(right, left, 'right')}<span class="roulette-versus">ضد</span>${renderTeam(left, right, 'left')}</article>`;
                }).join('')}
                ${round.byes?.length ? `<div class="roulette-byes"><h4>إعفاء مباشر إلى دور 16</h4>${round.byes.map(team => `<div class="roulette-team"><strong>${escapeHtml(team.name)}</strong>${team.teamNumber ? `<small>رقم البطولة: ${team.teamNumber}</small>` : ''}${memberChips(team)}</div>`).join('')}</div>` : ''}
            </section>`;
        }).join('');
        const resume = progress && !progress.completed
            ? `<p class="roulette-resume-note">آخر تقدم محفوظ: ${escapeHtml(progress.currentRoundLabel || `الجولة ${progress.currentRound}`)} · المواجهة ${progress.currentMatchIndex + 1}: ${escapeHtml(progress.currentMatch?.right || '')} ضد ${escapeHtml(progress.currentMatch?.left || '')} · ${progress.scores?.t1 || 0}–${progress.scores?.t2 || 0} نقطة. استخدم زر العودة للمباراة أو استأنفها من الصفحة الرئيسية بعد التحديث.</p>`
            : progress?.completed
                ? `<p class="roulette-resume-note">اكتملت البطولة · البطل: ${escapeHtml(progress.champion || '')}</p>`
                : '';
        root.innerHTML = `<div class="roulette-result-heading"><h2>نتيجة القرعة</h2><span>${draw.order.length} فريقاً · ${draw.rounds.length} أدوار</span></div>${resume}<div class="roulette-rounds">${html}</div>`;
        root.hidden = false;
        document.getElementById('roulette-draw-panel').hidden = false;
        document.getElementById('roulette-result-actions').hidden = false;
        const currentMatch = progress && !progress.completed ? progress.currentMatch : null;
        document.getElementById('roulette-wheel-team').textContent = currentMatch?.right && currentMatch?.left
            ? `${currentMatch.right} ضد ${currentMatch.left}`
            : `${draw.order[0].name} ضد ${draw.order[1].name}`;
        updateReturnButton();
        if (!progress) document.getElementById('roulette-draw-status').textContent = 'اكتملت القرعة. راجع المواجهات ثم اعتمدها لبدء البطولة.';
    }

    function getSavedGame() {
        try {
            return JSON.parse(localStorage.getItem('sinJeemActiveGame') || 'null');
        } catch {
            return null;
        }
    }

    function updateReturnButton() {
        const label = getSavedGame()?.activeGame
            ? 'العودة للمباراة الجارية'
            : 'العودة لإعداد البطولة';
        const headerButton = document.getElementById('roulette-back-button');
        const resultButton = document.getElementById('roulette-return-game-button');
        if (headerButton) headerButton.textContent = label;
        if (resultButton) resultButton.textContent = label;
    }

    function returnToGameOrSetup() {
        if (getSavedGame()?.activeGame && typeof window.resumeSavedGame === 'function') {
            window.resumeSavedGame();
            return;
        }
        if (typeof window.switchPage === 'function') window.switchPage('page-tournament-bracket');
    }

    function setStatus(message, type = '') {
        const status = document.getElementById('roulette-draw-status');
        status.textContent = message;
        status.dataset.state = type;
    }

    function invalidateDraw() {
        if (spinTimer) clearInterval(spinTimer);
        spinTimer = null;
        currentDraw = null;
        document.getElementById('roulette-spin-button').disabled = false;
        document.getElementById('roulette-draw-panel').hidden = true;
        document.getElementById('roulette-draw-result').hidden = true;
        document.getElementById('roulette-result-actions').hidden = true;
        document.getElementById('roulette-wheel-team').textContent = 'جاهز للسحب';
        localStorage.removeItem(resultKey);
    }

    function saveDraft() {
        const state = {
            count: document.getElementById('roulette-team-count').value,
            title: document.getElementById('roulette-title').value,
            teams: document.getElementById('roulette-team-list').value
        };
        localStorage.setItem(draftKey, JSON.stringify(state));
    }

    function updateTournamentProgress(progress) {
        try {
            const saved = JSON.parse(localStorage.getItem(resultKey) || 'null');
            if (!saved?.draw?.order?.length || !progress?.pendingTournamentNames?.length) return;
            const drawnNames = new Set(saved.draw.order.map(team => normalize(team.name)));
            if (progress.pendingTournamentNames.some(name => !drawnNames.has(normalize(name)))) return;
            saved.draw.progress = progress;
            localStorage.setItem(resultKey, JSON.stringify(saved));
            updateReturnButton();
            if (document.getElementById('page-team-roulette') && currentDraw) {
                currentDraw.progress = progress;
                renderDraw(currentDraw);
            }
        } catch {
            return;
        }
    }

    function restoreDraft() {
        try {
            const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
            const savedResult = JSON.parse(localStorage.getItem(resultKey) || 'null');
            const supportedCounts = ['4', '8', '16', '32'];
            const unsupportedDraft = saved && !supportedCounts.includes(String(saved.count));
            const unsupportedResult = savedResult?.draw?.order
                && !supportedCounts.includes(String(savedResult.draw.order.length));
            if (saved) {
                document.getElementById('roulette-team-count').value = supportedCounts.includes(String(saved.count))
                    ? saved.count
                    : '16';
                document.getElementById('roulette-title').value = saved.title || '';
                document.getElementById('roulette-team-list').value = saved.teams || '';
            }
            if (savedResult?.draw?.order?.length) {
                currentDraw = savedResult.draw;
                renderDraw(currentDraw);
            }
            if (unsupportedDraft || unsupportedResult) {
                const acceptButton = document.getElementById('roulette-accept-button');
                if (unsupportedResult && acceptButton) acceptButton.disabled = true;
                setStatus('توجد قرعة محفوظة بحجم لم يعد متاحاً للإنشاء. بياناتها محفوظة للعرض والنسخ؛ اختر 4 أو 8 أو 16 أو 32 فريقاً لقرعة جديدة.');
            }
        } catch {
            localStorage.removeItem(draftKey);
            localStorage.removeItem(resultKey);
        }
    }

    function spinRoulette() {
        if (spinTimer) clearInterval(spinTimer);
        currentDraw = null;
        let teams;
        try {
            teams = readTeams();
            saveDraft();
        } catch (error) {
            setStatus(error.message, 'error');
            return;
        }

        const button = document.getElementById('roulette-spin-button');
        const result = document.getElementById('roulette-draw-result');
        const actions = document.getElementById('roulette-result-actions');
        const display = document.getElementById('roulette-wheel-team');
        button.disabled = true;
        document.getElementById('roulette-draw-panel').hidden = true;
        result.hidden = true;
        actions.hidden = true;
        setStatus('تُسحب المواجهات الآن…');
        const previousOrder = currentDraw?.order?.map(team => team.name) || [];
        const nextDraw = createDraw(teams, previousOrder);
        let ticks = 0;
        spinTimer = setInterval(() => {
            display.textContent = teams[randomIndex(teams.length)].name;
            display.classList.toggle('roulette-tick');
            ticks++;
            if (ticks >= 24) {
                clearInterval(spinTimer);
                spinTimer = null;
                display.textContent = `${nextDraw.order[0].name} ضد ${nextDraw.order[1].name}`;
                display.classList.remove('roulette-tick');
                currentDraw = nextDraw;
                renderDraw(currentDraw);
                localStorage.setItem(resultKey, JSON.stringify({ title: document.getElementById('roulette-title').value.trim(), draw: currentDraw }));
                button.disabled = false;
            }
        }, 65);
    }

    function copyWithSelection(text) {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;user-select:text;-webkit-user-select:text';
        document.body.appendChild(field);
        field.focus({ preventScroll: true });
        field.select();
        field.setSelectionRange(0, text.length);
        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch {
            copied = false;
        }
        field.remove();
        return copied;
    }

    function showManualCopy(text) {
        const box = document.getElementById('roulette-copy-fallback') || document.createElement('textarea');
        box.id = 'roulette-copy-fallback';
        box.className = 'roulette-copy-fallback';
        box.readOnly = true;
        box.value = text;
        const actions = document.getElementById('roulette-result-actions');
        if (!box.isConnected) actions.before(box);
        box.hidden = false;
        box.focus();
        box.select();
    }

    async function copyDraw() {
        if (!currentDraw) {
            setStatus('اسحب القرعة أولاً ثم انسخ الجدول.', 'error');
            return;
        }
        const title = document.getElementById('roulette-title').value.trim() || 'قرعة البطولة';
        const text = buildDrawText(currentDraw, title);
        let copied = false;
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch {
            copied = copyWithSelection(text);
        }
        if (copied) {
            document.getElementById('roulette-copy-fallback')?.setAttribute('hidden', '');
            setStatus('نُسخت القرعة إلى الحافظة.');
            return;
        }
        showManualCopy(text);
        setStatus('تعذر النسخ التلقائي. النص محدد في المربع أسفل الجدول، اضغط Ctrl+C لنسخه.', 'error');
    }

    function acceptDraw() {
        if (!currentDraw) return;
        const names = currentDraw.order.map(team => team.name);
        const roster = Object.fromEntries(currentDraw.order.map(team => [team.name, {
            members: team.members,
            teamNumber: team.teamNumber
        }]));
        const title = document.getElementById('roulette-title').value.trim() || 'بطولة سين وجيم';
        if (typeof window.startTournamentFromRoulette !== 'function') {
            setStatus('تعذر فتح البطولة الحالية. أعد تحميل الصفحة وحاول مرة أخرى.', 'error');
            return;
        }
        window.startTournamentFromRoulette(names, title, roster);
    }

    function clearRoulette() {
        if (spinTimer) clearInterval(spinTimer);
        spinTimer = null;
        currentDraw = null;
        localStorage.removeItem(draftKey);
        localStorage.removeItem(resultKey);
        document.getElementById('roulette-team-list').value = '';
        document.getElementById('roulette-title').value = '';
        document.getElementById('roulette-draw-panel').hidden = true;
        document.getElementById('roulette-draw-result').hidden = true;
        document.getElementById('roulette-result-actions').hidden = true;
        document.getElementById('roulette-wheel-team').textContent = 'جاهز للسحب';
        setStatus('مُسحت بيانات تجربة القرعة.');
    }

    function fillDemo() {
        invalidateDraw();
        const count = Number(document.getElementById('roulette-team-count').value);
        document.getElementById('roulette-title').value = 'بطولة تجريبية';
        document.getElementById('roulette-team-list').value = Array.from({ length: count }, (_, index) =>
            `الفريق ${index + 1} | العضو ${index * 2 + 1}، العضو ${index * 2 + 2}`
        ).join('\n');
        saveDraft();
        setStatus(`أُدخلت بيانات تجريبية لـ${count} فرق.`);
    }

    function initialize() {
        const page = document.getElementById('page-team-roulette');
        if (!page) return;
        updateReturnButton();
        restoreDraft();
        const updateDraft = () => {
            invalidateDraw();
            saveDraft();
        };
        document.getElementById('roulette-team-list').addEventListener('input', updateDraft);
        document.getElementById('roulette-title').addEventListener('input', updateDraft);
        document.getElementById('roulette-team-count').addEventListener('change', updateDraft);
        document.getElementById('roulette-spin-button').addEventListener('click', spinRoulette);
        document.getElementById('roulette-demo-button').addEventListener('click', fillDemo);
        document.getElementById('roulette-copy-button').addEventListener('click', copyDraw);
        document.getElementById('roulette-accept-button').addEventListener('click', acceptDraw);
        document.getElementById('roulette-clear-button').addEventListener('click', clearRoulette);
        document.getElementById('roulette-back-button').addEventListener('click', returnToGameOrSetup);
        document.getElementById('roulette-return-game-button').addEventListener('click', returnToGameOrSetup);
    }

    window.SinJeemTeamRoulette = { createDraw, readTeams, updateTournamentProgress, refreshReturnButton: updateReturnButton };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
})();