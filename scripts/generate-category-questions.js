const fs = require('node:fs/promises');
const path = require('node:path');

const endpoint = 'https://query.wikidata.org/sparql?query=';
const outputDirectory = path.join(__dirname, '..', 'data');
const targetCount = 200;
const batchSize = 100;
const language = 'ar,en';

const categories = [
    {
        file: 'movies-questions.js',
        globalName: 'window.moviesQuestionSeed',
        category: 'أفلام',
        query: `SELECT ?item ?itemLabel ?directorLabel WHERE {
            ?item wdt:P31 wd:Q11424; wdt:P57 ?director.
            SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}". }
        } ORDER BY ?item ?directorLabel LIMIT ${batchSize} OFFSET __OFFSET__`,
        question: item => `اذكر أحد مخرجي فيلم «${item.itemLabel}».`,
        answer: item => item.directorLabel,
        legacy: [
            ['movies-legacy-inception', 'مخرج فيلم Inception؟', 'كريستوفر نولان', 200, 'Q25188'],
            ['movies-legacy-titanic', 'فيلم حصد 11 جائزة أوسكار عن السفينة؟', 'تيتانيك', 400, 'Q44578'],
            ['movies-legacy-interstellar', 'فيلم الفضاء Interstellar من إخراج؟', 'نولان', 600, 'Q13417189']
        ]
    },
    {
        file: 'series-questions.js',
        globalName: 'window.seriesQuestionSeed',
        category: 'مسلسلات',
        query: `SELECT ?item ?itemLabel ?start WHERE {
            ?item wdt:P31 wd:Q5398426; wdt:P580 ?date.
            SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}". }
            BIND(?date AS ?start)
        } ORDER BY ?item ?start LIMIT ${batchSize} OFFSET __OFFSET__`,
        question: item => `في أي سنة بدأ عرض مسلسل «${item.itemLabel}»؟`,
        answer: item => item.start.slice(0, 4),
        legacy: [
            ['series-legacy-money-heist', 'ما اسم المسلسل الإسباني الذي تدور قصته حول سرقة دار سك العملة؟', 'La Casa de Papel', 200, 'Q29647346'],
            ['series-legacy-breaking-bad', 'في أي دولة تدور أحداث مسلسل Breaking Bad؟', 'الولايات المتحدة', 400, 'Q30'],
            ['series-legacy-anime-platform', 'ما المنصة المعروفة بعرض مسلسلات الأنمي؟', 'Crunchyroll', 600, 'Q1142035']
        ]
    },
    {
        file: 'geography-questions.js',
        globalName: 'window.geographyQuestionSeed',
        category: 'جغرافيا',
        query: `SELECT ?item ?itemLabel ?answerLabel ?kind WHERE {
            {
                ?item wdt:P31 wd:Q6256; wdt:P36 ?answer.
                BIND("capital" AS ?kind)
            } UNION {
                ?item wdt:P31 wd:Q6256; wdt:P30 ?answer.
                BIND("continent" AS ?kind)
            } UNION {
                ?item wdt:P31 wd:Q6256; wdt:P38 ?answer.
                BIND("currency" AS ?kind)
            } UNION {
                ?item wdt:P31 wd:Q6256; wdt:P37 ?answer.
                BIND("language" AS ?kind)
            }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}". }
        } ORDER BY ?item ?kind ?answerLabel LIMIT ${batchSize} OFFSET __OFFSET__`,
        question: item => ({
            capital: `ما عاصمة دولة «${item.itemLabel}»؟`,
            continent: `إلى أي قارة تنتمي دولة «${item.itemLabel}»؟`,
            currency: `اذكر إحدى العملات الرسمية لدولة «${item.itemLabel}»؟`,
            language: `اذكر إحدى اللغات الرسمية في دولة «${item.itemLabel}»؟`
        })[item.kind],
        answer: item => item.answerLabel,
        legacy: [
            ['geography-legacy-russia', 'ما أكبر دولة في العالم من حيث المساحة؟', 'روسيا', 200, 'Q159'],
            ['geography-legacy-australia', 'ما عاصمة أستراليا؟', 'كانبرا', 400, 'Q408'],
            ['geography-legacy-everest', 'ما أعلى قمة جبلية فوق مستوى سطح البحر؟', 'إيفرست', 600, 'Q513']
        ]
    },
    {
        file: 'sports-questions.js',
        globalName: 'window.sportsQuestionSeed',
        category: 'كورة ورياضة',
        query: `SELECT ?item ?itemLabel ?sportEntityLabel WHERE {
            ?item wdt:P106 wd:Q2066131; wdt:P641 ?sportEntity.
            SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}". }
        } ORDER BY ?item ?sportEntityLabel LIMIT ${batchSize} OFFSET __OFFSET__`,
        question: item => `اذكر إحدى الرياضات المسجلة للرياضي «${item.itemLabel}».`,
        answer: item => item.sportEntityLabel,
        legacy: [
            ['sports-legacy-team-size', 'كم لاعباً من الفريق الواحد يشارك داخل ملعب كرة القدم؟', '11 لاعباً', 200, 'Q2736'],
            ['sports-legacy-world-cup', 'ما المنتخب الأكثر فوزاً بكأس العالم لكرة القدم للرجال؟', 'البرازيل', 400, 'Q155'],
            ['sports-legacy-real-madrid', 'ما النادي الإسباني المعروف بلقب النادي الملكي؟', 'ريال مدريد', 200, 'Q8682']
        ]
    },
    {
        file: 'cars-questions.js',
        globalName: 'window.carsQuestionSeed',
        category: 'سيارات',
        query: `SELECT ?item ?itemLabel ?manufacturerLabel WHERE {
            ?item wdt:P31 wd:Q3231690; wdt:P176 ?manufacturer.
            SERVICE wikibase:label { bd:serviceParam wikibase:language "${language}". }
        } ORDER BY ?item ?manufacturerLabel LIMIT ${batchSize} OFFSET __OFFSET__`,
        question: item => `ما الشركة المصنّعة لطراز السيارة «${item.itemLabel}»؟`,
        answer: item => item.manufacturerLabel,
        legacy: [
            ['cars-legacy-audi', 'ما الشركة صاحبة شعار الحلقات الأربع المتقاطعة؟', 'Audi', 200, 'Q23317'],
            ['cars-legacy-ferrari', 'ما الشركة الإيطالية صاحبة شعار الحصان الجامح؟', 'Ferrari', 400, 'Q27586'],
            ['cars-legacy-porsche', 'في أي دولة تأسست شركة بورشه؟', 'ألمانيا', 600, 'Q183']
        ]
    }
];

