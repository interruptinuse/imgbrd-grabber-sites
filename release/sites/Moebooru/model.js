function completeImage(img) {
    if (!img.file_url && img.file_url.length < 5) {
        img.file_url = img.preview_url.replace("/preview/", "/");
    }
    return img;
}
export var source = {
    name: "Moebooru",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "status:any", "status:deleted", "status:active", "status:flagged", "status:pending", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "order:change", "order:change_desc", "parent:none", "unlocked:rating"],
    forcedTokens: [],
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
            ],
        },
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            maxLimit: 1000,
            search: {
                url: function (query, opts, previous) {
                    var pagePart = Grabber.pageUrl(query.page, previous, -1, "{page}");
                    return "/post/index.json?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var image = data_1[_i];
                        images.push(completeImage(image));
                    }
                    return { images: images };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tag.json?page=" + query.page;
                },
                parse: function (src) {
                    var map = {
                        "id": "id",
                        "name": "name",
                        "count": "count",
                        "typeId": "type",
                    };
                    var data = JSON.parse(src);
                    var tags = [];
                    for (var _i = 0, data_2 = data; _i < data_2.length; _i++) {
                        var tag = data_2[_i];
                        tags.push(Grabber.mapFields(tag, map));
                    }
                    return { tags: tags };
                },
            },
        },
        xml: {
            name: "XML",
            auth: [],
            maxLimit: 1000,
            search: {
                url: function (query, opts, previous) {
                    var pagePart = Grabber.pageUrl(query.page, previous, -1, "{page}");
                    return "/post/index.xml?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                },
                parse: function (src) {
                    var parsed = Grabber.parseXML(src);
                    var data = Grabber.makeArray(parsed.posts.post);
                    var images = [];
                    for (var _i = 0, data_3 = data; _i < data_3.length; _i++) {
                        var dta = data_3[_i];
                        var image = "@attributes" in dta && "id" in dta["@attributes"] ? dta["@attributes"] : dta;
                        images.push(completeImage(image));
                    }
                    return {
                        images: images,
                        imageCount: parsed.posts["@attributes"]["count"],
                    };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tag.xml?page=" + query.page;
                },
                parse: function (src) {
                    var map = {
                        "id": "id",
                        "name": "name",
                        "count": "count",
                        "typeId": "type",
                    };
                    var data = Grabber.makeArray(Grabber.parseXML(src).tags.tag);
                    var tags = [];
                    for (var _i = 0, data_4 = data; _i < data_4.length; _i++) {
                        var dta = data_4[_i];
                        var tag = "@attributes" in dta && "id" in dta["@attributes"] ? dta["@attributes"] : dta;
                        tags.push(Grabber.mapFields(tag, map));
                    }
                    return { tags: tags };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            maxLimit: 1000,
            search: {
                url: function (query, opts, previous) {
                    var pagePart = Grabber.pageUrl(query.page, previous, -1, "{page}");
                    return "/post/index?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                },
                parse: function (src) {
                    var images = Grabber.regexToImages("Post\\.register\\((?<json>\\{.+?\\})\\);?", src).map(completeImage);
                    var pageCount = Grabber.regexToConst("page", '>(?<page>\\d+)</a>\\s*<a class="next_page" rel="next" href="', src);
                    if (pageCount === undefined && /<div id="paginator">\s*<\/div>/.test(src)) {
                        pageCount = 1;
                    }
                    return {
                        tags: Grabber.regexToTags('<li class="(?:[^"]* )?tag-type-(?<type>[^" ]+)"[^>]*>(?:[^<]*<a[^>]*>[^<]*</a>)*[^<]*<a[^>]*>(?<name>[^<]*)</a>[^<]*<span[^>]*>(?<count>\\d+)k?</span>[^<]*</li>', src),
                        images: images,
                        pageCount: pageCount,
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
                        tags: Grabber.regexToTags('<li class="(?:[^"]* )?tag-type-(?<type>[^" ]+)"[^>]*>(?:[^<]*<a[^>]*>[^<]*</a>)*[^<]*<a[^>]*>(?<name>[^<]*)</a>[^<]*<span[^>]*>(?<count>\\d+)k?</span>[^<]*</li>', src),
                    };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tag?page=" + query.page;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<tr[^>]*>\\s*<td[^>]*>(?<count>\\d+)</td>\\s*<td[^>]*>\\s*<a.+?>\\?</a>\\s*<a[^>]+>(?<name>.*?)</a>\\s*</td>\\s*<td>(?<type>.+?)</td>\\s*<td[^>]*><a href="/tag/edit/(?<id>\\d+)">', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Running Moebooru") !== -1;
                },
            },
        },
    },
};
