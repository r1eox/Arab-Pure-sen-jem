const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const dataDirectory = path.join(__dirname, '..', 'data');
const blockedTitles = {
    moviesQuestionSeed: new Set([
        'Q7216',
        'Q24953',
        'Q24980',
        'Q25139',
        'Q27338',
        'Q27411',
        'Q27536',
        'Q28312',
        'Q28936',
        'Q29603',
        'Q73279',
        'Q74014',
        'Q74535',
        'Q74643'
    ]),
    seriesQuestionSeed: new Set([
        'Q23572',
        'Q23577',
        'Q23594',
        'Q23599',
        'Q23605',
        'Q23609',
        'Q23614',
        'Q23619',
        'Q23623',
        'Q23628',
        'Q23670',
        'Q23722',
        'Q23823',
        'Q23826',
        'Q27261',
        'Q32443',
        'Q29886'
    ])
};

const excludedQuestionIds = new Set([
    'series-fact-Q4525',
    'series-legacy-breaking-bad',
    'series-legacy-money-heist'
]);
const banks = [
    { file: 'movies-questions.js', global: 'moviesQuestionSeed' },
    { file: 'series-questions.js', global: 'seriesQuestionSeed' }
];

async function main() {
    for (const bank of banks) {
        require(path.join(dataDirectory, bank.file));
        const rows = window[bank.global];
        const blocked = blockedTitles[bank.global];
        const retained = rows.filter(row => {
            const qid = row.source?.match(/Q\d+$/)?.[0];
            return !blocked.has(qid) && !excludedQuestionIds.has(row.id);
        });
        await fs.writeFile(
            path.join(dataDirectory, bank.file),
            `window.${bank.global} = ${JSON.stringify(retained, null, 4)};\n`,
            'utf8'
        );
        console.log(JSON.stringify({
            category: bank.global,
            original: rows.length,
            retained: retained.length,
            removed: rows.length - retained.length
        }));
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});