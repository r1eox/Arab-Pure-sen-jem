const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const dataDirectory = path.join(__dirname, '..', 'data');
const gamesFile = path.join(dataDirectory, 'games-questions.js');
const proverbFile = path.join(dataDirectory, 'proverbs-questions.js');
const targetCount = 400;
const gameBatchSize = 35;
const userAgent = 'Mozilla/5.0 (compatible; SinJeemQuiz/1.0; static question expansion)';

const gameFacts = [
    { kind: 'developer', property: 'P178', question: title => `من طوّر لعبة «${title}»؟` },
    { kind: 'publisher', property: 'P123', question: title => `أي شركة نشرت لعبة «${title}»؟` },
    { kind: 'genre', property: 'P136', question: title => `ما أحد تصنيفات لعبة «${title}»؟` },
    { kind: 'platform', property: 'P400', question: title => `على أي منصة صدرت لعبة «${title}»؟` },
    { kind: 'year', property: 'P577', question: title => `في أي سنة صدرت لعبة «${title}»؟` },
    { kind: 'series', property: 'P179', question: title => `إلى أي سلسلة ألعاب تنتمي «${title}»؟` }
];

function pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function normalize(value) {
    return String(value || '').normalize('NFC').toLocaleLowerCase('ar')
        .replace(/[؟?!.,،:;"'`…]/g, '')
        .replace(/\.{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function queryWikidata(query, attempts = 4) {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/sparql-results+json', 'User-Agent': userAgent },
                signal: AbortSignal.timeout(90000)
            });
            if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
            if (attempt + 1 < attempts) await pause(2500 * (attempt + 1));
        }
    }
    throw lastError;
}

function questionBankRows() {
    require(gamesFile);
    return window.gamesQuestionSeed;
}

async function fetchGameIds(excludedIds, requiredCandidates) {
    const ids = [];
    const seen = new Set(excludedIds);
    const candidateTarget = Math.max(requiredCandidates * 8, requiredCandidates + 20);
    const pageSize = 100;
    for (let offset = 0; ids.length < candidateTarget && offset < 5000; offset += pageSize) {
        const query = `SELECT ?item WHERE { ?item wdt:P31 wd:Q7889. } LIMIT ${pageSize} OFFSET ${offset}`;
        const rows = (await queryWikidata(query)).results.bindings;
        if (!rows.length) break;
        for (const row of rows) {
            const id = row.item.value.split('/').pop();
            if (seen.has(id)) continue;
            seen.add(id);
            ids.push(id);
        }
        await pause(1200);
    }
    return ids;
}

async function fetchEntities(ids, props = 'labels|claims') {
    const entities = new Map();
    for (let offset = 0; offset < ids.length; offset += gameBatchSize) {
        const batch = ids.slice(offset, offset + gameBatchSize);
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: batch.join('|'),
            props,
            languages: 'ar|en',
            format: 'json'
        });
        let result;
        let lastError;
        for (let attempt = 0; attempt < 6; attempt++) {
            const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
                headers: { 'Api-User-Agent': userAgent, Accept: 'application/json' },
                signal: AbortSignal.timeout(60000)
            });
            if (response.ok) {
                result = await response.json();
                lastError = null;
                break;
            }
            lastError = new Error(`Wikidata entity API failed: HTTP ${response.status}`);
            const retryAfter = Number(response.headers.get('retry-after')) || 15;
            if (attempt < 5) await pause(Math.max(retryAfter * 1000, 5000 * (attempt + 1)));
        }
        if (lastError) throw lastError;
        for (const [id, entity] of Object.entries(result.entities || {})) entities.set(id, entity);
        await pause(2500);
    }
    return entities;
}

function entityLabel(entity) {
    return entity?.labels?.ar?.value || entity?.labels?.en?.value || '';
}

function isPlausibleGameTitle(title) {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (title.length < 2 || title.length > 100 || /^Q\d+$/.test(title)) return false;
    if (!/[\p{L}]/u.test(title)) return false;
    if (words.length >= 4 && new Set(words.map(normalize)).size / words.length < 0.5) return false;
    return true;
}

