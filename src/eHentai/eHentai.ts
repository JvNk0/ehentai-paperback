import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    Manga,
    MangaStatus,
    PagedResults,
    Request,
    RequestManager,
    Response,
    SearchRequest,
    Section,
    Source,
    SourceInfo,
    SourceManga,
    TagSection,
    TagType,
} from "paperback-extensions-common";
import { getGalleryData, getSearchData } from "./eHentaiHelper";
import { parseArtist, parseLanguage, parsePages, parseTags, parseTitle } from "./eHentaiParser";
import { modifySearch, resetSettings } from "./eHentaiSettings";

export const eHentaiInfo: SourceInfo = {
    version: "1.0.25",
    name: "E-Hentai",
    icon: "icon.png",
    author: "loik9081 | Jpuf",
    authorWebsite: "https://github.com/loik9081",
    description: "Extension to grab galleries from E-Hentai",
    contentRating: ContentRating.ADULT,
    websiteBaseURL: "https://e-hentai.org",
    sourceTags: [
        {
            text: '18+',
            type: TagType.RED
        },
    ],
};


export const parseMangaStatus = (komgaStatus: string): MangaStatus => {
    switch (komgaStatus) {
        case "ENDED":
            return MangaStatus.COMPLETED;
        case "ONGOING":
            return MangaStatus.ONGOING;
        case "ABANDONED":
            return MangaStatus.ONGOING;
        case "HIATUS":
            return MangaStatus.ONGOING;
    }
    return MangaStatus.ONGOING;
};

export const capitalize = (tag: string): string => {
    return tag.replace(/^\w/, (c) => c.toUpperCase());
};

export class eHentai extends Source {
    override requestManager: RequestManager = createRequestManager({
        requestsPerSecond: 15,
        requestTimeout: 1.5e3,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
                        'referer': 'https://e-hentai.org/'
                    }
                }
                request.cookies = [createCookie({ name: 'nw', value: '1', domain: 'https://e-hentai.org/' })]
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => { return response }
        }
    })

    stateManager = createSourceStateManager({});

    override getMangaShareUrl(mangaId: string): string {
        return `https://e-hentai.org/g/${mangaId}`;
    }

    override async getSearchTags(): Promise<TagSection[]> {
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
        })]
    }

    override async supportsTagExclusion(): Promise<boolean> {
        return true
    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        for (const tag of (await this.getSearchTags())[0]?.tags ?? []) {
            const section = createHomeSection({
                id: tag.id,
                title: tag.label,
                view_more: true,
            });
            sectionCallback(section);
            getSearchData('', 0, 1023 - parseInt(tag.id.substring(9)), this.requestManager, this.cheerio, this.stateManager).then(manga => {
                section.items = manga
                sectionCallback(section)
            })
        }
    }

    override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page = metadata.page ?? 0;
        let stopSearch = metadata?.stopSearch ?? false
        if(stopSearch) return createPagedResults({
            results: [],
            metadata: {
                stopSearch: true
            }
        })

        const results = await getSearchData('', page, 1023 - parseInt(homepageSectionId.substring(9)), this.requestManager, this.cheerio, this.stateManager)
        if (results[results.length - 1]?.id == 'stopSearch') {
            results.pop()
            stopSearch = true
        }

        return createPagedResults({
            results: results,
            metadata: {
                page: page + 1,
                stopSearch: stopSearch
            }
        })
    }

    override async getSourceMenu(): Promise<Section> {
        return createSection({
            id: 'root',
            header: 'Settings',
            rows: async () => {
                return [
                    modifySearch(this.stateManager),
                    resetSettings(this.stateManager)
                ]
            }
        })
    }
    
    override async getMangaDetails(mangaId: string): Promise<SourceManga | Manga> {
        console.log(`[getMangaDetails]: mangaID:${mangaId}`)
        const data = (await getGalleryData([mangaId], this.requestManager))[0]

        return createManga({
            id: mangaId,
            titles: [parseTitle(data.title), parseTitle(data.title_jpn)],
            image: data.thumb,
            rating: data.rating,
            status: MangaStatus.COMPLETED,
            langFlag: parseLanguage(data.tags),
            artist: parseArtist(data.tags),
            tags: parseTags([data.category, ...data.tags]),
            hentai: !(data.category == 'Non-H' || data.tags.includes('other:non-nude')),
            desc: `Pages ${data.filecount ?? 0}`,
            // relatedIds: [], // possibly parent_gid and/or first_gid
            lastUpdate: new Date(parseInt(data.posted) * 1000)
        })
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        const data = (await getGalleryData([mangaId], this.requestManager))[0]

        return [createChapter({
            id: data.filecount,
            mangaId: mangaId,
            chapNum: 1,
            langCode: parseLanguage(data.tags),
            name: parseTitle(data.title),
            time: new Date(parseInt(data.posted) * 1000)
        })]
    }
    
    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const pages = await parsePages(
            mangaId, 
            parseInt(chapterId), 
            this.requestManager, 
            this.cheerio
        );
        console.warn(pages)
        return createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            longStrip: false, // Change to true if other:webtoon?
            pages: pages 
        })
    }

    override async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        // console.log(query)
        // console.log(metadata)
        const page = metadata?.page ?? 0
        let stopSearch = metadata?.stopSearch ?? false
        if(stopSearch) return createPagedResults({
            results: [],
            metadata: {
                stopSearch: true
            }
        })

        const includedCategories = query.includedTags?.filter(tag => tag.id.startsWith('category:'))
        const excludedCategories = query.excludedTags?.filter(tag => tag.id.startsWith('category:'))
        let categories = 0
        if (includedCategories != undefined && includedCategories.length != 0) categories = includedCategories.map(tag => parseInt(tag.id.substring(9))).reduce((prev, cur) => prev - cur, 1023)
        else if (excludedCategories != undefined && excludedCategories.length != 0) categories = excludedCategories.map(tag => parseInt(tag.id.substring(9))).reduce((prev, cur) => prev + cur, 0)

        const results = await getSearchData(query.title, page, categories, this.requestManager, this.cheerio, this.stateManager)
        let lastID;
        if ((results[results.length - 1] as any)?.mangaId == 'stopSearch') {
            results.pop()
            stopSearch = true
        } else {
            lastID = (results.slice(-1)[0] as any)?.mangaId.split('/')[0]
            // console.log(`[getSearchResults]: lastID:${lastID}`);
        }
        

        return createPagedResults({
            results: results,
            metadata: {
                page: lastID,
                stopSearch: stopSearch
            }
        })
    }
}
