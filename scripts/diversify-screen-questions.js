const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const dataDirectory = path.join(__dirname, '..', 'data');
const userAgent = 'Mozilla/5.0 (compatible; SinJeemQuiz/1.0; screen question refresh)';
const groups = [
    {
        category: 'movies',
        file: 'movies-questions.js',
        global: 'moviesQuestionSeed',
        facts: [
            { kind: 'director', property: 'P57', template: title => `اذكر أحد مخرجي فيلم «${title}».`, prefix: '' },
            { kind: 'genre', property: 'P136', template: title => `إلى أي نوع سينمائي ينتمي فيلم «${title}»؟`, prefix: '' },
            { kind: 'country', property: 'P495', template: title => `في أي دولة أُنتج فيلم «${title}»؟`, prefix: '' },
            { kind: 'language', property: 'P364', template: title => `ما اللغة الأصلية لفيلم «${title}»؟`, prefix: '' },
            { kind: 'cast', property: 'P161', template: title => `اذكر أحد الممثلين المشاركين في فيلم «${title}».`, prefix: '' },
            { kind: 'year', property: 'P577', template: title => `في أي سنة صدر فيلم «${title}»؟`, prefix: '' }
        ]
    },
    {
        category: 'series',
        file: 'series-questions.js',
        global: 'seriesQuestionSeed',
        facts: [
            { kind: 'year', property: 'P580', template: title => `في أي سنة بدأ عرض مسلسل «${title}»؟`, prefix: '' },
            { kind: 'genre', property: 'P136', template: title => `ما أحد تصنيفات مسلسل «${title}»؟`, prefix: '' },
            { kind: 'country', property: 'P495', template: title => `اذكر إحدى دول إنتاج مسلسل «${title}».`, prefix: '' },
            { kind: 'cast', property: 'P161', template: title => `اذكر أحد الممثلين المشاركين في مسلسل «${title}».`, prefix: '' },
            { kind: 'creator', property: 'P170', template: title => `اذكر أحد مبتكري مسلسل «${title}».`, prefix: '' },
            { kind: 'language', property: 'P364', template: title => `ما اللغة الأصلية لمسلسل «${title}»؟`, prefix: '' }
        ]
    }
];

function qidFromSource(source) {
    return source?.match(/Q\d+$/)?.[0] || '';
}

function normalizeQuestion(question) {
    return question.toLocaleLowerCase('ar').replace(/[؟?!.,،:;"'`]/g, '').replace(/\s+/g, ' ').trim();
}

async function queryFacts(group, ids) {
    const values = ids.map(id => `wd:${id}`).join(' ');
    const facts = group.facts.map(fact => {
        const aggregate = fact.kind === 'year' ? 'MIN' : 'SAMPLE';
        const value = fact.kind === 'year' ? 'dateValue' : 'factValue';
        const branch = `{ {
            SELECT ?item (${aggregate}(?${value}) AS ?value) WHERE {
                VALUES ?item { ${values} }
                ?item wdt:${fact.property} ?${value}.
            } GROUP BY ?item
        } BIND("${fact.kind}" AS ?kind) ${fact.kind === 'year' ? 'BIND(STR(YEAR(?value)) AS ?valueLabel)' : ''} }`;
        return branch;
    }).join(' UNION ');
    const query = `SELECT ?item ?itemLabel ?kind ?valueLabel WHERE {
        ${facts}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "ar,en". }
    } ORDER BY ?item ?kind`;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;
    let result;
    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/sparql-results+json',
                    'User-Agent': userAgent
                },
                signal: AbortSignal.timeout(45000)
            });
            if (!response.ok) throw new Error(`${group.category}: HTTP ${response.status}`);
            result = await response.json();
            break;
        } catch (error) {
            lastError = error;
            if (attempt === 3) throw lastError;
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
    }
    const answers = new Map();
    for (const binding of result.results.bindings) {
        const id = binding.item.value.split('/').pop();
        const kind = binding.kind?.value;
        const answer = (binding.valueLabel?.value || binding.yearValue?.value || '').trim();
        if (!kind || !answer) continue;
        if (!answers.has(id)) answers.set(id, { title: binding.itemLabel?.value || '', facts: {} });
        const entity = answers.get(id);
        if (!entity.facts[kind]) entity.facts[kind] = answer;
    }
    return answers;
}

async function loadGroup(group) {
    const sourcePath = path.join(dataDirectory, group.file);
    require(sourcePath);
    const rows = window[group.global];
    const ids = [...new Set(rows.map(row => qidFromSource(row.source)).filter(Boolean))];
    const factsById = new Map();
    for (let offset = 0; offset < ids.length; offset += 30) {
        const batch = ids.slice(offset, offset + 30);
        const facts = await queryFacts(group, batch);
        for (const [id, record] of facts) factsById.set(id, record);
        await new Promise(resolve => setTimeout(resolve, 900));
    }

    const usage = { legacy: rows.filter(row => row.id.includes('legacy')).length, unchanged: 0 };
    for (const fact of group.facts) usage[fact.kind] = 0;
    const usedQuestions = new Set(rows
        .filter(row => row.id.includes('legacy'))
        .map(row => normalizeQuestion(row.question)));
    let factCursor = 0;
    for (const row of rows) {
        if (row.id.includes('legacy')) continue;
        const id = qidFromSource(row.source);
        let selected = null;
        for (let offset = 0; offset < group.facts.length; offset++) {
            const fact = group.facts[(factCursor + offset) % group.facts.length];
            const entity = factsById.get(id);
            const answer = entity?.facts[fact.kind];
            if (!entity?.title || !answer) continue;
            if (fact.kind === 'cast' && answer.length > 48) continue;
            if (fact.kind === 'genre' && answer.length > 55) continue;
            const question = fact.template(entity.title);
            if (usedQuestions.has(normalizeQuestion(question))) continue;
            const details = { title: entity.title, answer };
            selected = { fact, details, question };
            factCursor = (group.facts.indexOf(fact) + 1) % group.facts.length;
            break;
        }
        if (!selected) {
            usage.unchanged++;
            usedQuestions.add(normalizeQuestion(row.question));
            continue;
        }
        row.question = selected.question;
        row.answer = selected.details.answer;
        row.imageAlt = selected.details.title;
        row.factType = selected.fact.kind;
        row.clueFacts = factsById.get(id)?.facts || {};
        usedQuestions.add(normalizeQuestion(row.question));
        row.difficulty ||= row.points <= 200 ? 'سهل' : row.points <= 400 ? 'متوسط' : 'صعب';
        usage[selected.fact.kind]++;
    }

    const duplicateQuestions = new Set();
    for (const row of rows) {
        const normalized = normalizeQuestion(row.question);
        if (duplicateQuestions.has(normalized)) continue;
        if (rows.filter(candidate => normalizeQuestion(candidate.question) === normalized).length > 1) duplicateQuestions.add(normalized);
    }
    if (duplicateQuestions.size) throw new Error(`${group.category}: ${duplicateQuestions.size} duplicate questions generated`);

    await fs.writeFile(sourcePath, `window.${group.global} = ${JSON.stringify(rows, null, 4)};\n`, 'utf8');
    console.log(`${group.category}: ${rows.length} questions; ${JSON.stringify(usage)}`);
}

async function main() {
    for (const group of groups) await loadGroup(group);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});