function claimValues(entity, property) {
    return (entity?.claims?.[property] || []).map(claim => claim.mainsnak?.datavalue?.value).filter(Boolean);
}

function externalEntityIds(entities) {
    const ids = new Set();
    for (const entity of entities.values()) {
        for (const fact of gameFacts) {
            if (fact.kind === 'year') continue;
            for (const value of claimValues(entity, fact.property)) {
                if (value?.id) ids.add(value.id);
            }
        }
    }
    return [...ids];
}

function factsForEntity(entity, labels) {
    const facts = {};
    for (const fact of gameFacts) {
        const values = claimValues(entity, fact.property);
        for (const value of values) {
            let label = '';
            if (fact.kind === 'year') {
                const match = String(value.time || '').match(/[+-]?(\d{4})/);
                label = match?.[1] || '';
            } else if (value?.id) {
                label = entityLabel(labels.get(value.id));
            }
            if (label && !/^Q\d+$/.test(label)) {
                facts[fact.kind] = label;
                break;
            }
        }
    }
    return facts;
}

function gameDifficulty(index, count) {
    const tier = Math.min(4, Math.floor(index * 5 / count));
    return { points: (tier + 1) * 100, difficulty: ['سهل', 'سهل', 'متوسط', 'صعب', 'صعب'][tier] };
}

function makeGameQuestion(id, title, fact, answer, index, count) {
    const level = gameDifficulty(index, count);
    return {
        id: `games-wd-${id}`,
        category: 'ألعاب',
        ...level,
        question: fact.question(title),
        answer,
        image: '',
        imageAlt: title,
        imageKind: '',
        imageSource: '',
        hint: '',
        source: `https://www.wikidata.org/wiki/${id}`,
        factType: fact.kind
    };
}

async function expandGames() {
    const sourceRows = questionBankRows();
    const oldRows = sourceRows.filter(row =>
        !row.id.startsWith('games-wd-') || isPlausibleGameTitle(row.imageAlt || row.question));
    if (oldRows.length >= targetCount) return oldRows;
    const needed = targetCount - oldRows.length;
    const existingGameIds = new Set(oldRows
        .map(row => row.id.match(/^games-wd-(Q\d+)$/)?.[1])
        .filter(Boolean));
    const ids = await fetchGameIds(existingGameIds, needed);
    const entities = await fetchEntities(ids);
    const valueIds = externalEntityIds(entities);
    const valueLabels = await fetchEntities(valueIds, 'labels');
    const existingQuestions = new Set(oldRows.map(row => normalize(row.question)));
    const additions = [];
    const usageByKind = new Map();

    for (const id of ids) {
        const entity = entities.get(id);
        const title = entityLabel(entity);
        const facts = factsForEntity(entity, valueLabels);
        if (!isPlausibleGameTitle(title) || !facts) continue;
        const available = gameFacts.filter(fact => facts[fact.kind] && normalize(facts[fact.kind]) !== normalize(title));
        if (!available.length) continue;
        const kind = available.reduce((best, candidate) =>
            (usageByKind.get(candidate.kind) || 0) < (usageByKind.get(best.kind) || 0) ? candidate : best,
        available[0]);
        const question = kind.question(title);
        const normalizedQuestion = normalize(question);
        if (existingQuestions.has(normalizedQuestion)) continue;
        existingQuestions.add(normalizedQuestion);
        const answer = facts[kind.kind];
        additions.push(makeGameQuestion(id, title, kind, answer, additions.length, needed));
        usageByKind.set(kind.kind, (usageByKind.get(kind.kind) || 0) + 1);
        if (additions.length === needed) break;
    }

    if (additions.length !== needed) {
        throw new Error(`Games: need ${needed} new unique questions, found ${additions.length}`);
    }
    const allRows = [...oldRows, ...additions];
    await fs.writeFile(gamesFile, `window.gamesQuestionSeed = ${JSON.stringify(allRows, null, 4)};\n`, 'utf8');
    console.log(`Games: ${allRows.length} total; added ${additions.length}; fact types ${JSON.stringify(Object.fromEntries(usageByKind))}`);
    return allRows;
}

