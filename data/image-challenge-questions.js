const roundPuzzleCounts = new Map();

window.imageChallengeQuestionSeed = [
    {
        id: 'image-challenge-pair-26', category: 'تحدي الصور', round: '16', points: 300,
        question: 'حل تركيب الصور', answer: 'بنتلي',
        image: 'تحدي الصور/دور 16/52.png', answerImage: 'تحدي الصور/دور 16/53.png',
        hint: 'علامة سيارات بريطانية فاخرة، وشعارها حرف مجنح.',
        options: ['بنتلي', 'رولز رويس', 'أستون مارتن', 'جاكوار']
    },
    {
        id: 'image-challenge-pair-27', category: 'تحدي الصور', round: '16', points: 200,
        question: 'حل تركيب الصور', answer: 'جمبري',
        image: 'تحدي الصور/دور 16/54.png', answerImage: 'تحدي الصور/دور 16/55.png',
        hint: 'مأكول بحري يُعرف أيضاً باسم الروبيان.',
        options: ['جمبري', 'سلطعون', 'حبار', 'محار']
    },
    {
        id: 'image-challenge-pair-28', category: 'تحدي الصور', round: '16', points: 200,
        question: 'حل تركيب الصور', answer: 'سامي الجابر',
        image: 'تحدي الصور/دور 16/56.png', answerImage: 'تحدي الصور/دور 16/57.png',
        hint: 'لاعب كرة قدم سعودي سابق، اشتهر مع نادي الهلال والمنتخب.',
        options: ['سامي الجابر', 'ماجد عبدالله', 'ياسر القحطاني', 'محمد نور']
    },
    {
        id: 'image-challenge-pair-29', category: 'تحدي الصور', round: '16', points: 400,
        question: 'حل تركيب الصور', answer: 'شانيل',
        image: 'تحدي الصور/دور 16/58.png', answerImage: 'تحدي الصور/دور 16/59.png',
        hint: 'دار أزياء فرنسية يرتبط شعارها بحرفي C متداخلين.',
        options: ['شانيل', 'ديور', 'غوتشي', 'برادا']
    },
    {
        id: 'image-challenge-pair-30', category: 'تحدي الصور', round: '16', points: 400,
        question: 'حل تركيب الصور', answer: 'كيليان مبابي', acceptedAnswers: ['كيليان مبابي', 'كليان امبابي', 'كيليان امبابي'],
        image: 'تحدي الصور/دور 16/60.png', answerImage: 'تحدي الصور/دور 16/61.png',
        hint: 'مهاجم فرنسي فاز بكأس العالم مع منتخب بلاده عام 2018.',
        options: ['كيليان مبابي', 'أنطوان غريزمان', 'كريم بنزيما', 'عثمان ديمبيلي']
    },
    {
        id: 'image-challenge-pair-31', category: 'تحدي الصور', round: '16', points: 100,
        question: 'حل تركيب الصور', answer: 'سبهللة',
        image: 'تحدي الصور/دور 16/62.png', answerImage: 'تحدي الصور/دور 16/63.png',
        hint: 'كلمة عامية تصف ترك الأمور بلا ترتيب أو تخطيط.',
        options: ['سبهللة', 'فوضى', 'عشوائية', 'إهمال']
    },
    {
        id: 'image-challenge-pair-32', category: 'تحدي الصور', round: '16', points: 100,
        question: 'حل تركيب الصور', answer: 'كراث',
        image: 'تحدي الصور/دور 16/64.png', answerImage: 'تحدي الصور/دور 16/65.png',
        hint: 'خضار من الفصيلة البصلية، تشبه أوراقه البصل الأخضر.',
        options: ['كراث', 'كرفس', 'سبانخ', 'جرجير']
    },
    {
        id: 'image-challenge-pair-33', category: 'تحدي الصور', round: '16', points: 500,
        question: 'حل تركيب الصور', answer: 'فولفو', acceptedAnswers: ['فولفو', 'Volvo'],
        image: 'تحدي الصور/دور 16/66.png', answerImage: 'تحدي الصور/دور 16/67.png',
        hint: 'شركة سيارات سويدية ارتبط اسمها بالاهتمام بسلامة المركبات.',
        options: ['فولفو', 'ساب', 'سكانيا', 'كوينيجسيج']
    },
    {
        id: 'image-challenge-pair-34', category: 'تحدي الصور', round: '16', points: 300,
        question: 'حل تركيب الصور', answer: 'لافندر',
        image: 'تحدي الصور/دور 16/68.png', answerImage: 'تحدي الصور/دور 16/69.png',
        hint: 'نبات عطري بنفسجي يُستخدم زيته في العطور.',
        options: ['لافندر', 'ياسمين', 'بابونج', 'إكليل الجبل']
    },
    {
        id: 'image-challenge-pair-35', category: 'تحدي الصور', round: '16', points: 300,
        question: 'حل تركيب الصور', answer: 'ناقوس',
        image: 'تحدي الصور/دور 16/70.png', answerImage: 'تحدي الصور/دور 16/71.png',
        hint: 'جرس كبير يُقرع للإعلان أو التنبيه.',
        options: ['ناقوس', 'صافرة', 'طبلة', 'مطرقة']
    },
    {
        id: 'image-challenge-pair-36', category: 'تحدي الصور', round: '16', points: 500,
        question: 'حل تركيب الصور', answer: 'بوستان',
        image: 'تحدي الصور/دور 16/72.png', answerImage: 'تحدي الصور/دور 16/73.png',
        hint: 'لفظ فارسي الأصل يُستخدم بمعنى حديقة أو بستان.',
        options: ['بوستان', 'بستان', 'بستاني', 'بوسطن']
    },
    {
        id: 'image-challenge-pair-37', category: 'تحدي الصور', round: '16', points: 400,
        question: 'حل تركيب الصور', answer: 'محايل عسير',
        image: 'تحدي الصور/دور 16/74.png', answerImage: 'تحدي الصور/دور 16/75.png',
        hint: 'محافظة سعودية تقع في منطقة عسير جنوب غربي المملكة.',
        options: ['محايل عسير', 'أبها', 'النماص', 'رجال ألمع']
    },
    {
        id: 'image-challenge-pair-38', category: 'تحدي الصور', round: '8', points: 300,
        question: 'حل تركيب الصور', answer: 'هجري',
        image: 'تحدي الصور/دور ال 8/77.png', answerImage: 'تحدي الصور/دور ال 8/78.png',
        hint: 'تقويم يبدأ حسابه من هجرة النبي محمد إلى المدينة.',
        options: ['هجري', 'ميلادي', 'شمسي', 'قمري']
    },
    {
        id: 'image-challenge-pair-39', category: 'تحدي الصور', round: '8', points: 100,
        question: 'حل تركيب الصور', answer: 'قشطة',
        image: 'تحدي الصور/دور ال 8/79.png', answerImage: 'تحدي الصور/دور ال 8/80.png',
        hint: 'منتج ألبان كثيف يُؤكل مع العسل أو الخبز.',
        options: ['قشطة', 'لبنة', 'زبدة', 'جبنة']
    },
    {
        id: 'image-challenge-pair-40', category: 'تحدي الصور', round: '8', points: 500,
        question: 'حل تركيب الصور', answer: 'صراع العروش',
        image: 'تحدي الصور/دور ال 8/81.png', answerImage: 'تحدي الصور/دور ال 8/82.png',
        hint: 'مسلسل فانتازيا شهير تدور أحداثه حول عائلات تتنافس على العرش الحديدي.',
        options: ['صراع العروش', 'الفايكنغ', 'ذا ويتشر', 'بيت التنين']
    },
    {
        id: 'image-challenge-pair-41', category: 'تحدي الصور', round: '8', points: 500,
        question: 'حل تركيب الصور', answer: 'لا جديد يُذكر ولا قديم يُعاد',
        image: 'تحدي الصور/دور ال 8/83.png', answerImage: 'تحدي الصور/دور ال 8/84.png',
        hint: 'عبارة تُقال عندما لا يتغير شيء عمّا كان عليه.',
        options: ['لا جديد يُذكر ولا قديم يُعاد', 'عاد بخفي حنين', 'على نفسها جنت براقش', 'سبق السيف العذل']
    },
    {
        id: 'image-challenge-pair-42', category: 'تحدي الصور', round: '8', points: 300,
        question: 'حل تركيب الصور', answer: 'هنقرستيشن',
        acceptedAnswers: ['هنقرستيشن', 'HungerStation'],
        image: 'تحدي الصور/دور ال 8/85.png', answerImage: 'تحدي الصور/دور ال 8/86.png',
        hint: 'تطبيق سعودي لطلب الطعام وتوصيله إلى المنزل.',
        options: ['هنقرستيشن', 'جاهز', 'مرسول', 'تويو']
    },
    {
        id: 'image-challenge-pair-43', category: 'تحدي الصور', round: '8', points: 400,
        question: 'حل تركيب الصور', answer: 'شيرازي',
        image: 'تحدي الصور/دور ال 8/87.png', answerImage: 'تحدي الصور/دور ال 8/88.png',
        hint: 'نسبة إلى مدينة إيرانية، ويُستخدم الاسم لوصف نوع من القطط طويلة الشعر.',
        options: ['شيرازي', 'سيامي', 'أنغورا', 'بنغالي']
    },
    {
        id: 'image-challenge-pair-44', category: 'تحدي الصور', round: '8', points: 400,
        question: 'حل تركيب الصور', answer: 'شامخ',
        image: 'تحدي الصور/دور ال 8/89.png', answerImage: 'تحدي الصور/دور ال 8/90.png',
        hint: 'صفة لمن يقف مرفوع الرأس وعزيز النفس.',
        options: ['شامخ', 'متواضع', 'خائف', 'حائر']
    },
    {
        id: 'image-challenge-pair-45', category: 'تحدي الصور', round: '8', points: 500,
        question: 'حل تركيب الصور', answer: 'رمزي بولتون',
        image: 'تحدي الصور/دور ال 8/91.png', answerImage: 'تحدي الصور/دور ال 8/92.png',
        hint: 'شخصية شريرة في مسلسل «صراع العروش» ارتبطت بعائلة بولتون.',
        options: ['رمزي بولتون', 'جون سنو', 'تيريون لانيستر', 'جايمي لانيستر']
    },
    {
        id: 'image-challenge-pair-46', category: 'تحدي الصور', round: '8', points: 400,
        question: 'حل تركيب الصور', answer: 'بنادول',
        image: 'تحدي الصور/دور ال 8/93.png', answerImage: 'تحدي الصور/دور ال 8/94.png',
        hint: 'اسم تجاري شائع لدواء مسكن وخافض للحرارة يحتوي على باراسيتامول.',
        options: ['بنادول', 'بروفين', 'فولتارين', 'أسبيرين']
    },
    {
        id: 'image-challenge-pair-47', category: 'تحدي الصور', round: '8', points: 300,
        question: 'حل تركيب الصور', answer: 'بلجيكا',
        image: 'تحدي الصور/دور ال 8/95.png', answerImage: 'تحدي الصور/دور ال 8/96.png',
        hint: 'دولة أوروبية عاصمتها بروكسل، وتشتهر بالشوكولاتة والوافل.',
        options: ['بلجيكا', 'هولندا', 'النمسا', 'سويسرا']
    },
    {
        id: 'image-challenge-pair-48', category: 'تحدي الصور', round: '8', points: 200,
        question: 'حل تركيب الصور', answer: 'خطوة جمل',
        image: 'تحدي الصور/دور ال 8/97.png', answerImage: 'تحدي الصور/دور ال 8/98.png',
        hint: 'تعبير يصف مسافة طويلة يقطعها الجمل في خطوه.',
        options: ['خطوة جمل', 'خطوة فرس', 'رأس جبل', 'ذراع بحر']
    },
    {
        id: 'image-challenge-pair-49', category: 'تحدي الصور', round: '8', points: 200,
        question: 'حل تركيب الصور', answer: 'بريدة',
        image: 'تحدي الصور/دور ال 8/99.png', answerImage: 'تحدي الصور/دور ال 8/100.png',
        hint: 'مدينة سعودية هي مقر إمارة منطقة القصيم.',
        options: ['بريدة', 'عنيزة', 'الرس', 'حائل']
    },
    {
        id: 'image-challenge-pair-50', category: 'تحدي الصور', round: '4', points: 100,
        question: 'حل تركيب الصور', answer: 'ليس كل شيء يلمع ذهباً',
        image: 'تحدي الصور/دور ال 4/1.png', answerImage: 'تحدي الصور/دور ال 4/2.png'
    },
    {
        id: 'image-challenge-pair-51', category: 'تحدي الصور', round: '4', points: 200,
        question: 'حل تركيب الصور', answer: 'سعرات حرارية',
        image: 'تحدي الصور/دور ال 4/3.png', answerImage: 'تحدي الصور/دور ال 4/4.png'
    },
    {
        id: 'image-challenge-pair-52', category: 'تحدي الصور', round: '4', points: 300,
        question: 'حل تركيب الصور', answer: 'داود الشريان',
        image: 'تحدي الصور/دور ال 4/5.png', answerImage: 'تحدي الصور/دور ال 4/6.png'
    },
    {
        id: 'image-challenge-pair-53', category: 'تحدي الصور', round: '4', points: 400,
        question: 'حل تركيب الصور', answer: 'أمازون',
        image: 'تحدي الصور/دور ال 4/7.png', answerImage: 'تحدي الصور/دور ال 4/8.png'
    },
    {
        id: 'image-challenge-pair-54', category: 'تحدي الصور', round: '4', points: 500,
        question: 'حل تركيب الصور', answer: 'سامسونج',
        image: 'تحدي الصور/دور ال 4/9.png', answerImage: 'تحدي الصور/دور ال 4/10.png'
    },
    {
        id: 'image-challenge-pair-55', category: 'تحدي الصور', round: 'final', points: 100,
        question: 'حل تركيب الصور', answer: 'روكستار',
        image: 'تحدي الصور/النهائي/11.png', answerImage: 'تحدي الصور/النهائي/12.png'
    },
    {
        id: 'image-challenge-pair-56', category: 'تحدي الصور', round: 'final', points: 200,
        question: 'حل تركيب الصور', answer: 'أبو ربيعة',
        image: 'تحدي الصور/النهائي/13.png', answerImage: 'تحدي الصور/النهائي/14.png'
    },
    {
        id: 'image-challenge-pair-57', category: 'تحدي الصور', round: 'final', points: 300,
        question: 'حل تركيب الصور', answer: 'أمازون',
        image: 'تحدي الصور/النهائي/15.png', answerImage: 'تحدي الصور/النهائي/16.png'
    },
    {
        id: 'image-challenge-pair-58', category: 'تحدي الصور', round: 'final', points: 400,
        question: 'حل تركيب الصور', answer: 'سن كولا',
        image: 'تحدي الصور/النهائي/17.png', answerImage: 'تحدي الصور/النهائي/18.png'
    },
    {
        id: 'image-challenge-pair-59', category: 'تحدي الصور', round: 'final', points: 500,
        question: 'حل تركيب الصور', answer: 'بابريكا',
        image: 'تحدي الصور/النهائي/19.png', answerImage: 'تحدي الصور/النهائي/20.png'
    }
].map(question => {
    const round = String(question.round || '');
    const puzzleNumber = (roundPuzzleCounts.get(round) || 0) + 1;
    roundPuzzleCounts.set(round, puzzleNumber);
    return {
        ...question,
        question: `حل تركيب الصور - اللغز ${String(puzzleNumber).padStart(2, '0')}`
    };
});