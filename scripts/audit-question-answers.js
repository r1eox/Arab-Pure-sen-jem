const fs = require('node:fs');

global.window = {};

const files = [
    'games-questions.js', 'movies-questions.js', 'series-questions.js',
    'geography-questions.js', 'sports-questions.js', 'cars-questions.js'
];
const predicates = new Set([
    'P123', 'P136', 'P161', 'P170', 'P176', 'P178', 'P179', 'P30', 'P37',
    'P38', 'P54', 'P57', 'P123', 'P1346', 'P364', 'P400', 'P495', 'P577', 'P580', 'P641'
]);
const propertyByCategoryAndFact = {
    'ألعاب': { developer: 'P178', publisher: 'P123', genre: 'P136', platform: 'P400', year: 'P577', series: 'P179' },
    'أفلام': { director: 'P57', genre: 'P136', country: 'P495', language: 'P364', cast: 'P161', year: 'P577' },
    'مسلسلات': { creator: 'P170', genre: 'P136', country: 'P495', language: 'P364', cast: 'P161', year: 'P580' },
    'جغرافيا': { language: 'P37', currency: 'P38', continent: 'P30' },
    'كورة ورياضة': { sport: 'P641', 'football-champion': 'P1346', 'football-career': '__label', 'basketball-champion': 'P1346' },
    'سيارات': { manufacturer: 'P176', 'legacy-manufacturer': 'P176' }
};
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const answerAliases = new Map([
    ['games-wd-Q220767', ['مايكروسوفت', 'إكس بوكس غيم ستوديوز', 'Xbox Game Studios']],
    ['NBA_BOSTON_CELTICS', ['بوسطن سيلتكس', 'قلط بسطن', 'Boston Celtics']],
]);

