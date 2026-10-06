const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const gamesFile = path.join(__dirname, '..', 'data', 'games-questions.js');
const userAgent = 'Mozilla/5.0 (compatible; SinJeemQuiz/1.0; Steam cover metadata)';
const legacyTitles = {
    'games-1': 'Super Mario Bros.',
    'games-2': 'Fortnite',
    'games-3': 'Minecraft',
    'games-4': 'Grand Theft Auto V',
    'games-5': 'Sonic the Hedgehog',
    'games-6': 'EA Sports FC',
    'games-7': 'God of War',
    'games-8': 'Angry Birds',
    'games-9': 'Among Us',
    'games-10': 'PUBG Battlegrounds',
    'games-11': 'Need for Speed',
    'games-12': 'Marvel vs. Capcom',
    'games-13': "Assassin's Creed Brotherhood",
    'games-15': 'Crash Bandicoot',
    'games-17': 'Rocket League',
    'games-19': 'Stray',
    'games-20': 'Call of Duty: Warzone',
    'games-21': 'Final Fantasy VII',
    'games-22': 'Plants vs. Zombies',
    'games-23': 'Grand Theft Auto: San Andreas',
    'games-25': 'SimCity',
    'games-27': 'Counter-Strike',
    'games-28': 'Stardew Valley',
    'games-30': 'Red Dead Redemption 2',
    'games-31': 'Grand Theft Auto: Vice City',
    'games-33': 'The Legend of Zelda',
    'games-34': 'Uncharted',
    'games-35': 'Resident Evil',
    'games-36': 'Valorant',
    'games-37': 'The Witcher 3: Wild Hunt',
    'games-38': 'PUBG Battlegrounds',
    'games-39': 'Mortal Kombat',
    'games-40': 'Red Dead Redemption',
    'games-41': 'Clash of Clans',
    'games-42': 'Mass Effect',
    'games-43': 'Elden Ring',
    'games-44': 'The Last of Us',
    'games-46': 'The Elder Scrolls V: Skyrim',
    'games-47': 'Portal',
    'games-48': 'Minecraft',
    'games-49': 'Cyberpunk 2077',
    'games-51': 'Portal',
    'games-54': 'Halo',
    'games-57': 'Dark Souls II',
    'games-58': 'Mafia',
    'games-59': 'Half-Life 2',
    'games-60': 'Final Fantasy VII',
    'games-61': 'Resident Evil',
    'games-62': 'Sea of Thieves',
    'games-63': 'BioShock',
    'games-64': 'Bloodborne',
    'games-65': 'Halo',
    'games-66': 'Grand Theft Auto V',
    'games-67': 'The Witcher',
    'games-68': 'Pong',
    'games-69': 'Hitman',
    'games-70': 'The Legend of Zelda',
    'games-71': 'Grand Theft Auto: San Andreas',
    'games-72': 'Resident Evil 4',
    'games-73': 'The Elder Scrolls III: Morrowind',
    'games-74': 'Half-Life 2',
    'games-75': 'Halo 2',
    'games-76': 'BioShock Infinite',
    'games-77': 'Watch Dogs 2'
};
const legacyAppIds = {
    'games-4': 3240220,
    'games-6': 2669320,
    'games-7': 1593500,
    'games-9': 945360,
    'games-10': 578080,
    'games-13': 48190,
    'games-15': 731490,
    'games-17': 252950,
    'games-19': 1332010,
    'games-21': 39140,
    'games-22': 3590,
    'games-23': 12120,
    'games-27': 730,
    'games-28': 413150,
    'games-30': 1174180,
    'games-31': 12110,
    'games-37': 292030,
    'games-35': 304240,
    'games-39': 976310,
    'games-42': 1328670,
    'games-43': 1245620,
    'games-44': 1888930,
    'games-46': 489830,
    'games-47': 400,
    'games-49': 1091500,
    'games-51': 400,
    'games-54': 976730,
    'games-57': 236430,
    'games-62': 1172620,
    'games-63': 409710,
    'games-69': 1659040,
    'games-72': 2050650,
    'games-73': 22320,
    'games-74': 220,
    'games-75': 976730,
    'games-76': 8870,
    'games-77': 447040
};
const wikidataAppIds = {
    Q2374: 3910,
    Q2377: 3900,
    Q2385: 8930,
    Q2387: 6830,
    Q18940: 2270,
    Q18951: 380,
    Q22986: 57300,
    Q20420: 254760,
    Q2473: 15370,
    Q220767: 1017900,
    Q34852: 813780,
    Q34869: 933110
};

function pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function canonicalTitle(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('en')
        .replace(/\([^)]*(?:video game|computer game)[^)]*\)/g, ' ')
        .replace(/\bsid meier s\b/g, ' ')
        .replace(/\b(?:complete|deluxe|definitive|enhanced|remastered|remaster|edition|gold|hd|collection|special)\b/g, ' ')
        .replace(/\biii\b/g, '3')
        .replace(/\bii\b/g, '2')
        .replace(/\biv\b/g, '4')
        .replace(/\bv\b/g, '5')
        .replace(/\bvi\b/g, '6')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function exactTitleMatch(query, candidate) {
    const normalizedQuery = canonicalTitle(query);
    return normalizedQuery.length >= 4 && normalizedQuery === canonicalTitle(candidate);
}

async function fetchEnglishTitles(rows) {
    const ids = [...new Set(rows.map(row => row.source?.match(/Q\d+$/)?.[0]).filter(Boolean))];
    const titles = new Map();
    for (let offset = 0; offset < ids.length; offset += 50) {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: ids.slice(offset, offset + 50).join('|'),
            props: 'labels|sitelinks',
            languages: 'en',
            format: 'json'
        });
        const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
            headers: { 'Api-User-Agent': userAgent, Accept: 'application/json' },
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) throw new Error(`Wikidata labels returned HTTP ${response.status}`);
        const result = await response.json();
        for (const [id, entity] of Object.entries(result.entities || {})) {
            const title = entity.labels?.en?.value || entity.sitelinks?.enwiki?.title || '';
            if (title) titles.set(id, title);
        }
        await pause(1000);
    }
    return titles;
}

async function searchSteam(query, cache) {
    const cacheKey = canonicalTitle(query);
    if (!cacheKey) return null;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    let match = null;
    try {
        const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=us`;
        const response = await fetch(url, {
            headers: { 'User-Agent': userAgent },
            signal: AbortSignal.timeout(12000)
        });
        if (response.ok) {
            const result = await response.json();
            match = result.items?.find(item => exactTitleMatch(query, item.name)) || null;
        }
    } catch {}
    cache.set(cacheKey, match);
    await pause(180);
    return match;
}

async function hasCover(url) {
    try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        return response.ok && response.headers.get('content-type')?.startsWith('image/');
    } catch {
        return false;
    }
}

async function findSteamArtwork(appId) {
    for (const filename of ['library_600x900.jpg', 'header.jpg', 'capsule_616x353.jpg']) {
        const url = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/${filename}`;
        if (await hasCover(url)) {
            return { url, kind: filename === 'library_600x900.jpg' ? 'steam-cover' : 'steam-art' };
        }
    }
    return null;
}

async function main() {
    require(gamesFile);
    const rows = window.gamesQuestionSeed;
    const englishTitles = await fetchEnglishTitles(rows);
    const searchCache = new Map();
    const stats = { total: rows.length, existingCovers: 0, steamCovers: 0, unchanged: 0 };
    for (const row of rows) {
        const qid = row.source?.match(/Q\d+$/)?.[0];
        const title = legacyTitles[row.id] || (qid ? englishTitles.get(qid) : '') || row.imageAlt || row.answer;
        const manualAppId = legacyAppIds[row.id] || wikidataAppIds[qid];
        if (!manualAppId && row.imageKind === 'steam-cover') {
            stats.existingCovers++;
            continue;
        }
        const appId = manualAppId || (await searchSteam(title, searchCache))?.id;
        if (!appId) {
            stats.unchanged++;
            continue;
        }
        const artwork = await findSteamArtwork(appId);
        if (!artwork) {
            if (row.imageKind === 'steam-cover') stats.existingCovers++;
            else stats.unchanged++;
            continue;
        }
        row.image = artwork.url;
        row.imageSource = `https://store.steampowered.com/app/${appId}/`;
        row.imageKind = artwork.kind;
        row.imageAlt = title;
        stats.steamCovers++;
    }
    await fs.writeFile(gamesFile, `window.gamesQuestionSeed = ${JSON.stringify(rows, null, 4)};\n`, 'utf8');
    console.log(JSON.stringify(stats, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});