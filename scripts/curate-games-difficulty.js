const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const gamesFile = path.join(__dirname, '..', 'data', 'games-questions.js');
const familiarGames = [
    'minecraft', 'ماينكرافت', 'grand theft auto', 'جراند ثفت أوتو', 'gta',
    'fortnite', 'فورتنايت', 'pubg', 'ببجي', 'among us', 'أمونغ آس', 'امونج اس',
    'super mario', 'سوبر ماريو', 'mario kart', 'ماريو كارت', 'donkey kong', 'دونكي كونغ',
    'the legend of zelda', 'زيلدا', 'pokemon', 'بوكيمون', 'call of duty', 'كول أوف ديوتي',
    'fifa', 'ea sports fc', 'sonic', 'سونيك', 'tetris', 'تتريس', 'roblox', 'روبلوكس',
    'angry birds', 'أنجري بيردز', 'league of legends', 'ليغ أوف ليجندز', 'valorant', 'فالورانت',
    'counter-strike', 'كاونتر سترايك', 'god of war', 'كريتوس', 'red dead redemption', 'ريد ديد',
    'the witcher', 'ذا ويتشر', 'elden ring', 'إلدن رينغ', 'assassin', 'أساسنز كريد',
    'uncharted', 'أنشارتد', 'resident evil', 'ريزدنت إيفل', 'final fantasy', 'فاينل فانتسي',
    'the sims', 'ذا سيمز', 'age of empires', 'أيج أوف إمبايرز', 'عصر الإمبراطوريات',
    'civilization', 'سيفيليزيشن', 'سيفليزيشن', 'الحضارة', 'star wars', 'ستار وورز', 'halo', 'هالو', 'overwatch',
    'أوفر واتش', 'rocket league', 'روكيت ليج', 'clash of clans', 'كلاش أوف كلانز',
    'clash royale', 'كلاش رويال', 'free fire', 'فري فاير', 'genshin impact', 'غينشن إمباكت',
    'terraria', 'تيراريا', 'stardew valley', 'ستارديو فالي', 'bioshock', 'بايوشوك',
    'half-life', 'هاف لايف', 'wolfenstein', 'ولفينشتاين', 'commandos', 'المغاوير',
    'heroes of might and magic', 'هيروس أوف مايت', 'empire earth', 'إمباير إيرث',
    'doom', 'دووم', 'mortal kombat', 'مورتال كومبات',
    'street fighter', 'ستريت فايتر', 'tekken', 'تيكن', 'the last of us', 'ذا لاست أوف أس',
    'skyrim', 'سكايرم', 'animal crossing', 'أنيمل كروسينغ', 'wii sports', 'وي سبورتس',
    'need for speed', 'نيد فور سبيد', 'far cry', 'fallout', 'diablo', 'warcraft',
    'starcraft', 'portal', 'crash bandicoot', 'spyro', 'metal gear', 'monster hunter',
    'forza', 'gran turismo', 'splatoon', 'hades', 'undertale', 'fall guys', 'apex legends',
    'dota', 'destiny', 'battlefield', 'the elder scrolls', 'plants vs zombies', 'valheim'
];

const topSalesIds = new Set([
    'Q49740', 'Q96417649', 'Q17452', 'Q71936', 'Q27438121', 'Q28937399', 'Q28321447',
    'Q332697', 'Q5884557', 'Q323862', 'Q4267401', 'Q43541160', 'Q64566657', 'Q23013817'
]);
const directFactTypes = new Set(['genre', 'year', 'platform']);
const curatedOverrides = {
    'Q17452': {
        points: 300,
        prominence: 'familiar'
    },
    'Q220767': {
        points: 200,
        answer: 'مايكروسوفت',
        options: ['مايكروسوفت', 'نينتندو', 'سيغا', 'سوني'],
        hint: 'الشركة الأمريكية المعروفة بنظام ويندوز.'
    }
};
const easyLegacyIds = new Set([
    'games-1', 'games-2', 'games-3', 'games-4', 'games-5', 'games-6',
    'games-7', 'games-8', 'games-9', 'games-10', 'games-11', 'games-14',
    'games-15', 'games-17', 'games-18', 'games-19', 'games-21', 'games-22',
    'games-23', 'games-25', 'games-27', 'games-28', 'games-29'
]);

function normalize(value) {
    return String(value || '').normalize('NFC').toLocaleLowerCase('ar')
        .replace(/[™®©]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function titlePopularity(row) {
    const id = row.id.match(/^games-wd-(Q\d+)$/)?.[1] || '';
    if (topSalesIds.has(id)) return 'iconic';
    const title = normalize(`${row.imageAlt || ''} ${row.question || ''}`);
    return familiarGames.some(alias => title.includes(normalize(alias))) ? 'familiar' : 'specialized';
}

function pointsFor(row, popularity) {
    const directFact = directFactTypes.has(row.factType);
    if (popularity === 'iconic') return directFact ? 100 : 200;
    if (popularity === 'familiar') return directFact ? 200 : 300;
    return directFact ? 400 : 500;
}

function difficultyFor(points) {
    return points <= 200 ? 'سهل' : points <= 400 ? 'متوسط' : 'صعب';
}

async function main() {
    require(gamesFile);
    const rows = window.gamesQuestionSeed;
    const report = { iconic: 0, familiar: 0, specialized: 0, easyLegacy: 0, points: {} };
    for (const row of rows) {
        if (easyLegacyIds.has(row.id)) {
            row.prominence = 'iconic';
            row.points = 100;
            row.difficulty = difficultyFor(row.points);
            report.iconic++;
            report.easyLegacy++;
            report.points[row.points] = (report.points[row.points] || 0) + 1;
            continue;
        }
        if (!row.id.startsWith('games-wd-')) continue;
        const id = row.id.slice('games-wd-'.length);
        const popularity = titlePopularity(row);
        row.prominence = popularity;
        row.points = pointsFor(row, popularity);
        row.difficulty = difficultyFor(row.points);
        const override = curatedOverrides[id];
        if (override) Object.assign(row, override, { difficulty: difficultyFor(override.points) });
        report[popularity]++;
        report.points[row.points] = (report.points[row.points] || 0) + 1;
    }
    await fs.writeFile(gamesFile, `window.gamesQuestionSeed = ${JSON.stringify(rows, null, 4)};\n`, 'utf8');
    console.log(JSON.stringify({ total: rows.length, ...report }, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});