function normalize(value) {
    return String(value || '').toLocaleLowerCase('ar').replace(/[؟?!.,،:;"'`]/g, '').replace(/\s+/g, ' ').trim();
}

function readValue(row, field) {
    return row[field]?.value || '';
}

async function fetchBindings(query) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(`${endpoint}${encodeURIComponent(query)}`, {
                headers: {
                    Accept: 'application/sparql-results+json',
                    'User-Agent': 'SinJeemQuiz/1.0 (static question bank generation)'
                },
                signal: AbortSignal.timeout(90000)
            });
            if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}`);
            return (await response.json()).results.bindings;
        } catch (error) {
            lastError = error;
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 2500));
        }
    }
    throw lastError;
}

function legacyRecord(category, [id, question, answer, points, qid]) {
    return {
        id,
        category: category.category,
        difficulty: points <= 200 ? 'سهل' : points <= 400 ? 'متوسط' : 'صعب',
        points,
        question,
        answer,
        image: '',
        hint: '',
        source: qid ? `https://www.wikidata.org/wiki/${qid}` : ''
    };
}

function mapRecord(category, row) {
    const item = Object.fromEntries(Object.keys(row).map(key => [key, readValue(row, key)]));
    const qid = item.item?.split('/').pop();
    const label = item.itemLabel;
    if (!qid || !label || /^Q\d+$/.test(label)) return null;
    const question = category.question(item);
    const answer = String(category.answer ? category.answer(item) : item.answer || '').trim();
    if (!answer || answer === 'undefined' || answer === 'null') return null;
    return {
        id: `${category.file.replace('-questions.js', '')}-${item.kind || 'fact'}-${qid}`,
        category: category.category,
        difficulty: '',
        points: 0,
        question,
        answer,
        imageAlt: label,
        image: '',
        hint: '',
        source: `https://www.wikidata.org/wiki/${qid}`
    };
}

async function buildRecords(category) {
    const records = category.legacy.map(record => legacyRecord(category, record));
    const seenQuestions = new Set(records.map(record => normalize(record.question)));
    const seenEntities = new Set();

    for (let offset = 0; records.length < targetCount && offset < 10000; offset += batchSize) {
        const query = category.query.replace('__OFFSET__', String(offset));
        const rows = await fetchBindings(query);
        if (!rows.length) break;
        for (const row of rows) {
            const record = mapRecord(category, row);
            if (!record || seenEntities.has(record.id) || seenQuestions.has(normalize(record.question))) continue;
            seenEntities.add(record.id);
            seenQuestions.add(normalize(record.question));
            records.push(record);
            if (records.length === targetCount) break;
        }
    }

    if (records.length !== targetCount) {
        throw new Error(`${category.category}: expected ${targetCount} questions, got ${records.length}`);
    }
    records.forEach((record, index) => {
        if (record.points) return;
        const tier = Math.min(4, Math.floor(index / 40));
        record.points = (tier + 1) * 100;
        record.difficulty = ['سهل', 'سهل', 'متوسط', 'صعب', 'صعب'][tier];
    });
    return records;
}

async function main() {
    for (const category of categories) {
        process.stdout.write(`Fetching ${category.category}... `);
        const records = await buildRecords(category);
        const contents = `${category.globalName} = ${JSON.stringify(records, null, 4)};\n`;
        await fs.writeFile(path.join(outputDirectory, category.file), contents, 'utf8');
        console.log(`${records.length} questions`);
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});