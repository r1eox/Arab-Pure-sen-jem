const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const proverbFile = path.join(__dirname, '..', 'data', 'proverbs-questions.js');
const baseFile = path.join(__dirname, '..', 'data', 'question-bank.js');
const proverbCategory = String.fromCharCode(0x0627, 0x0643, 0x0645, 0x0644, 0x0020, 0x0627, 0x0644, 0x0645, 0x062b, 0x0644);
const familiarPhrases = [
    'الكلاب تعوي', 'لا يلدغ المؤمن', 'ما حك جلدك', 'إذا رأيت نيوب الليث',
    'خبي قرشك الأبيض', 'رب رمية من غير رام', 'مصائب قوم عند قوم فوائد',
    'يداك أوكتا وفوك نفخ', 'يُخاطبني السفيه', 'الوقت كالسيف', 'الصديق وقت الضيق',
    'من جد وجد', 'من زرع حصد', 'الطيور على أشكالها', 'الكتاب يقرأ من عنوانه',
    'درهم وقاية', 'سبق السيف العذل', 'على نفسها جنت براقش', 'وافق شن طبقة',
    'تجري الرياح بما لا تشتهي السفن', 'لكل جواد كبوة', 'خير الكلام ما قل ودل',
    'لسانك حصانك', 'عند جهينة الخبر اليقين', 'رب أخ لك لم تلده أمك',
    'من شب على شيء شاب عليه', 'إذا كان الكلام من فضة', 'عصفور في اليد',
    'القناعة كنز لا يفنى', 'اتق شر الحليم', 'الصبر مفتاح الفرج',
    'الجار قبل الدار', 'الباب الذي يأتيك منه الريح', 'إذا أردت أن تطاع',
    'أعط الخبز لخبازه', 'من راقب الناس مات هما', 'الحيطان لها آذان',
    'الغاية تبرر الوسيلة', 'المال السايب يعلم السرقة', 'السكوت علامة الرضا',
    'مصائب قوم عند', 'قيمة كل امريء ما يحسنه', 'كفى المرء فضلا أن تعد معايبه',
    'إذا أردت أن تكون قائدا', 'البخيل من مات من فقره', 'إذا غامرت في شرف مروم',
    'لكل شيء آفة من جنسه', 'يفوز باللذات كل مغامر', 'المرء بأصغريه قلبه ولسانه',
    'الصاحب ساحب', 'المرء عدو ما جهل', 'من طلب العلا سهر الليالي',
    'ومن يتهيب صعود الجبال', 'على قدر أهل العزم', 'تجري الأمور على قدر',
    'إذا أنت أكرمت الكريم', 'لا تنه عن خلق', 'ومن يجعل المعروف من دون عرضه',
    'إن الجبان حتفه من فوقه', 'يداك أوكتا وفوك نفخ', 'قطعت جهيزة قول كل خطيب',
    'أعط الخبز لخبازه', 'إذا كان حبيبك عسل', 'عصفور في اليد خير من', 'الحاجة أم الاختراع',
    'الصديق وقت الضيق', 'رب ضارة نافعة', 'من جد وجد ومن زرع حصد', 'لا تؤجل عمل اليوم إلى الغد',
    'يد واحدة لا تصفق', 'العقل السليم في الجسم السليم', 'من طلب العلا سهر الليالي',
    'الوقت كالسيف إن لم تقطعه قطعك', 'إذا كان الكلام من فضة فالسكوت من ذهب',
    'عصفور باليد ولا عشرة على الشجرة', 'عصفور باليد ولا', 'عشرة على الشجرة',
    'إذا غاب القط العب يا فار', 'إذا غاب القط', 'العب يا فار',
    'عصفور باليد ولا', 'إذا غاب القط', 'القشة التي قصمت ظهر البعير',
    'تلك القشة التي', 'عدو عاقل خير من صديق جاهل',
    'ذو العقل يشقى في النعيم بعقله', 'إذا حضر الماء بطل التيمم',
    'وافق شن طبقة', 'إن غدا لناظره قريب', 'الجار قبل الدار',
    'من تدخل فيما لا يعنيه', 'كل إناء بما فيه ينضح', 'رب أخ لم تلده أمك'
];
const uncommonWords = /(?:جهيزه|فوك نفخ|أوكتا|الهيجا|بكرة أبيهم|الزبا|الزبى|قراقوش|الدراري|الرايب|الزرايب|كْسْوَتْهُمْ|أَهْلِ بَيْتِـكِ)/;

function normalize(value) {
    return String(value || '').normalize('NFKD')
        .replace(/[\u064b-\u065f\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/[؟?!.,،؛:…]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('ar');
}

function stableTieBreaker(id) {
    let hash = 0;
    for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return hash / 0xffffffff;
}

function difficultyScore(row) {
    const question = normalize(row.question.replace(/^أكمل المثل:\s*/, ''));
    const answer = normalize(row.answer);
    const completePhrase = normalize(`${row.question} ${row.answer}`);
    const answerWords = answer.split(' ').filter(Boolean).length;
    const stemWords = question.split(' ').filter(Boolean).length;
    const familiar = familiarPhrases.some(phrase => completePhrase.includes(normalize(phrase)));
    let score = answerWords * 1.5 - Math.min(stemWords, 10) * 0.2;
    if (familiar) score -= 5;
    if (uncommonWords.test(row.question + ' ' + row.answer)) score += 4;
    if (/[\u0600-\u06ff]/.test(row.answer) && /[گڤپچ]/.test(row.answer)) score += 1.5;
    return score;
}

async function main() {
    require(proverbFile);
    require(baseFile);
    const legacyRows = window.questionBankSeed.filter(row => row.category === proverbCategory);
    const rows = [...legacyRows, ...window.proverbQuestionSeed];
    const ranked = rows.map(row => ({ row, score: difficultyScore(row) }))
        .sort((left, right) => left.score - right.score
            || stableTieBreaker(left.row.id) - stableTieBreaker(right.row.id));
    const report = {};
    for (const [index, item] of ranked.entries()) {
        const tier = Math.min(4, Math.floor(index * 5 / ranked.length));
        const points = (tier + 1) * 100;
        item.row.points = points;
        item.row.difficulty = ['سهل', 'سهل', 'متوسط', 'صعب', 'صعب'][tier];
        report[points] ||= { count: 0, answerWordTotal: 0, samples: [] };
        report[points].count++;
        report[points].answerWordTotal += normalize(item.row.answer).split(' ').filter(Boolean).length;
        if (report[points].samples.length < 5) {
            report[points].samples.push({ id: item.row.id, question: item.row.question, answer: item.row.answer });
        }
    }
    const legacyIds = new Set(legacyRows.map(row => row.id));
    const updatedLegacyRows = window.questionBankSeed.map(row => rows.find(proverb => proverb.id === row.id) || row);
    const updatedProverbs = rows.filter(row => !legacyIds.has(row.id));
    await fs.writeFile(proverbFile, `window.proverbQuestionSeed = ${JSON.stringify(updatedProverbs, null, 4)};\n`, 'utf8');
    await fs.writeFile(baseFile, `window.questionBankSeed = ${JSON.stringify(updatedLegacyRows, null, 4)};\n`, 'utf8');
    for (const tier of Object.values(report)) {
        tier.averageAnswerWords = Number((tier.answerWordTotal / tier.count).toFixed(2));
        delete tier.answerWordTotal;
    }
    console.log(JSON.stringify({ total: rows.length, legacy: legacyRows.length, generated: updatedProverbs.length, tiers: report }, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});