const fs = require('node:fs/promises');
const path = require('node:path');

global.window = {};

const directory = path.join(__dirname, '..', 'data');
const groups = [
    { category: 'أفلام', file: 'movies-questions.js', global: 'moviesQuestionSeed' },
    { category: 'مسلسلات', file: 'series-questions.js', global: 'seriesQuestionSeed' },
    { category: 'جغرافيا', file: 'geography-questions.js', global: 'geographyQuestionSeed' },
    { category: 'كورة ورياضة', file: 'sports-questions.js', global: 'sportsQuestionSeed' },
    { category: 'سيارات', file: 'cars-questions.js', global: 'carsQuestionSeed' }
];

const legacyOptions = {
    'movies-legacy-titanic': ['تيتانيك', 'بن هور', 'سيد الخواتم: عودة الملك', 'ويست سايد ستوري'],
    'series-legacy-money-heist': ['La Casa de Papel', 'Breaking Bad', 'Dark', 'Lupin'],
    'series-legacy-anime-platform': ['Crunchyroll', 'Netflix', 'Funimation', 'HIDIVE'],
    'geography-legacy-everest': ['إيفرست', 'كي 2', 'كانغشينجونغا', 'لوتسي'],
    'sports-legacy-team-size': ['11 لاعباً', '10 لاعبين', '12 لاعباً', '9 لاعبين'],
    'sports-legacy-world-cup': ['البرازيل', 'ألمانيا', 'إيطاليا', 'الأرجنتين'],
    'sports-legacy-real-madrid': ['ريال مدريد', 'برشلونة', 'أتلتيكو مدريد', 'إشبيلية'],
    'cars-legacy-audi': ['Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen'],
    'cars-legacy-ferrari': ['Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo'],
    'cars-legacy-porsche': ['ألمانيا', 'إيطاليا', 'فرنسا', 'المملكة المتحدة']
};

const extraDistractors = {
    'movies:legacy-title': ['تيتانيك', 'Inception', 'Interstellar', 'The Godfather', 'Avatar'],
    'series:legacy-title': ['La Casa de Papel', 'Breaking Bad', 'Dark', 'Lupin', 'Sherlock'],
    'series:platform': ['Crunchyroll', 'Netflix', 'Funimation', 'HIDIVE', 'Disney+'],
    'geography:legacy-largest-country': ['روسيا', 'كندا', 'الصين', 'الولايات المتحدة', 'البرازيل'],
    'geography:legacy-capital': ['كانبرا', 'سيدني', 'ملبورن', 'بيرث', 'أديلايد'],
    'geography:legacy-mountain': ['إيفرست', 'كي 2', 'كانغشينجونغا', 'لوتسي', 'ماكالو'],
    'sports:legacy-team-size': ['11 لاعباً', '10 لاعبين', '12 لاعباً', '9 لاعبين', '8 لاعبين'],
    'sports:legacy-champion': ['البرازيل', 'ألمانيا', 'إيطاليا', 'الأرجنتين', 'فرنسا'],
    'sports:legacy-club': ['ريال مدريد', 'برشلونة', 'أتلتيكو مدريد', 'إشبيلية', 'فالنسيا'],
    'cars:legacy-manufacturer': ['Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Porsche'],
    'cars:legacy-country': ['ألمانيا', 'إيطاليا', 'فرنسا', 'المملكة المتحدة', 'اليابان']
};

