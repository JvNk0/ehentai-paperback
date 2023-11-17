"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTitle = exports.parseTags = exports.parsePages = exports.parseLanguage = exports.parseArtist = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const parseArtist = (tags) => {
    const artist = tags.filter(tag => tag.startsWith('artist:')).map(tag => tag.substring(7));
    const cosplayer = tags.filter(tag => tag.startsWith('cosplayer:')).map(tag => tag.substring(10));
    if (artist.length != 0)
        return artist[0];
    else if (cosplayer.length != 0)
        return cosplayer[0];
    else
        return undefined;
};
exports.parseArtist = parseArtist;
const parseLanguage = (tags) => {
    const languageTags = tags.filter(tag => tag.startsWith('language:') && tag != 'language:translated').map(tag => tag.substring(9));
    if (languageTags.length == 0)
        return paperback_extensions_common_1.LanguageCode.JAPANESE;
    switch (languageTags[0]) {
        case 'bengali':
            return paperback_extensions_common_1.LanguageCode.BENGALI;
            break;
        case 'bulgarian':
            return paperback_extensions_common_1.LanguageCode.BULGARIAN;
            break;
        case 'chinese':
            return paperback_extensions_common_1.LanguageCode.CHINEESE;
            break;
        case 'czech':
            return paperback_extensions_common_1.LanguageCode.CZECH;
            break;
        case 'danish':
            return paperback_extensions_common_1.LanguageCode.DANISH;
            break;
        case 'dutch':
            return paperback_extensions_common_1.LanguageCode.DUTCH;
            break;
        case 'english':
            return paperback_extensions_common_1.LanguageCode.ENGLISH;
            break;
        case 'finnish':
            return paperback_extensions_common_1.LanguageCode.FINNISH;
            break;
        case 'french':
            return paperback_extensions_common_1.LanguageCode.FRENCH;
            break;
        case 'german':
            return paperback_extensions_common_1.LanguageCode.GERMAN;
            break;
        case 'greek':
            return paperback_extensions_common_1.LanguageCode.GREEK;
            break;
        case 'hungarian':
            return paperback_extensions_common_1.LanguageCode.HUNGARIAN;
            break;
        case 'gujarati':
        case 'nepali':
        case 'punjabi':
        case 'tamil':
        case 'telugu':
        case 'urdu':
            return paperback_extensions_common_1.LanguageCode.INDIAN;
            break;
        case 'indonesian':
            return paperback_extensions_common_1.LanguageCode.INDONESIAN;
            break;
        case 'persian':
            return paperback_extensions_common_1.LanguageCode.IRAN;
            break;
        case 'italian':
            return paperback_extensions_common_1.LanguageCode.ITALIAN;
            break;
        case 'korean':
            return paperback_extensions_common_1.LanguageCode.KOREAN;
            break;
        case 'mongolian':
            return paperback_extensions_common_1.LanguageCode.MONGOLIAN;
            break;
        case 'norwegian':
            return paperback_extensions_common_1.LanguageCode.NORWEGIAN;
            break;
        case 'cebuano':
        case 'tagalog':
            return paperback_extensions_common_1.LanguageCode.PHILIPPINE;
            break;
        case 'polish':
            return paperback_extensions_common_1.LanguageCode.POLISH;
            break;
        case 'portuguese':
            return paperback_extensions_common_1.LanguageCode.PORTUGUESE;
            break;
        case 'romanian':
            return paperback_extensions_common_1.LanguageCode.ROMANIAN;
            break;
        case 'russian':
            return paperback_extensions_common_1.LanguageCode.RUSSIAN;
            break;
        case 'sanskrit':
            return paperback_extensions_common_1.LanguageCode.SANSKRIT;
            break;
        case 'spanish':
            return paperback_extensions_common_1.LanguageCode.SPANISH;
            break;
        case 'thai':
            return paperback_extensions_common_1.LanguageCode.THAI;
            break;
        case 'turkish':
            return paperback_extensions_common_1.LanguageCode.TURKISH;
            break;
        case 'ukrainian':
            return paperback_extensions_common_1.LanguageCode.UKRAINIAN;
            break;
        case 'vietnamese':
            return paperback_extensions_common_1.LanguageCode.VIETNAMESE;
            break;
        case 'welsh':
            return paperback_extensions_common_1.LanguageCode.WELSH;
            break;
    }
    return paperback_extensions_common_1.LanguageCode.UNKNOWN;
};
exports.parseLanguage = parseLanguage;
async function getImage(url, requestManager, cheerio) {
    const request = createRequestObject({
        url: url,
        method: 'GET'
    });
    const data = await requestManager.schedule(request, 1);
    const $ = cheerio.load(data.data);
    return $('#img').attr('src') ?? '';
}
async function parsePage(id, page, requestManager, cheerio) {
    const request = createRequestObject({
        url: `https://e-hentai.org/g/${id}/?p=${page}`,
        method: 'GET'
    });
    const data = await requestManager.schedule(request, 1);
    const $ = cheerio.load(data.data);
    const pageArr = [];
    const pageDivArr = $('div.gdtm').toArray();
    for (const page of pageDivArr) {
        pageArr.push(getImage($('a', page).attr('href') ?? '', requestManager, cheerio));
    }
    return Promise.all(pageArr);
}
async function parsePages(id, pageCount, requestManager, cheerio) {
    const pageArr = [];
    for (let i = 0; i <= pageCount / 40; i++) {
        pageArr.push(parsePage(id, i, requestManager, cheerio));
    }
    return Promise.all(pageArr).then(pages => pages.reduce((prev, cur) => [...prev, ...cur], []));
}
exports.parsePages = parsePages;
const namespaceHasTags = (namespace, tags) => { return tags.filter(tag => tag.startsWith(`${namespace}:`)).length != 0; };
const createTagSectionForNamespace = (namespace, tags) => { return createTagSection({ id: namespace, label: namespace, tags: tags.filter(tag => tag.startsWith(`${namespace}:`)).map(tag => createTag({ id: tag, label: tag.substring(namespace.length + 1) })) }); };
const parseTags = (tags) => {
    const tagSectionArr = [];
    switch (tags.shift()) {
        case 'Doujinshi':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:2', label: 'Doujinshi' })] }));
            break;
        case 'Manga':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:4', label: 'Manga' })] }));
            break;
        case 'Artist CG':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:8', label: 'Artist CG' })] }));
            break;
        case 'Game CG':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:16', label: 'Game CG' })] }));
            break;
        case 'Non-H':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:256', label: 'Non-H' })] }));
            break;
        case 'Image Set':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:32', label: 'Image Set' })] }));
            break;
        case 'Western':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:512', label: 'Western' })] }));
            break;
        case 'Cosplay':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:64', label: 'Cosplay' })] }));
            break;
        case 'Asian Porn':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:128', label: 'Asian Porn' })] }));
            break;
        case 'Misc':
            tagSectionArr.push(createTagSection({ id: 'categories', label: 'categories', tags: [createTag({ id: 'category:1', label: 'Misc' })] }));
            break;
    }
    if (namespaceHasTags('character', tags))
        tagSectionArr.push(createTagSectionForNamespace('character', tags));
    if (namespaceHasTags('female', tags))
        tagSectionArr.push(createTagSectionForNamespace('female', tags));
    if (namespaceHasTags('male', tags))
        tagSectionArr.push(createTagSectionForNamespace('male', tags));
    if (namespaceHasTags('mixed', tags))
        tagSectionArr.push(createTagSectionForNamespace('mixed', tags));
    if (namespaceHasTags('other', tags))
        tagSectionArr.push(createTagSectionForNamespace('other', tags));
    if (namespaceHasTags('parody', tags))
        tagSectionArr.push(createTagSectionForNamespace('parody', tags));
    return tagSectionArr;
};
exports.parseTags = parseTags;
const parseTitle = (title) => {
    return title.replaceAll(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
};
exports.parseTitle = parseTitle;
//# sourceMappingURL=eHentaiParser.js.map