function completeImage(img) {
    var resourcesURL = "https://static1.e621.net/data";
    var md5PartOne = img.md5.slice(0, 2);
    var md5PartTwo = img.md5.slice(2, 4);
    if (img.ext && img.ext[0] === ".") {
        img.ext = img.ext.substr(1);
    }
    if (!img.file_url || img.file_url.length < 5) {
        img.file_url = resourcesURL + "/" + md5PartOne + "/" + md5PartTwo + "/" + img.md5 + "." + (img.ext || "jpg");
    }
    else {
        img.file_url = img.file_url
            .replace("/preview/", "/")
            .replace("/ssd/", "/")
            .replace("/sample/[^.]*sample-", "/");
    }
    if (!img.sample_url || img.sample_url.length < 5) {
        img.sample_url = resourcesURL + "/sample/" + md5PartOne + "/" + md5PartTwo + "/" + img.md5 + "." + (img.ext || "jpg");
    }
    if (!img.preview_url || img.preview_url.length < 5) {
        img.preview_url = resourcesURL + "/preview/" + md5PartOne + "/" + md5PartTwo + "/" + img.md5 + "." + (img.ext || "jpg");
    }
    return img;
}
export var source = {
    name: "E621",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "rating:s", "rating:q", "rating:e", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "status:any", "status:deleted", "status:active", "status:flagged", "status:pending", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "order:change", "order:change_desc", "parent:none", "unlocked:rating"],
    forcedTokens: ["filename"],
    tagFormat: {
        case: "lower",
        wordSeparator: "_",
    },
    searchFormat: {
        and: " ",
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
                    id: "apiKey",
                    key: "api_key",
                    type: "text",
                },
            ],
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
                        var pagePart = Grabber.pageUrl(query.page, previous, 750, "{page}", "a{max}", "b{min}");
                        return "/posts.json?limit=" + opts.limit + "&page=" + pagePart + "&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var map = {
                        "ext": "file.ext",
                        "change": "change_seq",
                        "creator_id": "uploader_id",
                        "id": "id",
                        "rating": "rating",
                        "file_url": "file.url",
                        "width": "file.width",
                        "height": "file.height",
                        "file_size": "file.size",
                        "preview_url": "preview.url",
                        "preview_width": "preview.width",
                        "preview_height": "preview.height",
                        "sample_url": "sample.url",
                        "sample_height": "sample.height",
                        "sample_width": "sample.width",
                        "md5": "file.md5",
                        "has_children": "relationships.has_children",
                        "parent_id": "relationships.parent_id",
                        "score": "score.total",
                        "sources": "sources",
                    };
                    var data = JSON.parse(src);
                    if ("success" in data && data["success"] === false && "message" in data) {
                        return { error: data["message"] };
                    }
                    var images = [];
                    for (var _i = 0, _a = data["posts"]; _i < _a.length; _i++) {
                        var image = _a[_i];
                        var img = Grabber.mapFields(image, map);
                        img.created_at = Math.floor(Date.parse(image.created_at) / 1000);
                        img.has_comments = image.comment_count > 0 ? true : false;
                        // Determine flags
                        img.status = "active";
                        if (image.flags.pending === true) {
                            img.status = "pending";
                        }
                        else if (image.flags.flagged === true) {
                            img.status = "flagged";
                        }
                        else if (image.flags.deleted === true) {
                            img.status = "deleted";
                        }
                        var tags = [];
                        for (var type in image.tags) {
                            for (var _b = 0, _c = image.tags[type]; _b < _c.length; _b++) {
                                var name_1 = _c[_b];
                                tags.push({ name: name_1, type: type });
                            }
                        }
                        img.tags = tags;
                        if (!image.file.md5 || image.file.md5.length === 0) {
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
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var tag = data_1[_i];
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
                    // Broken due to -status:deleted added to search query
                    // let wiki = Grabber.regexToConst("wiki", '<div id="excerpt"(?:[^>]+)>(?<wiki>.+?)</div>', src);
                    // wiki = wiki ? wiki.replace(/href="\/wiki_pages\/show_or_new\?title=([^"]+)"/g, 'href="$1"') : wiki;
                    var wiki = "<p>This feature is now broken due to '-status:deleted' is added to search tag.</p>";
                    return {
                        tags: Grabber.regexToTags('<li class="category-(?<typeId>[^"]+)">(?:\\s*<a class="wiki-link"[^>]* href="[^"]+">\\?</a>)?(?:\\s*<a[^>]* class="search-inc-tag">[^<]+</a>\\s*<a[^>]* class="search-exl-tag">[^<]+</a>)?\\s*<a[^>]* class="search-tag"\\s+[^>]*href="[^"]+"[^>]*>(?<name>[^<]+)</a>\\s*<span class="post-count">(?<count>[^<]+)</span>\\s*</li>', src),
                        images: Grabber.regexToImages(' '),
                        // Not enough infomation in HTML
                        // images: Grabber.regexToImages('<article[^>]* id="[^"]*" class="[^"]*"\\s+data-id="(?<id>[^"]*)"\\s+data-has-sound="[^"]*"\\s+data-tags="(?<tags>[^"]*)"\\s+data-rating="(?<rating>[^"]*)"\\s+data-flags="(?<flags>[^"]*)"\\s+data-uploader-id="[^"]*"(?:\\s+data-uploader="(?<author>[^"]*)")?\\s+data-file-url="(?<file_url>[^"]*)"\\s+data-large-file-url="(?<sample_url>[^"]*)"\\s+data-preview-file-url="(?<preview_url>[^"]*)"', src).map(completeImage),
                        wiki: wiki,
                        pageCount: Grabber.regexToConst("page", '>(?<page>\\d+)</(?:a|span)></li><li[^<]*><(?:a|span)[^>]*>(?:&gt;&gt;|<i class="[^"]+"></i>)<', src),
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/posts/" + id;
                },
                parse: function (src) {
                    return {
                        pools: Grabber.regexToPools('<div id="pool-nav">[^<]*<ul>[^<]*<li id="nav-link-for-pool-\\d+" class="pool-\\w+-\\w+ pool-\\w+-\\w+">[^<]*(?:<a class="first" title="to page 1" href=".*?">.*?</a>|<span class="first">.*?</span>)[^<]*(?:<a rel="prev" class="prev" title="to page \\d+" href="/posts/(?<previous>\\d+)\\?pool_id=\\d+">.*?</a>|<span class="prev">.*?</span>)?[^<]*<span class="pool-name">[^<]*<a title="page \\d+/\\d+" href="/pools/(?<id>\\d+)">Pool: (?<name>[^<]+)</a>[^<]*</span>[^<]*(?:<a rel="next" class="next" title="to page \\d+" href="/posts/(?<next>\\d+)\\?pool_id=\\d+">.*?</a>|<span class="next">.*?</span>)?[^<]*(?:<a class="last" title="to page \\d+" href=".*?">.*?</a>|<span class="last">.*?</span>)[^<]*</li>[^<]*</ul>[^<]*</div>', src),
                        tags: Grabber.regexToTags('<li class="category-(?<typeId>[^"]+)">(?:\\s*<a class="wiki-link"[^>]* href="[^"]+">\\?</a>)?(?:\\s*<a[^>]* class="search-inc-tag">[^<]+</a>\\s*<a[^>]* class="search-exl-tag">[^<]+</a>)?\\s*<a[^>]* class="search-tag"\\s+[^>]*href="[^"]+"[^>]*>(?<name>[^<]+)</a>\\s*<span[^>]* class="[^"]*post-count[^"]*">(?<count>[^<]+)</span>\\s*</li>', src),
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
                    return "/tags?limit=" + opts.limit + "&page=" + query.page;
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
                    return src.indexOf("Running e621") !== -1;
                },
            },
        },
    },
};
