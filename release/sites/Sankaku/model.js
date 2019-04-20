function completeImage(img) {
    if (!img.file_url || img.file_url.length < 5) {
        img.file_url = img.preview_url.replace("/preview/", "/");
    }
    img.file_url = img.file_url.replace(/([^s])\.sankakucomplex/, "$1s.sankakucomplex");
    return img;
}
export var source = {
    name: "Sankaku",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "order:change", "order:change_desc", "parent:none", "unlocked:rating"],
    forcedTokens: ["*"],
    tagFormat: {
        case: "lower",
        wordSeparator: "_",
    },
    searchFormat: {
        and: " ",
        or: {
            separator: " ",
            prefix: "~",
        },
        parenthesis: false,
        precedence: "or",
    },
    auth: {
        url: {
            type: "url",
            fields: [
                {
                    id: "pseudo",
                    key: "login",
                },
                {
                    id: "password",
                    type: "password",
                },
                {
                    key: "password_hash",
                    type: "hash",
                    hash: "sha1",
                    salt: "choujin-steiner--%password%--",
                },
                {
                    key: "appkey",
                    type: "hash",
                    hash: "sha1",
                    salt: "sankakuapp_%pseudo:lower%_Z5NE9YASej",
                },
            ],
            check: {
                type: "max_page",
                value: 50,
            },
        },
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            maxLimit: 200,
            search: {
                url: function (query, opts, previous) {
                    var baseUrl = opts.baseUrl
                        .replace("//chan.", "//capi-beta.")
                        .replace("//idol.", "//iapi.");
                    var pagePart = Grabber.pageUrl(query.page, previous, opts.loggedIn ? 1000 : 50, "page={page}", "prev={max}", "next={min-1}");
                    return baseUrl + "/post/index.json?" + pagePart + "&limit=" + opts.limit + "&tags=" + encodeURIComponent(query.search);
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var img = data_1[_i];
                        img.created_at = img.created_at["s"];
                        img.score = img.total_score;
                        images.push(completeImage(img));
                    }
                    return { images: images };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 20,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, opts.loggedIn ? 50 : 25, "page={page}", "prev={max}", "next={min-1}");
                        return "/post/index?" + pagePart + "&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    src = src.replace(/<div class="?popular-preview-post"?>[\s\S]+?<\/div>/g, "");
                    var searchImageCounts = Grabber.regexMatches('class="?tag-(?:count|type-none)"? title="Post Count: (?<count>[0-9,]+)"', src);
                    var lastPage = Grabber.regexToConst("page", '<span class="?current"?>\\s*(?<page>[0-9,]+)\\s*</span>\\s*>>\\s*</div>', src);
                    var wiki = Grabber.regexToConst("wiki", '<div id="?wiki-excerpt"?[^>]*>(?<wiki>.+?)</div>', src);
                    wiki = wiki ? wiki.replace(/href="\/wiki\/show\?title=([^"]+)"/g, 'href="$1"') : undefined;
                    return {
                        tags: Grabber.regexToTags('<li class="?[^">]*tag-type-(?<type>[^">]+)(?:|"[^>]*)>.*?<a href="[^"]+"[^>]*>(?<name>[^<]+)</a>.*?<span class="?post-count"?>(?<count>\\d+)</span>.*?</li>', src),
                        images: Grabber.regexToImages('<span[^>]* id="?p(?<id>\\d+)"?><a[^>]*><img[^>]* src="(?<preview_url>[^"]+/preview/\\w{2}/\\w{2}/(?<md5>[^.]+)\\.[^"]+|[^"]+/download-preview.png)" title="(?<tags>[^"]+)"[^>]+></a></span>', src).map(completeImage),
                        wiki: wiki,
                        pageCount: lastPage ? Grabber.countToInt(lastPage) : undefined,
                        imageCount: searchImageCounts.length === 1 ? Grabber.countToInt(searchImageCounts[0].count) : undefined,
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/post/show/" + id;
                },
                parse: function (src) {
                    return {
                        pools: Grabber.regexToPools('<div class="status-notice" id="pool\\d+">[^<]*Pool:[^<]*(?:<a href="/post/show/(?<previous>\\d+)" >&lt;&lt;</a>)?[^<]*<a href="/pool/show/(?<id>\\d+)" >(?<name>[^<]+)</a>[^<]*(?:<a href="/post/show/(?<next>\\d+)" >&gt;&gt;</a>)?[^<]*</div>', src),
                        tags: Grabber.regexToTags('<li class="?[^">]*tag-type-(?<type>[^">]+)(?:|"[^>]*)>.*?<a href="[^"]+"[^>]*>(?<name>[^<]+)</a>.*?<span class="?post-count"?>(?<count>\\d+)</span>.*?</li>', src),
                        imageUrl: Grabber.regexToConst("url", '<li>Original: <a href="(?<url>[^"]+)"|<a href="(?<url_2>[^"]+)">Save this file', src).replace(/&amp;/g, "&"),
                        createdAt: Grabber.regexToConst("date", '<a href="/\\?tags=date[^"]+" title="(?<date>[^"]+)">', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Sankaku") !== -1;
                },
            },
        },
    },
};