function normalize(value) {
    return String(value || '').toLocaleLowerCase('ar')
        .replace(/[؟?!.,،:;"'`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function initialHint(answer) {
    const first = String(answer || '').trim()[0];
    return first ? `قرينة إضافية: تبدأ الإجابة بحرف «${first}».` : '';
}

function factText(type, answer) {
    const labels = {
        director: 'المخرج', genre: 'التصنيف', country: 'بلد الإنتاج',
        language: 'اللغة الأصلية', cast: 'أحد أفراد الطاقم', year: 'سنة العرض',
        creator: 'المبتكر'
    };
    return `${labels[type] || 'معلومة أخرى'}: ${answer}`;
}

function screenHint(row, category) {
    const legacyHints = {
        'movies-legacy-inception': 'مخرجه صاحب ثلاثية فارس الظلام وفيلم Tenet، ويشتهر ببناء قصص الخيال العلمي المعقدة.',
        'movies-legacy-titanic': 'بطولة ليوناردو دي كابريو وكيت وينسلت، ويحكي عن رحلة السفينة التي اصطدمت بجبل جليدي عام 1912.',
        'movies-legacy-interstellar': 'أخرج أيضاً Inception وثلاثية فارس الظلام، وتدور أفلامه كثيراً حول الزمن والفضاء.',
        'series-legacy-money-heist': 'بطولة ألبارو مورتي، واشتهر فيه فريق يرتدي الأحمر ويستخدم أقنعة مستوحاة من سلفادور دالي.',
        'series-legacy-breaking-bad': 'تدور الأحداث حول والتر وايت وجيسي بينكمان في مدينة ألباكركي بولاية نيومكسيكو.',
        'series-legacy-anime-platform': 'اسم المنصة يبدأ بكلمة إنجليزية تعني «مقرمش»، وهي مخصصة للأنمي والمانغا.'
    };
    if (legacyHints[row.id]) return legacyHints[row.id];
    const facts = row.clueFacts || {};
    const preferred = category === 'أفلام'
        ? ['genre', 'country', 'year', 'language', 'director', 'cast']
        : ['genre', 'country', 'year', 'language', 'creator', 'cast'];
    const clues = preferred
        .filter(type => type !== row.factType && facts[type] && normalize(facts[type]) !== normalize(row.answer))
        .map(type => factText(type, facts[type]));
    if (clues.length >= 2) return `من قرائن العمل: ${clues.slice(0, 2).join('؛ ')}.`;
    if (clues.length === 1) return `من قرائن العمل: ${clues[0]}. ${initialHint(row.answer)}`;
    return `${row.imageAlt || 'العمل'} من الأعمال المعروفة في فئته. ${initialHint(row.answer)}`;
}

function geographyHint(row) {
    const question = normalize(row.question);
    const answer = normalize(row.answer);
    if (row.id === 'geography-legacy-russia') return 'تمتد أراضيها عبر قارتي أوروبا وآسيا، ولها أكبر مساحة بين دول العالم.';
    if (row.id === 'geography-legacy-australia') return 'عاصمة داخلية مخططة اختير موقعها بين سيدني وملبورن.';
    if (row.id === 'geography-legacy-everest') return 'تقع في الهيمالايا على الحدود بين نيبال والصين، ويتجاوز ارتفاعها 8,800 متر.';

    if (question.includes('لغة') || question.includes('اللغات')) {
        const families = [
            [/الفرنسية|الإسبانية|الإيطالية|البرتغالية|الرومانية|الكتالونية/, 'تنتمي إلى عائلة اللغات الرومانسية المتحدرة من اللاتينية.'],
            [/الإنجليزية|الألمانية|الهولندية|السويدية|النرويجية|الدنماركية|الآيسلندية/, 'تنتمي إلى الفرع الجرماني من اللغات الهندوأوروبية.'],
            [/الروسية|البولندية|الأوكرانية|التشيكية|السلوفاكية|البلغارية|الكرواتية|السلوفينية|المونتنغرية/, 'تنتمي إلى عائلة اللغات السلافية.'],
            [/اليابانية/, 'تكتب بمزيج من الكانجي ومقاطع الهيراغانا والكاتاكانا.'],
            [/الأمهرية/, 'لغة سامية تكتب بنظام أبوجيدا المشتق من الجعزية.'],
            [/العربية/, 'لغة سامية تكتب من اليمين إلى اليسار، وتنتشر في الشرق الأوسط وشمال أفريقيا.'],
            [/التركية|الأذرية/, 'تنتمي إلى عائلة لغوية واسعة تنتشر من الأناضول إلى آسيا الوسطى، وتستخدم تناغماً صوتياً.'],
            [/الفنلندية|المجرية|الإستونية/, 'تنتمي إلى الفرع الفيني الأوغري، لا إلى اللغات السلافية المجاورة.'],
            [/اليونانية|اللغة اليونانية/, 'لها أبجدية خاصة وتاريخ كتابي موثق يمتد لآلاف السنين.'],
            [/اللاتينية/, 'لغة قديمة أصبحت أساساً لعدد من اللغات الأوروبية الحديثة.'],
            [/الإندونيسية/, 'تُعرف باسم باهاسا إندونيسيا وتستخدم الأبجدية اللاتينية.'],
            [/Putonghua|الصينية/, 'هي الصيغة المعيارية المبنية على لهجة بكين وتكتب بالحروف الصينية.']
        ];
        return families.find(([pattern]) => pattern.test(answer))?.[1]
            || `تُتحدث في الدولة المذكورة، واسمها يبدأ بحرف «${String(row.answer).trim()[0]}».`;
    }

    if (question.includes('قارة')) {
        const clues = {
            'أمريكا الشمالية': 'تضم كندا والولايات المتحدة والمكسيك، وتمتد بين المحيطين الأطلسي والهادئ.',
            'أمريكا الجنوبية': 'تضم جبال الأنديز وغابة الأمازون، ومعظمها في النصف الجنوبي.',
            'آسيا': 'هي الأكبر مساحة وسكاناً، وتمتد من شرق المتوسط إلى المحيط الهادئ.',
            'أوروبا': 'تقع غرب آسيا، وتضم دولاً كثيرة متقاربة المساحة.',
            'إفريقيا': 'يعبر خط الاستواء وسطها، وفي شمالها الصحراء الكبرى.',
            'أوقيانوسيا': 'تضم أستراليا ونيوزيلندا ودولاً وجزراً كثيرة في المحيط الهادئ.',
            'جزيرة أوقيانوسيا': 'تقع الدولة ضمن جزر المحيط الهادئ إلى الشمال الشرقي من أستراليا.'
        };
        return clues[row.answer] || initialHint(row.answer);
    }

    if (question.includes('عملة') || question.includes('العملات')) {
        if (answer === 'يورو') return 'عملة موحدة تتعامل بها دول كثيرة أعضاء في الاتحاد الأوروبي.';
        if (answer.includes('جنيه إسترليني')) return 'عملة بريطانية قديمة، ورمزها الشائع £.';
        if (answer.includes('رنمينبي')) return 'العملة الصينية الرسمية، ووحدتها الأساسية تسمى اليوان.';
        if (answer.includes('روبل')) return 'عملة مستخدمة في أجزاء من أوروبا الشرقية وشمال آسيا.';
        if (answer.includes('كرونة')) return 'اسم عملة تستخدمه عدة دول شمالية أو وسط أوروبية.';
        if (answer.includes('فرنك')) return 'اسم نقدي تاريخي ما زال مستخدماً في بعض الدول والمناطق.';
        if (answer.includes('دينار')) return 'اسم عملة شائع في عدد من الدول العربية والبلقانية.';
        if (answer.includes('دولار')) return 'عملة اسمها مشترك بين دول متعددة، لذا انتبه إلى الدولة في السؤال.';
        return `تبدأ العملة بحرف «${String(row.answer).trim()[0]}»، وتُستخدم رسمياً في الدولة المذكورة.`;
    }

    if (question.includes('عاصمة')) {
        return `هي مقر الحكومة الوطنية، وتقع داخل دولة «${row.imageAlt || 'الدولة المذكورة'}»؛ وليست بالضرورة أكبر مدنها. ${initialHint(row.answer)}`;
    }
    return initialHint(row.answer);
}

function sportHint(answer) {
    const value = normalize(answer);
    const clues = [
        [/ملاكمة/, 'رياضة نزال فردي تعتمد على اللكمات داخل الحلبة والقفازات.'],
        [/بياثلون/, 'تجمع بين التزلج الريفي لمسافات طويلة والرماية بالبندقية.'],
        [/كرة المضرب|تنس/, 'تُلعب بمضرب وكرة فوق شبكة، فردياً أو بين زوجين.'],
        [/مبارزة/, 'رياضة نزال بالسيف، ولها أسلحة أولمبية بثلاثة أنواع.'],
        [/شطرنج/, 'لعبة ذهنية على رقعة من 64 مربعاً، وهدفها حصر ملك الخصم.'],
        [/فروسية|ترويض الخيول/, 'تُمارس على ظهور الخيل، وتتضمن منافسات قفز الحواجز أو الترويض.'],
        [/سيارات|دراجات نارية/, 'رياضة محركات تعتمد على السرعة والتحكم بمركبة آلية على مضمار.'],
        [/كرة القدم$/, 'رياضة جماعية يحاول فيها اللاعبون تسجيل الأهداف بالقدم، باستثناء الحارس.'],
        [/كمال الأجسام/, 'رياضة تعتمد على بناء العضلات وتقييم التناسق والتحديد العضلي.'],
        [/كرة اليد/, 'رياضة صالات سريعة، يسجل فيها اللاعبون برمي الكرة إلى مرمى الخصم.'],
        [/كانو|كاياك|تجديف/, 'رياضة مائية تستخدم قارباً ومجاديف، وتقام سباقاتها في مسارات مائية.'],
        [/ألعاب القوى|وثب|عدو|رمي/, 'تندرج ضمن مسابقات المضمار والميدان مثل الجري والقفز والرمي.'],
        [/دراجات|ركوب الدراجات/, 'تعتمد على دراجة، وتتنوع بين سباقات الطريق والمضمار والطرق الوعرة.'],
        [/تزلج|التزحلف|المزلجات|الزلاجة|القفز التزلجي/, 'رياضة شتوية تُمارس على الثلج أو الجليد باستخدام الزلاجات.'],
        [/رفع الأثقال/, 'رياضة أولمبية يحاول فيها المتنافس رفع أثقل وزن ممكن في رفعتين.'],
        [/جودو/, 'فن قتالي ياباني أولمبي يعتمد على الرميات والتثبيت، لا اللكمات.'],
        [/رماية|نبالة/, 'رياضة دقة وتصويب؛ إحداهما تستخدم القوس والأخرى سلاحاً نارياً.'],
        [/كرة الطائرة/, 'يتبادل فريقان الكرة فوق شبكة، ويُمنع إمساكها أو حملها.'],
        [/جمباز/, 'رياضة أداء بدني على أجهزة أو بساط، تقيس القوة والمرونة والدقة.'],
        [/كرة الطاولة/, 'تُلعب بمضربين صغيرين وكرة خفيفة فوق طاولة مقسومة بشبكة.'],
        [/هوكي الجليد/, 'رياضة فرق على الجليد، يستخدم اللاعبون عصياً لدفع قرص نحو المرمى.'],
        [/سباحة/, 'رياضة سباق في الماء، ولها أساليب مثل الحرة والفراشة والظهر.'],
        [/ركوب الأمواج/, 'يوازن الرياضي نفسه على لوح فوق موج البحر.'],
        [/غولف/, 'رياضة فردية يحاول فيها اللاعب إدخال كرة صغيرة في حفر بأقل عدد من الضربات.'],
        [/كرة الماء/, 'لعبة جماعية في المسبح، ويُسجل الهدف برمي الكرة في مرمى عائم.'],
        [/كرة القدم الأمريكية/, 'رياضة فرق تستخدم كرة بيضوية وتعتمد على التقدم بها نحو منطقة التسجيل.'],
        [/طيران شراعي/, 'نشاط جوي يستخدم مظلة خاصة للإقلاع والتحليق اعتماداً على التيارات الهوائية.'],
        [/مصارعة/, 'رياضة نزال يحاول فيها المتنافس تثبيت كتفي الخصم أو إخراجه من وضع السيطرة.'],
        [/كمال الأجسام/, 'تُقيّم فيها الكتلة العضلية والتناسق والتحديد أمام لجنة تحكيم.'],
        [/كانو|كاياك/, 'سباق مائي بقارب فردي أو جماعي ومجداف، ويقام في المياه الهادئة أو المنحدرات.'],
        [/ترويض الخيول/, 'عرض فرسي دقيق ينفذ فيه الحصان حركات محددة استجابة لإشارات الفارس.'],
        [/مزلجات|زلاجة/, 'سباق شتوي على مسار جليدي متعرج، وقد يشارك فيه فرد أو فريق.'],
        [/وثب طويل/, 'مسابقة ميدان يركض فيها اللاعب ثم يقفز من لوح إلى حفرة رملية.'],
        [/طاولة/, 'تُلعب بمضرب صغير وكرة خفيفة فوق سطح مستطيل مقسوم بشبكة.'],
        [/قوى/, 'مجموعة مسابقات مضمار وميدان تشمل الجري والقفز والرمي.'],
        [/تزلج ألبي/, 'سباقات انحدار على منحدرات جبلية ثلجية مع بوابات يمر المتسابق بينها.'],
        [/تزلج فني/, 'أداء حركات وقفزات ودورانات على الجليد مع تقييم فني.'],
        [/تزلج سريع/, 'سباق على مضمار جليدي بيضوي، ويتنافس فيه اللاعبون على الزمن.'],
        [/تزلج|التزحلف/, 'رياضة شتوية تعتمد على الانزلاق فوق الثلج باستخدام زلاجات.'],
        [/دراجة نارية/, 'سباق بمركبات ذات عجلتين على حلبة، ويتطلب توازناً ومناورة عالية.'],
        [/دراجات|الدراجات/, 'سباق بدراجة هوائية؛ وقد يقام على الطريق أو مضمار مائل.'],
        [/رفع الأثقال/, 'يحاول الرباع رفع أكبر وزن ممكن في رفعتَي الخطف والنتر.'],
        [/تجديف/, 'يتحرك القارب باستخدام المجاديف، ويتطلب تزامن حركة أفراد الفريق.'],
        [/رماية/, 'رياضة تصويب إلى هدف ثابت أو متحرك باستخدام سلاح مخصص.'],
        [/نبالة/, 'يعتمد المتنافس فيها على قوس وسهام لإصابة مركز الهدف من مسافة محددة.'],
        [/كرة اليد/, 'رياضة صالات يسجل فيها الفريق برمي الكرة باليد في مرمى الخصم.'],
        [/كرة الطائرة/, 'يتبادل فريقان الكرة فوق شبكة، ويحاول كل منهما إسقاطها في ملعب الآخر.'],
        [/بياثلون/, 'يجمع بين التزلج الريفي لمسافات طويلة والتوقف للتصويب بالبندقية.'],
        [/مبارزة/, 'نزال أولمبي بالسيف؛ تحتسب النقاط عند لمس منطقة الهدف بسلاح المبارزة.'],
        [/فروسية/, 'تقام منافساتها على ظهر الخيل، ومن أشهرها قفز الحواجز والترويض.'],
        [/غولف/, 'يُضرب فيها قرص صغير بعصا نحو حفر موزعة في ملعب واسع.'],
        [/جودو/, 'فن قتالي ياباني أولمبي يعتمد على الرميات والتثبيت والإخضاع.'],
        [/شطرنج/, 'لعبة استراتيجية على رقعة 8×8، وهدفها تهديد ملك الخصم بما يسمى كش مات.']
    ];
    const legacyClues = {
        '11 لاعباً': 'يتكون الفريق من عشرة لاعبين ميدانيين وحارس مرمى واحد.',
        'البرازيل': 'منتخب من أمريكا الجنوبية، ويلقّب فريقه بلقب يرتبط بلون قميصه الأصفر.',
        'ريال مدريد': 'نادٍ من العاصمة الإسبانية، ملعبه سانتياغو برنابيو.'
    };
    if (legacyClues[answer]) return legacyClues[answer];
    return clues.find(([pattern]) => pattern.test(value))?.[1]
        || `تبدأ الرياضة بحرف «${String(answer).trim()[0]}»، وتُمارس ضمن منافسات منظمة.`;
}

function carHint(row) {
    const manufacturer = normalize(row.answer);
    if (row.factType === 'legacy-country' || row.id === 'cars-legacy-porsche') {
        return 'مقر الشركة في شتوتغارت، وهي مدينة صناعية في جنوب غرب أوروبا.';
    }
    const makers = [
        [/أودي|^audi$/, 'علامة ألمانية ترتبط بأربع حلقات متشابكة، وتنتمي إلى مجموعة فولكسفاغن.'],
        [/بي ام دبليو|bmw/, 'شركة ألمانية تشتهر بشعار دائري أزرق وأبيض وسيارات السيدان الرياضية.'],
        [/مرسيدس|mercedes|دايملر/, 'شركة نشأت في شتوتغارت، ونجمتها الثلاثية شعارها المعروف.'],
        [/فولكسفاغن|volkswagen/, 'اسمها الألماني يعني حرفياً «سيارة الشعب».'],
        [/تويوتا|toyota/, 'شركة يابانية تنتج كورولا وكامري، وشعارها ثلاث بيضويات متداخلة.'],
        [/هوندا|honda/, 'شركة يابانية تصنع السيارات والدراجات النارية، وشعار سياراتها حرف H.'],
        [/نيسان|nissan/, 'شركة يابانية، ومن أشهر طرازاتها باترول وسنترا.'],
        [/مازدا|mazda/, 'شركة يابانية يظهر شعارها الحديث كجناحين داخل شكل بيضوي.'],
        [/هيونداي|hyundai/, 'شركة كورية جنوبية؛ شعارها حرف H مائل داخل بيضوية.'],
        [/كيا|kia/, 'شركة كورية جنوبية تشارك مجموعتها الأم مع هيونداي.'],
        [/فورد|ford/, 'شركة أمريكية قديمة، وشعارها كتابة بيضاء داخل بيضوية زرقاء.'],
        [/جنرال موتورز|general motors|gmc|شفروليه|chevrolet|كاديلاك|cadillac/, 'مجموعة أمريكية كبرى لصناعة السيارات، تأسست في أوائل القرن العشرين.'],
        [/فيراري|ferrari/, 'علامة إيطالية للسيارات الرياضية، وشعارها حصان أسود على خلفية صفراء.'],
        [/لامبورغيني|lamborghini/, 'شركة إيطالية لسيارات فائقة الأداء، وشعارها ثور ذهبي.'],
        [/بورشه|porsche/, 'شركة ألمانية مقرها شتوتغارت، وشعارها درع يتوسطه حصان.'],
        [/فيات|fiat/, 'شركة إيطالية اشتهرت تاريخياً بالسيارات الصغيرة وشعارها اختصار لاسمها الصناعي.'],
        [/رينو|renault/, 'مصنّع فرنسي شعاره شكل مُعين، وله تاريخ طويل في سباقات السيارات.'],
        [/بيجو|peugeot/, 'مصنّع فرنسي شعاره أسد، وبدأ تاريخه الصناعي قبل السيارات.'],
        [/سيتروين|citroen/, 'شركة فرنسية شعارها شيفرونان متراكبان.'],
        [/فولفو|volvo/, 'علامة سويدية ارتبط اسمها بالسلامة، وشعارها الدائري مع سهم.'],
        [/سوبارو|subaru/, 'شركة يابانية شعارها مجموعة نجوم، وتشتهر بالدفع الرباعي ومحركات بوكسر.'],
        [/سوزوكي|suzuki/, 'شركة يابانية تصنع السيارات والدراجات النارية، وشعارها حرف S أحمر.'],
        [/تسلا|tesla/, 'شركة أمريكية للسيارات الكهربائية سميت تيمناً بمخترع ومهندس كهرباء.'],
        [/شيري|chery/, 'مصنّع سيارات صيني تأسس في مدينة ووهو.'],
        [/دودج|dodge/, 'علامة أمريكية ارتبطت بالشاحنات والسيارات العضلية.'],
        [/سكودا|skoda/, 'شركة تشيكية أصبحت ضمن مجموعة فولكسفاغن.'],
        [/جاكوار|jaguar/, 'علامة بريطانية فاخرة، وشعارها حيوان يقفز.'],
        [/أستون مارتن|aston martin/, 'شركة بريطانية رياضية ارتبطت بسيارات جيمس بوند.'],
        [/بوغاتي|bugatti/, 'علامة فائقة الأداء جذورها فرنسية، ومن أشهر سياراتها فيرون وشيرون.'],
        [/داسيا|dacia/, 'مصنّع روماني يعمل اليوم ضمن مجموعة رينو.'],
        [/ميتسوبيشي|mitsubishi/, 'شركة يابانية شعارها ثلاثة معينات حمراء.'],
        [/هونداي|hyundai/, 'شركة كورية جنوبية؛ شعارها حرف H مائل داخل بيضوية.']
    ];
    const clue = makers.find(([pattern]) => pattern.test(manufacturer))?.[1];
    return clue || `اسم الشركة المصنّعة يبدأ بحرف «${String(row.answer).trim()[0]}»؛ ركّز على العلامة التي بنت طراز السؤال.`;
}

function contextualHint(row, category) {
    if (category === 'أفلام' || category === 'مسلسلات') {
        const otherFacts = Object.entries(row.clueFacts || {})
            .filter(([type, value]) => type !== row.factType && value && normalize(value) !== normalize(row.answer))
            .slice(0, 2);
        if (otherFacts.length) {
            const names = { director: 'المخرج', genre: 'التصنيف', country: 'بلد الإنتاج', language: 'لغة العمل', cast: 'أحد الممثلين', year: 'سنة الإصدار', creator: 'المبتكر' };
            const facts = otherFacts.map(([type, value]) => `${names[type] || 'معلومة أخرى'} ${value}`).join('، ');
            return `قرائن عن العمل: ${facts}.`;
        }
        return screenHint(row, category);
    }
    if (category === 'جغرافيا') return geographyHint(row);
    if (category === 'كورة ورياضة') return sportHint(row.answer);
    if (category === 'سيارات') return carHint(row);
    return initialHint(row.answer);
}

function classify(row, category) {
    if (row.factType) return row.factType;
    const question = normalize(row.question);
    if (category === 'أفلام') {
        if (row.id === 'movies-legacy-titanic') return 'legacy-title';
        if (question.includes('مخرج') || question.includes('من إخراج')) return 'director';
        return 'director';
    }
    if (category === 'مسلسلات') {
        if (row.id === 'series-legacy-money-heist') return 'legacy-title';
        if (row.id === 'series-legacy-anime-platform') return 'platform';
        if (question.includes('دولة')) return 'country';
        return 'year';
    }
    if (category === 'جغرافيا') {
        if (row.id === 'geography-legacy-russia') return 'legacy-largest-country';
        if (row.id === 'geography-legacy-australia') return 'legacy-capital';
        if (row.id === 'geography-legacy-everest') return 'legacy-mountain';
        if (question.includes('عاصمة')) return 'capital';
        if (question.includes('قارة')) return 'continent';
        if (question.includes('عملة') || question.includes('العملات')) return 'currency';
        if (question.includes('لغة') || question.includes('اللغات')) return 'language';
    }
    if (category === 'كورة ورياضة') {
        if (row.id === 'sports-legacy-team-size') return 'legacy-team-size';
        if (row.id === 'sports-legacy-world-cup') return 'legacy-champion';
        if (row.id === 'sports-legacy-real-madrid') return 'legacy-club';
        return 'sport';
    }
    if (category === 'سيارات') {
        if (row.id === 'cars-legacy-porsche') return 'legacy-country';
        return 'legacy-manufacturer';
    }
    return 'general';
}

function hintFor(category, type) {
    const hints = {
        'أفلام': {
            director: 'تذكّر الأعمال الأخرى التي أخرجها صاحب الرؤية السينمائية.',
            genre: 'ركّز على طبيعة الأحداث والإيقاع العام للفيلم.',
            country: 'فكّر في بلد الإنتاج، لا في موقع تصوير مشهد واحد.',
            language: 'المقصود لغة الحوار الأصلية قبل الدبلجة.',
            cast: 'تذكّر الوجوه البارزة التي شاركت في العمل.',
            year: 'حاول ربط الفيلم بالفترة الزمنية التي عُرض فيها أول مرة.',
            'legacy-title': 'تذكّر اسم العمل المرتبط بالسفينة الشهيرة.'
        },
        'مسلسلات': {
            year: 'حاول تذكّر الفترة التي بدأ فيها عرض المسلسل لأول مرة.',
            genre: 'فكّر في طبيعة القصة والأحداث المتكررة في العمل.',
            country: 'انظر إلى بلد الإنتاج، لا إلى مكان وقوع الأحداث فقط.',
            cast: 'تذكّر أحد الوجوه التي ظهرت في أدوار المسلسل.',
            creator: 'ابحث عن صاحب الفكرة الأصلية للعمل.',
            language: 'المقصود لغة الحوار الأصلية للمسلسل.',
            country: 'فكّر في بلد الإنتاج، لا إلى مكان وقوع الأحداث فقط.',
            'legacy-title': 'تذكّر اسم المسلسل الإسباني المرتبط بخطة السرقة.',
            platform: 'إنها خدمة متخصصة في عرض الأنمي.'
        },
        'جغرافيا': {
            capital: 'استحضر موقع الدولة على الخريطة ومقر حكومتها.',
            continent: 'حدد موقعها بالنسبة إلى القارات الكبرى.',
            currency: 'فكّر في العملة المتداولة رسمياً في المعاملات اليومية.',
            language: 'ركّز على اللغة المعتمدة في مؤسسات الدولة.',
            country: 'تمتد هذه الدولة عبر قارتي أوروبا وآسيا.',
            'legacy-mountain': 'تقع القمة في سلسلة جبال الهيمالايا.'
        },
        'كورة ورياضة': {
            sport: 'فكّر في الرياضة التي ارتبط بها هذا الرياضي في المنافسات.',
            'legacy-team-size': 'لا تنسَ احتساب حارس المرمى ضمن لاعبي الفريق.',
            'legacy-champion': 'المنتخب من أمريكا الجنوبية وحقق اللقب عدة مرات.',
            'legacy-club': 'نادٍ من مدريد يشتهر بزيه الأبيض.'
        },
        'سيارات': {
            legacy: 'ابحث عن الشركة التي طورت الطراز، لا بلد تصنيعه.',
            'legacy-manufacturer': 'ابحث عن العلامة التي ينتمي إليها هذا الطراز.',
            'legacy-country': 'الشركة معروفة بسياراتها الرياضية ومقرها في أوروبا.'
        }
    };
    return hints[category]?.[type] || hints[category]?.legacy || 'استعن باسم الموضوع والسياق العام للسؤال لتضييق الاحتمالات.';
}

function seededIndex(seed, limit) {
    let hash = 0;
    for (const character of String(seed)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return limit ? hash % limit : 0;
}

function buildPools(rows, category) {
    const pools = new Map();
    for (const row of rows) {
        const type = classify(row, category);
        row.factType = type;
        const poolType = type.startsWith('legacy-') ? type : type;
        if (!pools.has(poolType)) pools.set(poolType, []);
        pools.get(poolType).push(row.answer);
    }
    for (const [key, values] of Object.entries(extraDistractors)) {
        const [groupName, type] = key.split(':');
        if (groups.some(group => group.global.startsWith(groupName) && category === group.category)) {
            if (!pools.has(type)) pools.set(type, []);
            pools.get(type).push(...values);
        }
    }
    return pools;
}

function makeOptions(row, pools, category, index) {
    const normalizedAnswer = normalize(row.answer);
    const typePool = pools.get(row.factType) || [];
    const categoryPool = [...pools.values()].flat();
    const candidates = [...new Set([...typePool, ...(extraDistractors[`${groups.find(group => group.category === category).global.replace('QuestionSeed', '')}:${row.factType}`] || []), ...categoryPool])]
        .filter(value => normalize(value) && normalize(value) !== normalizedAnswer);
    if (candidates.length < 3) throw new Error(`${row.id}: fewer than 3 distractors for ${row.factType}`);
    const start = seededIndex(row.id, candidates.length);
    const distractors = [];
    for (let offset = 0; offset < candidates.length && distractors.length < 3; offset++) {
        const candidate = candidates[(start + offset) % candidates.length];
        if (normalize(candidate) === normalizedAnswer || distractors.some(value => normalize(value) === normalize(candidate))) continue;
        distractors.push(candidate);
    }
    if (distractors.length !== 3) throw new Error(`${row.id}: could not produce 3 unique distractors`);
    const choices = [...distractors, row.answer];
    const shift = seededIndex(`${row.id}-order`, choices.length);
    return choices.map((_, position) => choices[(position + shift) % choices.length]);
}

async function main() {
    for (const group of groups) require(path.join(directory, group.file));
    for (const group of groups) {
        const rows = window[group.global];
        const pools = buildPools(rows, group.category);
        const usage = {};
        for (const [index, row] of rows.entries()) {
            row.hint = contextualHint(row, group.category);
            row.options = makeOptions(row, pools, group.category, index);
            usage[row.factType] = (usage[row.factType] || 0) + 1;
        }
        await fs.writeFile(path.join(directory, group.file), `window.${group.global} = ${JSON.stringify(rows, null, 4)};\n`, 'utf8');
        console.log(`${group.category}: ${rows.length} questions enriched; ${JSON.stringify(usage)}`);
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});