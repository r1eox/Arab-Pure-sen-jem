const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const sportsFile = path.join(__dirname, '..', 'data', 'sports-questions.js');
const nbaCompetition = { id: 'Q155223', key: 'nba', label: 'دوري NBA لكرة السلة للرجال', count: 30 };
const basketballTeamNames = new Map([
    ['قلط بسطن', 'بوسطن سيلتكس'],
    ['Boston Celtics', 'بوسطن سيلتكس']
]);
const competitions = [
    { id: 'Q9448', key: 'epl', label: 'الدوري الإنجليزي الممتاز', count: 12 },
    { id: 'Q324867', key: 'laliga', label: 'الدوري الإسباني', count: 12 },
    { id: 'Q82595', key: 'bundesliga', label: 'الدوري الألماني', count: 12 },
    { id: 'Q15804', key: 'serie-a', label: 'الدوري الإيطالي', count: 12 },
    { id: 'Q13394', key: 'ligue-1', label: 'الدوري الفرنسي', count: 12 },
    { id: 'Q255633', key: 'saudi', label: 'الدوري السعودي للمحترفين', count: 15 },
    { id: 'Q18756', key: 'uefa-champions-league', label: 'دوري أبطال أوروبا', count: 15 }
];
const playerCompetitions = [...competitions.map(item => item.id), 'Q18543'];
const iconicFootballers = new Set([
    'Q615', 'Q11571', 'Q142794', 'Q1354960', 'Q1912', 'Q209942', 'Q21621995',
    'Q483837', 'Q46896', 'Q439722', 'Q17515', 'Q10520', 'Q529207', 'Q17163',
    'Q20110', 'Q26517', 'Q39444', 'Q68060', 'Q357984', 'Q43913', 'Q214204',
    'Q129027', 'Q48892', 'Q151269', 'Q357984', 'Q187125', 'Q115453', 'Q8338725'
]);
const footballPattern = /football|soccer|association football|كرة\s*القدم|كورة\s*القدم/i;
const userAgent = 'SinJeemFootballQuestions/1.0 (verified league seasons and player careers)';
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function normalize(value) {
    return String(value || '').normalize('NFKD').toLocaleLowerCase('ar')
        .replace(/[\u064b-\u065f\u0670\u0300-\u036f]/g, '')
        .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function idFromUrl(value) {
    return String(value || '').split('/').pop();
}

async function fetchQuery(query, attempt = 0) {
    try {
        const response = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
            headers: { Accept: 'application/sparql-results+json', 'User-Agent': userAgent },
            signal: AbortSignal.timeout(60000)
        });
        if (response.status === 429 || response.status >= 500) {
            throw Object.assign(new Error(`Wikidata HTTP ${response.status}`), {
                retryDelay: Math.max(Number(response.headers.get('retry-after')) * 1000 || 0, 12000 * (attempt + 1))
            });
        }
        if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}`);
        return (await response.json()).results.bindings;
    } catch (error) {
        if (attempt >= 4) throw error;
        await pause(error.retryDelay || 5000 * (attempt + 1));
        return fetchQuery(query, attempt + 1);
    }
}

function value(binding, key) {
    return binding[key]?.value || '';
}

function seasonYears(label) {
    const match = String(label).match(/(\d{4})\s*[–-]\s*(\d{2,4})/);
    if (match) return `${match[1]}–${match[2].length === 2 ? match[2] : match[2].slice(-2)}`;
    return String(label).match(/\b(\d{4})\b/)?.[1] || '';
}

function seededIndex(seed, limit) {
    let hash = 0;
    for (const character of String(seed)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return limit ? hash % limit : 0;
}

function stableHash(value) {
    let hash = 0;
    for (const character of String(value)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return hash;
}

function assignTiers(rows) {
    rows.forEach((row, index) => {
        const tier = Math.min(4, Math.floor(index * 5 / rows.length));
        row.points = (tier + 1) * 100;
        row.difficulty = ['سهل', 'سهل', 'متوسط', 'صعب', 'صعب'][tier];
    });
}

function orderChampionQuestionsByFamiliarity(rows) {
    const winsByTeam = new Map();
    for (const row of rows) winsByTeam.set(row.answer, (winsByTeam.get(row.answer) || 0) + 1);
    return rows.sort((left, right) => {
        const leftYear = Number(left.question.match(/\b(\d{4})/)?.[1]) || 0;
        const rightYear = Number(right.question.match(/\b(\d{4})/)?.[1]) || 0;
        const recencyDifference = rightYear - leftYear;
        if (recencyDifference) return recencyDifference;
        const winDifference = (winsByTeam.get(right.answer) || 0) - (winsByTeam.get(left.answer) || 0);
        return winDifference || stableHash(left.id) - stableHash(right.id);
    });
}

function orderCareersByFamiliarity(rows) {
    return rows.sort((left, right) => right.sitelinks - left.sitelinks
        || left.careerClubs.length - right.careerClubs.length
        || left.answer.localeCompare(right.answer));
}

function optionsFor(answer, distractors, seed) {
    const cleanAnswer = String(answer).trim();
    const normalizedAnswer = normalize(cleanAnswer);
    const candidates = [...new Set(distractors.map(String).filter(item => normalize(item) !== normalizedAnswer))];
    const start = seededIndex(seed, candidates.length);
    const selected = [];
    for (let offset = 0; offset < candidates.length && selected.length < 3; offset++) {
        const candidate = candidates[(start + offset) % candidates.length];
        if (!selected.some(item => normalize(item) === normalize(candidate))) selected.push(candidate);
    }
    if (selected.length !== 3) throw new Error(`${seed}: need three football distractors`);
    const answers = [cleanAnswer, ...selected];
    const shift = seededIndex(`${seed}-order`, answers.length);
    return answers.map((_, index) => answers[(index + shift) % answers.length]);
}

async function fetchChampions() {
    const leagueIds = competitions.map(item => `wd:${item.id}`).join(' ');
    const query = `SELECT ?competition ?season ?seasonLabel ?winnerLabel ?date WHERE {
      VALUES ?competition { ${leagueIds} }
      ?season wdt:P3450 ?competition; wdt:P1346 ?winner.
      OPTIONAL { ?season wdt:P585 ?date. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ar,en". }
    } ORDER BY DESC(?date) LIMIT 1800`;
    const bindings = await fetchQuery(query);
    const pools = new Map(competitions.map(item => [item.id, []]));
    const seen = new Set();
    for (const row of bindings) {
        const competitionId = idFromUrl(value(row, 'competition'));
        const seasonId = idFromUrl(value(row, 'season'));
        const seasonLabel = value(row, 'seasonLabel');
        const winner = value(row, 'winnerLabel');
        const info = competitions.find(item => item.id === competitionId);
        const years = seasonYears(seasonLabel);
        if (!info || !seasonId || !winner || !years || seen.has(seasonId)) continue;
        if (info.key === 'uefa-champions-league' && Number(years.slice(0, 4)) < 1992) continue;
        if (info.key === 'saudi' && Number(years.slice(0, 4)) < 1976) continue;
        seen.add(seasonId);
        pools.get(competitionId).push({ info, seasonId, years, winner });
    }
    const questions = [];
    for (const info of competitions) {
        const selected = pools.get(info.id)
            .sort((left, right) => right.years.localeCompare(left.years))
            .slice(0, info.count);
        if (selected.length < info.count) throw new Error(`${info.label}: expected ${info.count} champion records, found ${selected.length}`);
        for (const item of selected) {
            questions.push({
                id: `sports-football-champion-${info.key}-${item.seasonId}`,
                category: 'كورة ورياضة',
                difficulty: '',
                points: 0,
                question: `من بطل ${info.label} في موسم ${item.years}؟`,
                answer: item.winner,
                imageAlt: info.label,
                image: '',
                imageSource: '',
                imageKind: '',
                hint: `الموسم المقصود هو ${item.years} في ${info.label}.`,
                source: `https://www.wikidata.org/wiki/${item.seasonId}`,
                factType: 'football-champion',
                footballCompetition: info.key
            });
        }
    }
    return { questions, winners: [...new Set(questions.map(item => item.answer))] };
}