function cleanWikiquoteLine(line) {
    return line
        .replace(/^\s*\*+\s*/, '')
        .replace(/\[\[([^]|]+)\|([^]]+)\]\]/g, '$2')
        .replace(/\[\[([^]]+)\]\]/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/'{2,}/g, '')
        .replace(/\s*\([^()]{1,90}\)\s*$/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^[\s"'“”«»]+|[\s"'“”«»]+$/g, '')
        .replace(/[.!؟،؛:]+$/g, '')
        .trim();
}

function splitProverb(text) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 4) return null;
    const answerLength = words.length <= 5 ? 2 : words.length <= 8 ? 3 : 4;
    const splitAt = words.length - answerLength;
    if (splitAt < 2) return null;
    return {
        question: `أكمل المثل: ${words.slice(0, splitAt).join(' ')} ...؟`,
        answer: words.slice(splitAt).join(' ')
    };
}

async function expandProverbs() {
    require(path.join(dataDirectory, 'question-bank.js'));
    const existingSeed = window.questionBankSeed.filter(row => row.category === 'اكمل المثل');
    const existingCount = existingSeed.length;
    const needed = targetCount - existingCount;
    const rawUrl = 'https://ar.wikiquote.org/w/index.php?title=%D8%A3%D9%85%D8%AB%D8%A7%D9%84_%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9&action=raw';
    const response = await fetch(rawUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) throw new Error(`Arabic proverb source failed: HTTP ${response.status}`);
    const raw = await response.text();
    const normalizedExisting = new Set(existingSeed.map(row => normalize(`${row.question.replace(/(?:\.\.\.|…|\.\s*\?*|\?+)\s*$/, '')} ${row.answer}`)));
    const seen = new Set(normalizedExisting);
    const candidates = [];
    const candidateKeys = new Set();
    const excludedPhrases = [
        'عن أبي ذر', 'قال حكيم', 'سئل حكيم', 'رضي الله', 'صلى الله', 'الامام', 'الإمام',
        'المتنبي', 'الشافعي', 'ابن أبي طالب', 'قال رسول', 'حديث صحيح', 'يقال أن'
    ];
    for (const line of raw.split(/\r?\n/)) {
        if (!/^\s*\*\s/.test(line) || /^\s*\*\s*\*/.test(line)) continue;
        const text = cleanWikiquoteLine(line);
        const words = text.split(/\s+/).filter(Boolean);
        if (text.length < 16 || text.length > 90 || words.length < 4 || words.length > 13) continue;
        if (text.includes('...') || text.includes('…') || /[;:|]/.test(text)) continue;
        if (excludedPhrases.some(phrase => text.includes(phrase))) continue;
        const completion = splitProverb(text);
        if (!completion || completion.answer.length < 3) continue;
        const key = normalize(text);
        if (seen.has(key)) continue;
        seen.add(key);
        const questionKey = normalize(completion.question);
        if (candidateKeys.has(questionKey)) continue;
        candidateKeys.add(questionKey);
        candidates.push({ ...completion, text });
    }

    if (candidates.length < needed) {
        throw new Error(`Proverbs: need ${needed} additional unique entries, found ${candidates.length}`);
    }
    const additions = candidates.slice(0, needed).map((item, index) => ({
        id: `proverb-wikiquote-${String(index + 1).padStart(3, '0')}`,
        category: 'اكمل المثل',
        difficulty: index < needed / 3 ? 'سهل' : index < needed * 2 / 3 ? 'متوسط' : 'صعب',
        points: index < needed / 3 ? 100 : index < needed * 2 / 3 ? 300 : 500,
        question: item.question,
        answer: item.answer,
        image: '',
        hint: 'تأمل معنى صدر المثل والسياق الذي يقال فيه، ثم أكمل عبارته المأثورة.',
        options: [],
        factType: 'proverb-ending',
        source: 'https://ar.wikiquote.org/wiki/أمثال_عربية'
    }));
    await fs.writeFile(proverbFile, `window.proverbQuestionSeed = ${JSON.stringify(additions, null, 4)};\n`, 'utf8');
    console.log(`Proverbs: ${existingCount + additions.length} total; added ${additions.length} unique completions from Arabic Wikiquote.`);
}

async function main() {
    await expandGames();
    await expandProverbs();
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});