const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const categories = [
    { name: 'movies', file: 'movies-questions.js', global: 'moviesQuestionSeed' },
    { name: 'series', file: 'series-questions.js', global: 'seriesQuestionSeed' },
    { name: 'geography', file: 'geography-questions.js', global: 'geographyQuestionSeed' },
    { name: 'sports', file: 'sports-questions.js', global: 'sportsQuestionSeed' },
    { name: 'cars', file: 'cars-questions.js', global: 'carsQuestionSeed' },
    { name: 'games', file: 'games-questions.js', global: 'gamesQuestionSeed' }
];

const dataDirectory = path.join(__dirname, '..', 'data');
const userAgent = 'Mozilla/5.0 (compatible; SinJeemQuiz/1.0; question image metadata)';

function pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function requestJson(url) {
    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { 'Api-User-Agent': userAgent, Accept: 'application/json' },
                signal: AbortSignal.timeout(30000)
            });
            if (response.status === 429 || response.status >= 500) {
                const retryAfter = Number(response.headers.get('retry-after')) || 10;
                await pause(Math.max(5000, retryAfter * 1000));
                throw new Error(`HTTP ${response.status}`);
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
            if (attempt < 3) await pause(5000 * (attempt + 1));
        }
    }
    throw lastError;
}

function qidFromSource(source) {
    return source?.match(/Q\d+$/)?.[0] || '';
}

function commonsImageUrl(filename) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=900`;
}

function commonsFilePage(filename) {
    return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename.replace(/ /g, '_'))}`;
}

function escapeXml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
    })[character]);
}

function subjectFromQuestion(question) {
    const subject = question?.split(String.fromCharCode(0x00ab))[1]?.split(String.fromCharCode(0x00bb))[0];
    return subject || question || '';
}

function illustrationCard(category, subject) {
    const palettes = {
        movies: ['#17324d', '#e79c43', 'FILM'],
        series: ['#24423c', '#efc66b', 'SERIES'],
        geography: ['#173f47', '#56b5a2', 'PLACE'],
        sports: ['#493321', '#e87e4b', 'SPORT'],
        cars: ['#343d4c', '#e7a34a', 'AUTO'],
        games: ['#25334d', '#70c3aa', 'GAME']
    };
    const [background, accent, label] = palettes[category];
    const symbols = {
        movies: '<path d="M90 90h180v110H90z" fill="#152333" stroke="#f0bd73" stroke-width="8"/><path d="M90 90l28-45h180l-28 45z" fill="#b9573f" stroke="#f0bd73" stroke-width="8"/><path d="M145 48l-27 42m80-42-28 42m80-42-28 42" stroke="#fff0d1" stroke-width="10"/>',
        series: '<rect x="76" y="50" width="220" height="150" rx="18" fill="#142b2a" stroke="#f1d37d" stroke-width="9"/><rect x="94" y="67" width="184" height="112" rx="8" fill="#3e8370"/><path d="M155 202v25m62-25v25m-85 8h110" stroke="#f1d37d" stroke-width="9" stroke-linecap="round"/>',
        geography: '<circle cx="185" cy="125" r="90" fill="#26798a" stroke="#b2ead4" stroke-width="8"/><path d="M95 125h180M185 35c-48 48-48 132 0 180m0-180c48 48 48 132 0 180M112 76h146M112 174h146" fill="none" stroke="#b2ead4" stroke-width="7"/>',
        sports: '<circle cx="185" cy="125" r="88" fill="#f7eee0" stroke="#e98d58" stroke-width="9"/><path d="M185 82l38 28-15 45h-47l-15-45zM185 82l-30-23m68 51 42-3m-57 73 8 37m-61-64-37 20m75-91 23-35" fill="#343d4c" stroke="#343d4c" stroke-width="13" stroke-linejoin="round"/>',
        cars: '<path d="M75 145l24-48q9-18 31-18h94q23 0 39 18l38 48 28 12v51H63v-45z" fill="#de694b" stroke="#ffe0ad" stroke-width="8"/><path d="M119 101h102l31 39H99z" fill="#b7dce0" stroke="#ffe0ad" stroke-width="6"/><circle cx="112" cy="205" r="25" fill="#17232e" stroke="#f3c171" stroke-width="8"/><circle cx="270" cy="205" r="25" fill="#17232e" stroke="#f3c171" stroke-width="8"/>',
        games: '<path d="M115 90h140q27 0 36 30l24 80q8 28-18 28h-24l-34-37h-72l-34 37h-24q-26 0-18-28l24-80q9-30 34-30z" fill="#19243a" stroke="#8de1c6" stroke-width="9"/><path d="M126 133v50m-25-25h50" stroke="#f2c46d" stroke-width="12" stroke-linecap="round"/><circle cx="245" cy="143" r="9" fill="#e8765d"/><circle cx="271" cy="169" r="9" fill="#70c3aa"/>'
    };
    const words = String(subject).trim().split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > 27 && line) {
            lines.push(line);
            line = word;
        } else line = next;
        if (lines.length === 2) break;
    }
    if (line && lines.length < 2) lines.push(line);
    const title = lines.map((text, index) => `<text x="500" y="${425 + index * 58}" text-anchor="middle" direction="rtl" font-size="${text.length > 22 ? 30 : 38}" font-weight="700" fill="#fff8ec">${escapeXml(text)}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="650" viewBox="0 0 1000 650"><rect width="1000" height="650" fill="${background}"/><path d="M0 510h1000v140H0z" fill="#101820" opacity=".45"/><circle cx="500" cy="170" r="190" fill="${accent}" opacity=".12"/>${symbols[category]}<text x="500" y="350" text-anchor="middle" font-family="sans-serif" font-size="21" letter-spacing="3" fill="${accent}">${label}</text>${title}<path d="M90 570h820" stroke="${accent}" stroke-width="3" opacity=".7"/><text x="500" y="610" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#c8d0ce">بطاقة توضيحية</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function readEntityMetadata(ids) {
    const entities = {};
    for (let offset = 0; offset < ids.length; offset += 50) {
        const batch = ids.slice(offset, offset + 50);
        const query = new URLSearchParams({
            action: 'wbgetentities',
            ids: batch.join('|'),
            props: 'claims|sitelinks',
            format: 'json'
        });
        const result = await requestJson(`https://www.wikidata.org/w/api.php?${query}`);
        Object.assign(entities, result.entities || {});
        await pause(1500);
    }
    return entities;
}

