"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eHentai = exports.capitalize = exports.parseMangaStatus = exports.eHentaiInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const eHentaiHelper_1 = require("./eHentaiHelper");
const eHentaiParser_1 = require("./eHentaiParser");
const eHentaiSettings_1 = require("./eHentaiSettings");
exports.eHentaiInfo = {
    version: "1.0.7",
    name: "E-Hentai",
    icon: "icon.png",
    author: "loik9081 | Jpuf",
    authorWebsite: "https://github.com/loik9081",
    description: "Extension to grab galleries from E-Hentai",
    contentRating: paperback_extensions_common_1.ContentRating.ADULT,
    websiteBaseURL: "https://e-hentai.org",
    sourceTags: [
        {
            text: '18+',
            type: paperback_extensions_common_1.TagType.RED
        },
    ],
};
const parseMangaStatus = (komgaStatus) => {
    switch (komgaStatus) {
        case "ENDED":
            return paperback_extensions_common_1.MangaStatus.COMPLETED;
        case "ONGOING":
            return paperback_extensions_common_1.MangaStatus.ONGOING;
        case "ABANDONED":
            return paperback_extensions_common_1.MangaStatus.ONGOING;
        case "HIATUS":
            return paperback_extensions_common_1.MangaStatus.ONGOING;
    }
    return paperback_extensions_common_1.MangaStatus.ONGOING;
};
exports.parseMangaStatus = parseMangaStatus;
const capitalize = (tag) => {
    return tag.replace(/^\w/, (c) => c.toUpperCase());
};
exports.capitalize = capitalize;
class eHentai extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 3,
            requestTimeout: 1.5e3,
            interceptor: {
                interceptRequest: async (request) => {
                    request.headers = {
                        ...(request.headers ?? {}),
                        ...{
                            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
                            'referer': 'https://e-hentai.org/'
                        }
                    };
                    request.cookies = [createCookie({ name: 'nw', value: '1', domain: 'https://e-hentai.org/' })];
                    return request;
                },
                interceptResponse: async (response) => { return response; }
            }
        });
        this.stateManager = createSourceStateManager({});
    }
    getMangaShareUrl(mangaId) {
        return `https://e-hentai.org/g/${mangaId}`;
    }
    async getSearchTags() {
        return [createTagSection({
                id: 'categories', label: 'Categories.', tags: [
                    createTag({ id: 'category:2', label: 'Doujinshi' }),
                    createTag({ id: 'category:4', label: 'Manga' }),
                    createTag({ id: 'category:8', label: 'Artist CG' }),
                    createTag({ id: 'category:16', label: 'Game CG' }),
                    createTag({ id: 'category:256', label: 'Non-H' }),
                    createTag({ id: 'category:32', label: 'Image Set' }),
                    createTag({ id: 'category:512', label: 'Western' }),
                    createTag({ id: 'category:64', label: 'Cosplay' }),
                    createTag({ id: 'category:128', label: 'Asian Porn' }),
                    createTag({ id: 'category:1', label: 'Misc' })
                ]
            })];
    }
    async supportsTagExclusion() {
        return true;
    }
    async getHomePageSections(sectionCallback) {
        for (const tag of (await this.getSearchTags())[0]?.tags ?? []) {
            const section = createHomeSection({
                id: tag.id,
                title: tag.label,
                view_more: true,
            });
            sectionCallback(section);
            (0, eHentaiHelper_1.getSearchData)('', 0, 1023 - parseInt(tag.id.substring(9)), this.requestManager, this.cheerio, this.stateManager).then(manga => {
                section.items = manga;
                sectionCallback(section);
            });
        }
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        const page = metadata.page ?? 0;
        let stopSearch = metadata?.stopSearch ?? false;
        if (stopSearch)
            return createPagedResults({
                results: [],
                metadata: {
                    stopSearch: true
                }
            });
        const results = await (0, eHentaiHelper_1.getSearchData)('', page, 1023 - parseInt(homepageSectionId.substring(9)), this.requestManager, this.cheerio, this.stateManager);
        if (results[results.length - 1]?.id == 'stopSearch') {
            results.pop();
            stopSearch = true;
        }
        return createPagedResults({
            results: results,
            metadata: {
                page: page + 1,
                stopSearch: stopSearch
            }
        });
    }
    async getSourceMenu() {
        return createSection({
            id: 'root',
            header: 'Settings',
            rows: async () => {
                return [
                    (0, eHentaiSettings_1.modifySearch)(this.stateManager),
                    (0, eHentaiSettings_1.resetSettings)(this.stateManager)
                ];
            }
        });
    }
    async getMangaDetails(mangaId) {
        console.log(mangaId);
        const data = (await (0, eHentaiHelper_1.getGalleryData)([mangaId], this.requestManager))[0];
        return createManga({
            id: mangaId,
            titles: [(0, eHentaiParser_1.parseTitle)(data.title), (0, eHentaiParser_1.parseTitle)(data.title_jpn)],
            image: data.thumb,
            rating: data.rating,
            status: paperback_extensions_common_1.MangaStatus.COMPLETED,
            langFlag: (0, eHentaiParser_1.parseLanguage)(data.tags),
            artist: (0, eHentaiParser_1.parseArtist)(data.tags),
            tags: (0, eHentaiParser_1.parseTags)([data.category, ...data.tags]),
            hentai: !(data.category == 'Non-H' || data.tags.includes('other:non-nude')),
            // relatedIds: [], // possibly parent_gid and/or first_gid
            lastUpdate: new Date(parseInt(data.posted) * 1000)
        });
    }
    async getChapters(mangaId) {
        const data = (await (0, eHentaiHelper_1.getGalleryData)([mangaId], this.requestManager))[0];
        return [createChapter({
                id: data.filecount,
                mangaId: mangaId,
                chapNum: 1,
                langCode: (0, eHentaiParser_1.parseLanguage)(data.tags),
                name: (0, eHentaiParser_1.parseTitle)(data.title),
                time: new Date(parseInt(data.posted) * 1000)
            })];
    }
    async getChapterDetails(mangaId, chapterId) {
        return createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            longStrip: false,
            pages: await (0, eHentaiParser_1.parsePages)(mangaId, parseInt(chapterId), this.requestManager, this.cheerio)
        });
    }
    async getSearchResults(query, metadata) {
        console.log(query);
        console.log(metadata);
        const page = metadata?.page ?? 0;
        let stopSearch = metadata?.stopSearch ?? false;
        if (stopSearch)
            return createPagedResults({
                results: [],
                metadata: {
                    stopSearch: true
                }
            });
        const includedCategories = query.includedTags?.filter(tag => tag.id.startsWith('category:'));
        const excludedCategories = query.excludedTags?.filter(tag => tag.id.startsWith('category:'));
        let categories = 0;
        if (includedCategories != undefined && includedCategories.length != 0)
            categories = includedCategories.map(tag => parseInt(tag.id.substring(9))).reduce((prev, cur) => prev - cur, 1023);
        else if (excludedCategories != undefined && excludedCategories.length != 0)
            categories = excludedCategories.map(tag => parseInt(tag.id.substring(9))).reduce((prev, cur) => prev + cur, 0);
        const results = await (0, eHentaiHelper_1.getSearchData)(query.title, page, categories, this.requestManager, this.cheerio, this.stateManager);
        let lastID;
        if (results[results.length - 1]?.mangaId == 'stopSearch') {
            results.pop();
            stopSearch = true;
        }
        else {
            lastID = results.slice(-1)[0]?.mangaId.split('/')[0];
            console.log(lastID);
        }
        return createPagedResults({
            results: results,
            metadata: {
                page: lastID,
                stopSearch: stopSearch
            }
        });
    }
}
exports.eHentai = eHentai;
//# sourceMappingURL=eHentai.js.map