async function fetchBasketballChampions() {
    const query = `SELECT ?season ?seasonLabel ?winnerLabel WHERE {
      ?season wdt:P3450 wd:${nbaCompetition.id}; wdt:P1346 ?winner.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ar,en". }
    } LIMIT 500`;
    const bindings = await fetchQuery(query);
    const seen = new Set();
    const seasons = [];
    for (const row of bindings) {
        const seasonId = idFromUrl(value(row, 'season'));
        const years = seasonYears(value(row, 'seasonLabel'));
        const winner = value(row, 'winnerLabel');
        if (!seasonId || !years || !winner || Number(years.slice(0, 4)) < 1990 || seen.has(seasonId)) continue;
        seen.add(seasonId);
        seasons.push({ seasonId, years, winner });
    }
    const winnerFrequency = new Map();
    for (const season of seasons) winnerFrequency.set(season.winner, (winnerFrequency.get(season.winner) || 0) + 1);
    seasons.sort((left, right) => right.years.localeCompare(left.years)
        || (winnerFrequency.get(right.winner) || 0) - (winnerFrequency.get(left.winner) || 0));
    if (seasons.length < nbaCompetition.count) {
        throw new Error(`NBA: expected ${nbaCompetition.count} men's champions since 1990, found ${seasons.length}`);
    }
    return seasons.slice(0, nbaCompetition.count).map(item => ({
        id: `sports-basketball-champion-${item.seasonId}`,
        category: 'كورة ورياضة',
        difficulty: '',
        points: 0,
        question: `من بطل دوري NBA لكرة السلة للرجال في موسم ${item.years}؟`,
        answer: basketballTeamNames.get(item.winner) || item.winner,
        imageAlt: 'دوري كرة السلة الأمريكي NBA للرجال',
        image: '',
        imageSource: '',
        imageKind: '',
        hint: `الموسم المقصود هو ${item.years} من دوري NBA للرجال.`,
        source: `https://www.wikidata.org/wiki/${item.seasonId}`,
        factType: 'basketball-champion',
        competition: 'nba'
    }));
}

