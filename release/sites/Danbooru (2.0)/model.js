function completeImage(img) {
    if (img.ext && img.ext[0] === ".") {
        img.ext = img.ext.substr(1);
    }
    if (!img.file_url || img.file_url.length < 5) {
        img.file_url = "/data/" + img.md5 + "." + (img.ext || "jpg");
    }
    else {
        img.file_url = img.file_url
            .replace("/preview/", "/")
            .replace("/ssd/", "/")
            .replace("/sample/[^.]*sample-", "/");
    }
    if (!img.sample_url || img.sample_url.length < 5) {
        img.sample_url = "/data/sample/sample-" + img.md5 + ".jpg";
    }
    if (!img.preview_url || img.preview_url.length < 5) {
        img.preview_url = "/data/preview/" + img.md5 + ".jpg";
    }
    return img;
}
export var source = {
    name: "Danbooru (2.0)",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "rating:s", "rating:q", "rating:e", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "status:any", "status:deleted", "status:active", "status:flagged", "status:pending", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "order:change", "order:change_desc", "parent:none", "unlocked:rating"],
    forcedTokens: ["filename"],
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
        httpBasic: {
            type: "http_basic",
            passwordType: "apiKey",
        },
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
        session: {
            type: "post",
            url: "/session",
            fields: [
                {
                    id: "pseudo",
                    key: "name",
                },
                {
                    id: "password",
                    key: "password",
                    type: "password",
                },
            ],
            check: {
                type: "cookie",
                key: "password_hash",
            },
        },
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            maxLimit: 200,
            search: {
                parseErrors: true,
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 1000, "{page}", "a{max}", "b{min}");
                        return "/posts.json?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var map = {
                        "created_at": "created_at",
                        "status": "status",
                        "source": "source",
                        "has_comments": "has_comments",
                        "file_url": "file_url",
                        "sample_url": "large_file_url",
                        "change": "change",
                        "sample_width": "sample_width",
                        "has_children": "has_children",
                        "preview_url": "preview_file_url",
                        "width": "image_width",
                        "md5": "md5",
                        "preview_width": "preview_width",
                        "sample_height": "sample_height",
                        "parent_id": "parent_id",
                        "height": "image_height",
                        "has_notes": "has_notes",
                        "creator_id": "uploader_id",
                        "file_size": "file_size",
                        "id": "id",
                        "preview_height": "preview_height",
                        "rating": "rating",
                        "tags": "tag_string",
                        "author": "uploader_name",
                        "score": "score",
                        "tags_artist": "tag_string_artist",
                        "tags_character": "tag_string_character",
                        "tags_copyright": "tag_string_copyright",
                        "tags_general": "tag_string_general",
                        "tags_meta": "tag_string_meta",
                    };
                    var data = JSON.parse(src);
                    if ("success" in data && data["success"] === false && "message" in data) {
                        return { error: data["message"] };
                    }
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var image = data_1[_i];
                        var img = Grabber.mapFields(image, map);
                        if (!img.md5 || img.md5.length === 0) {
                            continue;
                        }
                        images.push(completeImage(img));
                    }
                    return { images: images };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tags.json?limit=" + opts.limit + "&search[order]=" + query.order + "&page=" + query.page;
                },
                parse: function (src) {
                    var map = {
                        "id": "id",
                        "name": "name",
                        "count": "post_count",
                        "typeId": "category",
                        "related": "related_tags",
                    };
                    var data = JSON.parse(src);
                    var tags = [];
                    for (var _i = 0, data_2 = data; _i < data_2.length; _i++) {
                        var tag = data_2[_i];
                        var ret = Grabber.mapFields(tag, map);
                        if (ret.related) {
                            ret.related = ret.related.split(" ").filter(function (_, i) { return i % 2 === 0; });
                        }
                        tags.push(ret);
                    }
                    return { tags: tags };
                },
            },
        },
        xml: {
            name: "XML",
            auth: [],
            maxLimit: 200,
            search: {
                parseErrors: true,
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 1000, "{page}", "a{max}", "b{min}");
                        return "/posts.xml?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var map = {
                        "created_at": "created-at",
                        "status": "status",
                        "source": "source",
                        "has_comments": "has-comments",
                        "file_url": "file-url",
                        "sample_url": "large-file-url",
                        "change": "change",
                        "sample_width": "sample-width",
                        "has_children": "has-children",
                        "preview_url": "preview-file-url",
                        "width": "image-width",
                        "md5": "md5",
                        "preview_width": "preview-width",
                        "sample_height": "sample-height",
                        "parent_id": "parent-id",
                        "height": "image-height",
                        "has_notes": "has-notes",
                        "creator_id": "uploader-id",
                        "file_size": "file-size",
                        "id": "id",
                        "preview_height": "preview-height",
                        "rating": "rating",
                        "tags": "tag-string",
                        "author": "uploader-name",
                        "score": "score",
                        "tags_artist": "tag-string-artist",
                        "tags_character": "tag-string-character",
                        "tags_copyright": "tag-string-copyright",
                        "tags_general": "tag-string-general",
                        "tags_meta": "tag-string-meta",
                    };
                    var xml = Grabber.parseXML(src);
                    if ("result" in xml && "@attributes" in xml["result"] && "success" in xml["result"]["@attributes"] && xml["result"]["@attributes"]["success"] === "false") {
                        return { error: xml["result"]["#text"] };
                    }
                    var data = Grabber.makeArray(Grabber.typedXML(xml).posts.post);
                    var images = [];
                    for (var _i = 0, data_3 = data; _i < data_3.length; _i++) {
                        var image = data_3[_i];
                        var img = Grabber.mapFields(image, map);
                        if (!img.md5 || img.md5.length === 0) {
                            continue;
                        }
                        images.push(completeImage(img));
                    }
                    return { images: images };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tags.xml?limit=" + opts.limit + "&search[order]=" + query.order + "&page=" + query.page;
                },
                parse: function (src) {
                    var map = {
                        "id": "id",
                        "name": "name",
                        "count": "post-count",
                        "typeId": "category",
                        "related": "related-tags",
                    };
                    var data = Grabber.makeArray(Grabber.typedXML(Grabber.parseXML(src)).tags.tag);
                    var tags = [];
                    for (var _i = 0, data_4 = data; _i < data_4.length; _i++) {
                        var tag = data_4[_i];
                        var ret = Grabber.mapFields(tag, map);
                        if (ret.related) {
                            ret.related = ret.related.split(" ").filter(function (_, i) { return i % 2 === 0; });
                        }
                        tags.push(ret);
                    }
                    return { tags: tags };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            maxLimit: 200,
            search: {
                parseErrors: true,
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 1000, "{page}", "a{max}", "b{min}");
                        return "/posts?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src, statusCode) {
                    var match = src.match(/<div id="page">\s*<p>([^<]+)<\/p>\s*<\/div>/m);
                    if (match) {
                        return { error: match[1] };
                    }
                    var wiki = Grabber.regexToConst("wiki", '<div id="excerpt"(?:[^>]+)>(?<wiki>.+?)</div>', src);
                    wiki = wiki ? wiki.replace(/href="\/wiki_pages\/show_or_new\?title=([^"]+)"/g, 'href="$1"') : wiki;
                    return {
                        tags: Grabber.regexToTags('<li class="(?:category|tag-type)-(?<typeId>[^"]+)"[^>]*>(?:\\s*<a class="wiki-link" href="[^"]+">\\?</a>)?(?:\\s*<a[^>]* class="search-inc-tag">[^<]+</a>\\s*<a[^>]* class="search-exl-tag">[^<]+</a>)?\\s*<a class="search-tag"\\s+[^>]*href="[^"]+"[^>]*>(?<name>[^<]+)</a>\\s*<span class="post-count"[^>]*>(?<count>[^<]+)</span>\\s*</li>', src),
                        images: Grabber.regexToImages('<article[^>]* id="[^"]*" class="[^"]*"\\s+data-id="(?<id>[^"]*)"\\s+data-has-sound="[^"]*"\\s+data-tags="(?<tags>[^"]*)"\\s+data-pools="(?<pools>[^"]*)"(?:\\s+data-uploader="(?<author>[^"]*)")?\\s+data-approver-id="(?<approver>[^"]*)"\\s+data-rating="(?<rating>[^"]*)"\\s+data-width="(?<width>[^"]*)"\\s+data-height="(?<height>[^"]*)"\\s+data-flags="(?<flags>[^"]*)"\\s+data-parent-id="(?<parent_id>[^"]*)"\\s+data-has-children="(?<has_children>[^"]*)"\\s+data-score="(?<score>[^"]*)"\\s+data-views="[^"]*"\\s+data-fav-count="(?<fav_count>[^"]*)"\\s+data-pixiv-id="[^"]*"\\s+data-file-ext="(?<ext>[^"]*)"\\s+data-source="(?<source>[^"]*)"\\s+data-top-tagger="[^"]*"\\s+data-uploader-id="[^"]*"\\s+data-normalized-source="[^"]*"\\s+data-is-favorited="[^"]*"\\s+data-md5="(?<md5>[^"]*)"\\s+data-file-url="(?<file_url>[^"]*)"\\s+data-large-file-url="(?<sample_url>[^"]*)"\\s+data-preview-file-url="(?<preview_url>[^"]*)"', src).map(completeImage),
                        wiki: wiki,
                        pageCount: Grabber.regexToConst("page", '>(?<page>\\d+)</(?:a|span)></li><li[^<]*><(?:a|span)[^>]*>(?:&gt;&gt;|<i class="[^"]+"></i>)<|</i>\\s*<(?:a|span)[^>]*>(?<page_2>\\d+)<', src),
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/posts/" + id;
                },
                parse: function (src) {
                    return {
                        pools: Grabber.regexToPools('<div class="status-notice" id="pool\\d+">[^<]*Pool:[^<]*(?:<a href="/post/show/(?<previous>\\d+)" >&lt;&lt;</a>)?[^<]*<a href="/pool/show/(?<id>\\d+)" >(?<name>[^<]+)</a>[^<]*(?:<a href="/post/show/(?<next>\\d+)" >&gt;&gt;</a>)?[^<]*</div>', src),
                        tags: Grabber.regexToTags('<li class="category-(?<typeId>[^"]+)">(?:\\s*<a class="wiki-link" href="[^"]+">\\?</a>)?\\s*<a class="search-tag"\\s+[^>]*href="[^"]+"[^>]*>(?<name>[^<]+)</a>\\s*<span class="post-count">(?<count>[^<]+)</span>\\s*</li>', src),
                        imageUrl: Grabber.regexToConst("url", 'Size: <a href="(?<url>[^"]+?)(?:\\?download=1[^"]*)?"', src),
                    };
                },
            },
            tagTypes: {
                url: function () {
                    return "/tags";
                },
                parse: function (src) {
                    var contents = src.match(/<select[^>]* name="search\[category\]"[^>]*>([\s\S]+)<\/select>/);
                    if (!contents) {
                        return { error: "Parse error: could not find the tag type <select> tag" };
                    }
                    var results = Grabber.regexMatches('<option value="(?<id>\\d+)">(?<name>[^<]+)</option>', contents[1]);
                    var types = results.map(function (r) { return ({
                        id: r.id,
                        name: r.name.toLowerCase(),
                    }); });
                    return { types: types };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tags?limit=" + opts.limit + "&search[order]=" + query.order + "&page=" + query.page;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<tr[^>]*>\\s*<td[^>]*>(?<count>\\d+)</td>\\s*<td class="category-(?<typeId>\\d+)">\\s*<a[^>]+>\\?</a>\\s*<a[^>]+>(?<name>.+?)</a>\\s*</td>\\s*<td[^>]*>\\s*(?:<a href="/tags/(?<id>\\d+)/[^"]+">)?', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Running Danbooru v2") !== -1
                        || src.search(/Running Danbooru <a[^>]*>v2/) !== -1
                        || src.indexOf("https://github.com/danbooru/danbooru") !== -1;
                },
            },
        },
    },
};