function normalize(value) {
    return String(value || '').normalize('NFKD')
        .replace(/[\u064b-\u065f\u0670\u0300-\u036f]/g, '')
        .toLocaleLowerCase('ar')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function qidFor(row) {
    return row.source?.match(/Q\d+$/)?.[0] || '';
}

function propertyFor(row) {
    if (row.category === 'سيارات' && row.id.startsWith('cars-legacy-')) return '';
    return propertyByCategoryAndFact[row.category]?.[row.factType] || '';
}

function resultBindings(result) {
    return result.results?.bindings || [];
}

async function queryBatch(rows, attempt = 0) {
    const ids = [...new Set(rows.map(row => qidFor(row)))];
    const values = ids.map(id => `wd:${id}`).join(' ');
    const props = [...predicates].map(property => `wdt:${property}`).join(' ');
    const query = `SELECT ?item ?property ?value ?label WHERE {
      VALUES ?item { ${values} }
      VALUES ?property { ${props} }
      ?item ?property ?value.
      OPTIONAL { ?value rdfs:label ?label. FILTER(LANG(?label) IN ("ar", "en")) }
    }`;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'SinJeemQuizAnswerAudit/1.0 (educational quiz validation)' },
            signal: AbortSignal.timeout(60000)
        });
        if (response.status === 429 || response.status >= 500) {
            const delay = Math.max(Number(response.headers.get('retry-after')) * 1000 || 0, 12000 * (attempt + 1));
            throw Object.assign(new Error(`Wikidata HTTP ${response.status}`), { retryDelay: delay });
        }
        if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}`);
        return resultBindings(await response.json());
    } catch (error) {
        if (attempt >= 4) throw error;
        await wait(error.retryDelay || 5000 * (attempt + 1));
        return queryBatch(rows, attempt + 1);
    }
}

async function fetchEntityLabels(ids) {
    const labels = new Map();
    for (let offset = 0; offset < ids.length; offset += 50) {
        const batch = ids.slice(offset, offset + 50);
        const params = new URLSearchParams({
            action: 'wbgetentities', ids: batch.join('|'), props: 'labels',
            languages: 'ar|en', format: 'json'
        });
        const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
            headers: { 'Api-User-Agent': 'SinJeemQuizAnswerAudit/1.0', Accept: 'application/json' },
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) throw new Error(`Wikidata labels HTTP ${response.status}`);
        const result = await response.json();
        for (const [id, entity] of Object.entries(result.entities || {})) {
            const label = entity.labels?.ar?.value || entity.labels?.en?.value;
            if (label) labels.set(id, label);
        }
        if (offset + 50 < ids.length) await wait(800);
    }
    return labels;
}

function extractValue(binding, property) {
    const raw = binding.value.value;
    if (property === 'P577' || property === 'P580') return raw.match(/[+-]?(\d{4})/)?.[1] || raw;
    return binding.label?.value || raw.split('/').pop();
}

async function main() {
    const rows = [];
    for (const file of files) {
        require(`../data/${file}`);
        const globalName = file.replace(/-questions\.js$/, '');
        const seedName = `${globalName.replace(/(^|-)([a-z])/g, (_, _dash, letter) => letter.toUpperCase())}QuestionSeed`;
        const variable = {
            'games-questions.js': 'gamesQuestionSeed',
            'movies-questions.js': 'moviesQuestionSeed',
            'series-questions.js': 'seriesQuestionSeed',
            'geography-questions.js': 'geographyQuestionSeed',
            'sports-questions.js': 'sportsQuestionSeed',
            'cars-questions.js': 'carsQuestionSeed'
        }[file] || seedName;
        rows.push(...window[variable]);
    }

    const auditable = rows.filter(row => qidFor(row) && propertyFor(row));
    const byQid = new Map();
    for (const row of auditable) {
        const id = qidFor(row);
        if (!byQid.has(id)) byQid.set(id, []);
        byQid.get(id).push(row);
    }
    const uniqueEntities = [...byQid.keys()];
    const careerLabels = await fetchEntityLabels(uniqueEntities.filter(id =>
        byQid.get(id).some(row => propertyFor(row) === '__label')));
    const answersByEntityAndProperty = new Map();
    const valuesByEntityAndProperty = new Map();
    const batchSize = 55;
    let queries = 0;
    const claimEntities = uniqueEntities.filter(id => byQid.get(id).some(row => propertyFor(row) !== '__label'));
    for (let offset = 0; offset < claimEntities.length; offset += batchSize) {
        const ids = claimEntities.slice(offset, offset + batchSize);
        const bindings = await queryBatch(ids.map(id => ({ source: `https://www.wikidata.org/wiki/${id}` })));
        queries++;
        for (const binding of bindings) {
            const id = binding.item.value.split('/').pop();
            const property = binding.property.value.split('/').pop();
            const key = `${id}|${property}`;
            if (!answersByEntityAndProperty.has(key)) answersByEntityAndProperty.set(key, new Set());
            const rawValue = binding.value.value;
            const valueId = rawValue.match(/Q\d+$/)?.[0] || '';
            if (!valuesByEntityAndProperty.has(key)) valuesByEntityAndProperty.set(key, new Set());
            if (valueId) valuesByEntityAndProperty.get(key).add(valueId);
            answersByEntityAndProperty.get(key).add(extractValue(binding, property));
        }
        if (offset + batchSize < uniqueEntities.length) await wait(1800);
    }

    const missingLabels = new Set();
    for (const [key, valueIds] of valuesByEntityAndProperty) {
        const answers = answersByEntityAndProperty.get(key);
        for (const id of valueIds) {
            if (answers.has(id)) missingLabels.add(id);
        }
    }
    const fallbackLabels = await fetchEntityLabels([...missingLabels]);
    for (const [key, valueIds] of valuesByEntityAndProperty) {
        const answers = answersByEntityAndProperty.get(key);
        for (const id of valueIds) {
            const label = fallbackLabels.get(id);
            if (label) answers.add(label);
        }
    }

    const mismatches = [];
    const noSourceFact = [];
    const byCategory = {};
    for (const row of rows) {
        byCategory[row.category] ||= { rows: 0, sourceFactChecked: 0, matched: 0, mismatched: 0, unsupportedFactType: 0 };
        byCategory[row.category].rows++;
        const id = qidFor(row);
        const property = propertyFor(row);
        if (!id || !property) {
            if (row.source && row.factType && !property && !row.id.includes('legacy')) {
                byCategory[row.category].unsupportedFactType++;
                noSourceFact.push({ id: row.id, category: row.category, factType: row.factType, question: row.question, answer: row.answer });
            }
            continue;
        }
        byCategory[row.category].sourceFactChecked++;
        if (property === '__label') {
            const label = careerLabels.get(id) || '';
            if (normalize(label) === normalize(row.answer)) byCategory[row.category].matched++;
            else {
                byCategory[row.category].mismatched++;
                mismatches.push({ id: row.id, qid: id, category: row.category, factType: row.factType, property: 'entity-label', question: row.question, answer: row.answer, sourceAnswers: label ? [label] : [] });
            }
            continue;
        }
        const sourceAnswers = answersByEntityAndProperty.get(`${id}|${property}`) || new Set();
        const acceptedAnswers = row.factType === 'basketball-champion'
            && normalize(row.answer) === normalize('بوسطن سيلتكس')
            ? answerAliases.get('NBA_BOSTON_CELTICS')
            : answerAliases.get(row.id) || [row.answer];
        const normalizedAnswers = new Set(acceptedAnswers.map(normalize));
        const matched = [...sourceAnswers].some(value => normalizedAnswers.has(normalize(value)));
        if (matched) byCategory[row.category].matched++;
        else {
            byCategory[row.category].mismatched++;
            mismatches.push({ id: row.id, qid: id, category: row.category, factType: row.factType, property, question: row.question, answer: row.answer, sourceAnswers: [...sourceAnswers].slice(0, 12) });
        }
    }
    console.log(JSON.stringify({ totalSourceRows: rows.length, auditableRows: auditable.length, uniqueEntities: uniqueEntities.length, queries, byCategory, mismatches, unsupportedFactTypes: noSourceFact }, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});