async function fetchPlayerCareers() {
    const leagues = playerCompetitions.map(id => `wd:${id}`).join(' ');
    const query = `SELECT ?player ?playerLabel ?team ?teamLabel ?league ?leagueLabel ?start ?sitelinks WHERE {
    ?player wdt:P106 wd:Q937857; wdt:P21 wd:Q6581097; wikibase:sitelinks ?sitelinks; p:P54 ?statement.
      ?statement ps:P54 ?team; pq:P580 ?start.
      ?team wdt:P118 ?league.
      VALUES ?league { ${leagues} }
      FILTER(?sitelinks > 25)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ar,en". }
    } ORDER BY DESC(?sitelinks) ?player ?start LIMIT 4000`;
    const bindings = await fetchQuery(query);
    const careers = new Map();
    for (const row of bindings) {
        const id = idFromUrl(value(row, 'player'));
        const player = value(row, 'playerLabel');
        const teamId = idFromUrl(value(row, 'team'));
        const team = value(row, 'teamLabel');
        const start = value(row, 'start');
        if (!id || !player || !teamId || !team || !start || /^[PQ]\d+$/.test(player)) continue;
        const teams = careers.get(id) || { id, player, teams: [], sitelinks: Number(value(row, 'sitelinks')) || 0 };
        const leagueId = idFromUrl(value(row, 'league'));
        if (!teams.teams.some(item => item.id === teamId)) teams.teams.push({ id: teamId, name: team, leagueId, start });
        careers.set(id, teams);
    }
    const sorted = [...careers.values()]
        .map(career => ({ ...career, teams: career.teams.sort((a, b) => a.start.localeCompare(b.start)) }))
        .filter(career => career.teams.length >= 3)
        .sort((a, b) => b.sitelinks - a.sitelinks || a.player.localeCompare(b.player));
    const selected = [];
    const seenSequences = new Set();
    function addCareer(career, prioritizeSaudi = false) {
        let teams = career.teams.slice(0, 4);
        const saudiTeam = career.teams.find(team => team.leagueId === 'Q255633');
        if (prioritizeSaudi && saudiTeam && !teams.some(team => team.id === saudiTeam.id)) {
            const beforeSaudi = career.teams.filter(team => team.start < saudiTeam.start).slice(-2);
            const afterSaudi = career.teams.filter(team => team.start > saudiTeam.start).slice(0, 1);
            teams = [...beforeSaudi, saudiTeam, ...afterSaudi].slice(-4);
        }
        const sequence = teams.map(team => normalize(team.name)).join('|');
        if (seenSequences.has(sequence)) return false;
        seenSequences.add(sequence);
        selected.push({ ...career, teams });
        return true;
    }
    const SaudiCareerTarget = 10;
    for (const career of sorted.filter(item => item.teams.some(team => team.leagueId === 'Q255633'))) {
        if (selected.filter(item => item.teams.some(team => team.leagueId === 'Q255633')).length >= SaudiCareerTarget) break;
        addCareer(career, true);
    }
    for (const career of sorted) {
        if (selected.length >= 77) break;
        addCareer(career);
    }
    if (selected.length < 77) throw new Error(`Need 77 football careers; found ${selected.length}`);
    return selected.map((career, index) => ({
        id: `sports-football-career-${career.id}`,
        category: 'كورة ورياضة',
        difficulty: '',
        points: 0,
        question: `اختر الإجابة الصحيحة من الخيارات: من اللاعب الذي مثّل هذه الأندية بالترتيب: ${career.teams.map(team => team.name).join(' ← ')}؟`,
        answer: career.player,
        imageAlt: career.player,
        image: '',
        imageSource: '',
        imageKind: '',
        hint: `كل الأندية المذكورة من دوريات كبرى أو دوري المحترفين السعودي. ابدأ بأول محطة في المسيرة.`,
        source: `https://www.wikidata.org/wiki/${career.id}`,
        factType: 'football-career',
        careerClubs: career.teams.map(team => team.name),
        saudiCareerClubs: career.teams.filter(team => team.leagueId === 'Q255633').map(team => team.name),
        sitelinks: career.sitelinks,
        index
    }));
}