async function readArticleImages(language, titles) {
    const images = new Map();
    for (let offset = 0; offset < titles.length; offset += 40) {
        const batch = titles.slice(offset, offset + 40);
        const query = new URLSearchParams({
            action: 'query',
            prop: 'pageimages',
            piprop: 'name|thumbnail',
            pithumbsize: '900',
            titles: batch.map(item => item.title).join('|'),
            format: 'json'
        });
        const result = await requestJson(`https://${language}.wikipedia.org/w/api.php?${query}`);
        const pages = Object.values(result.query?.pages || {});
        for (const item of batch) {
            const page = pages.find(candidate => candidate.title === item.title);
            if (page?.thumbnail?.source) {
                images.set(item.id, {
                    image: page.thumbnail.source,
                    imageSource: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
                    imageKind: /poster|cover|key.?art/i.test(page.pageimage || '') ? 'poster' : 'article'
                });
            }
        }
        await pause(1500);
    }
    return images;
}

async function enrichCategory(category) {
    const rows = window[category.global];
    const ids = [...new Set(rows.map(row => qidFromSource(row.source)).filter(Boolean))];
    const selectedImages = new Map();
    const screenCategory = category.name === 'movies' || category.name === 'series';
    for (const row of rows) {
        const id = qidFromSource(row.source);
        if (!screenCategory && id && row.image && row.imageKind && row.imageKind !== 'illustration') {
            selectedImages.set(id, {
                image: row.image,
                imageSource: row.imageSource || '',
                imageKind: row.imageKind
            });
        }
    }
    const missingIds = ids.filter(id => !selectedImages.has(id));
    const entities = await readEntityMetadata(missingIds);
    const missingArticles = [];

    for (const row of rows) {
        const id = qidFromSource(row.source);
        if (selectedImages.has(id)) continue;
        const entity = entities[id];
        const sitelink = entity?.sitelinks?.enwiki || entity?.sitelinks?.arwiki;
        if (screenCategory && sitelink) {
            missingArticles.push({ id, title: sitelink.title, language: sitelink.site.slice(0, -4) });
        }
        const imageProperty = category.name === 'geography' ? 'P41' : 'P18';
        const filename = entity?.claims?.[imageProperty]?.[0]?.mainsnak?.datavalue?.value;
        if (filename) {
            const fileImage = {
                image: commonsImageUrl(filename),
                imageSource: commonsFilePage(filename),
                imageKind: category.name === 'geography' ? 'flag' : /poster|cover|key.?art/i.test(filename) ? 'poster' : 'commons'
            };
            if (!screenCategory || /poster|cover|key.?art/i.test(filename)) selectedImages.set(id, fileImage);
            else row.fallbackImage = fileImage;
            continue;
        }

        if (!screenCategory && sitelink) missingArticles.push({ id, title: sitelink.title, language: sitelink.site.slice(0, -4) });
    }

    const byLanguage = new Map();
    for (const article of missingArticles) {
        if (!byLanguage.has(article.language)) byLanguage.set(article.language, []);
        byLanguage.get(article.language).push(article);
    }

    for (const [language, articles] of byLanguage) {
        const articleImages = await readArticleImages(language, articles);
        for (const [id, image] of articleImages) {
            const current = selectedImages.get(id);
            if (image.imageKind === 'poster' || current?.imageKind !== 'poster') {
                selectedImages.set(id, image);
            }
        }
    }

    let verifiedImageCount = 0;
    for (const row of rows) {
        const id = qidFromSource(row.source);
        const image = selectedImages.get(id);
        row.imageAlt ||= row.brandName || row.answer || subjectFromQuestion(row.question);
        if (image) {
            row.image = image.image;
            verifiedImageCount++;
        } else {
            const fallbackImage = row.fallbackImage;
            if (fallbackImage) verifiedImageCount++;
            row.image = fallbackImage?.image || illustrationCard(category.name, row.imageAlt);
            row.imageSource = fallbackImage?.imageSource || '';
            row.imageKind = fallbackImage?.imageKind || 'illustration';
            delete row.fallbackImage;
            continue;
        }
        row.imageSource = image?.imageSource || '';
        row.imageKind = image?.imageKind || 'illustration';
        delete row.fallbackImage;
    }

    const contents = `window.${category.global} = ${JSON.stringify(rows, null, 4)};\n`;
    await fs.writeFile(path.join(dataDirectory, category.file), contents, 'utf8');
    console.log(`${category.name}: ${verifiedImageCount} verified images and ${rows.length - verifiedImageCount} illustrated fallback cards (${rows.length} total).`);
}

async function main() {
    const requestedCategory = process.argv.find(value => value.startsWith('--category='))?.split('=')[1];
    const selectedCategories = requestedCategory
        ? categories.filter(category => category.name === requestedCategory)
        : categories;
    if (!selectedCategories.length) throw new Error(`Unknown category: ${requestedCategory}`);
    for (const category of selectedCategories) {
        require(path.join(dataDirectory, category.file));
    }
    for (const category of selectedCategories) {
        await enrichCategory(category);
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});