function main() {
    require(sportsFile);
    const previous = window.sportsQuestionSeed;
    const legacyFootball = previous.filter(row => row.id.startsWith('sports-legacy-')).map(row => {
        if (row.id === 'sports-legacy-real-madrid') {
            return { ...row, points: 200, difficulty: 'سهل' };
        }
        return row;
    });
    return Promise.all([fetchChampions(), fetchPlayerCareers(), fetchBasketballChampions()])
        .then(([champions, careers, basketballChampions]) => {
        const championQuestions = orderChampionQuestionsByFamiliarity(champions.questions);
        careers.sort((left, right) => Number(iconicFootballers.has(right.id)) - Number(iconicFootballers.has(left.id))
            || right.sitelinks - left.sitelinks
            || left.careerClubs.length - right.careerClubs.length
            || left.answer.localeCompare(right.answer));
        orderChampionQuestionsByFamiliarity(basketballChampions);
        assignTiers(championQuestions);
        assignTiers(careers);
        assignTiers(basketballChampions);
        const allFootball = [...championQuestions, ...careers];
        const all = [...legacyFootball, ...allFootball, ...basketballChampions];
        if (all.length !== 200) throw new Error(`Expected 200 sports questions, got ${all.length}`);
        const footballWinners = [...new Set(championQuestions.map(item => item.answer))];
        const playerNames = [...new Set(careers.map(item => item.answer))];
        const basketballWinners = [...new Set(basketballChampions.map(item => item.answer))];
        for (const row of allFootball) {
            const distractors = row.factType === 'football-career' ? playerNames : footballWinners;
            row.options = optionsFor(row.answer, distractors, row.id);
            row.acceptedAnswers = [row.answer];
            delete row.sitelinks;
            delete row.index;
        }
        for (const row of basketballChampions) {
            row.options = optionsFor(row.answer, basketballWinners, row.id);
            row.acceptedAnswers = [row.answer];
        }
        const output = `window.sportsQuestionSeed = ${JSON.stringify(all, null, 4)};\n`;
        return fs.writeFile(sportsFile, output, 'utf8').then(() => {
            console.log(JSON.stringify({
                total: all.length,
                footballQuestions: legacyFootball.length + allFootball.length,
                competitionChampions: champions.questions.length,
                footballCareerQuestions: careers.length,
                saudiPlayerCareers: careers.filter(item => item.saudiCareerClubs.length).length,
                basketballQuestions: basketballChampions.length,
                otherSports: 0,
                competitions: { ...Object.fromEntries(competitions.map(item => [item.label, item.count])), [nbaCompetition.label]: basketballChampions.length }
            }, null, 2));
        });
    });
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});