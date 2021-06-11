var completeImage = function (data) {
    if (data && "tags" in data && typeof data["tags"] === "object") {
        for (var type in data["tags"]) {
            var children = data["tags"][type];
            children = "tag" in children ? children["tag"] : children;
            if (!Array.isArray(children)) {
                children = [children];
            }
            var tags = "";
            for (var i in children) {
                var tag = children[i];
                if (typeof tag !== "object" || "#text" in tag) {
                    tags += (tags.length !== 0 ? " " : "") + (typeof tag === "object" ? tag["#text"] : tag);
                }
            }
            data["tags_" + type] = tags;
        }
    }
    if ("sources" in data && "source" in data["sources"]) {
        data["sources"] = data["sources"]["source"];
    }
    if (!data["file_url"] || data["file_url"].length < 5) {
        data["file_url"] = data["preview_url"].replace("/preview/", "/");
    }
    if ("id" in data) {
        data.id = parseInt(data.id, 10);
    }
    return data;
};
export var source = {
    name: "Danbooru",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "status:any", "status:deleted", "status:active", "status:flagged", "status:pending", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "order:change", "order:change_desc", "parent:none", "unlocked:rating"],
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
        session: {
            type: "post",
            url: "/user/authenticate",
            fields: [
                {
                    id: "pseudo",
                    key: "user[name]",
                },
                {
                    id: "password",
                    key: "user[password]",
                    type: "password",
                },
            ],
            check: {
                type: "cookie",
                key: "pass_hash",
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
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 750, "page={page}", "after_id={max}", "before_id={min}");
                        return "/post/index.json?limit=" + opts.limit + "&" + pagePart + "&typed_tags=true&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
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
                    return "/tag/index.json?limit=" + opts.limit + "&page=" + query.page;
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
            maxLimit: 200,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 750, "page={page}", "after_id={max}", "before_id={min}");
                        return "/post/index.xml?limit=" + opts.limit + "&" + pagePart + "&typed_tags=true&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var parsed = Grabber.typedXML(Grabber.parseXML(src));
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
                    return "/tag/index.xml?limit=" + opts.limit + "&page=" + query.page;
                },
                parse: function (src) {
                    var map = {
                        "id": "id",
                        "name": "name",
                        "count": "count",
                        "typeId": "type",
                    };
                    var data = Grabber.makeArray(Grabber.typedXML(Grabber.parseXML(src)).tags.tag);
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
            maxLimit: 200,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 750, "page={page}", "after_id={max}", "before_id={min}");
                        return "/post/index?limit=" + opts.limit + "&" + pagePart + "&typed_tags=true&tags=" + encodeURIComponent(query.search);
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var wiki = Grabber.regexToConst("wiki", '<div id="sidebar-wiki"(?:[^>]+)>(?<wiki>.+?)</div>', src);
                    wiki = wiki ? wiki.replace(/href="\/wiki\/show\?title=([^"]+)"/g, 'href="$1"') : wiki;
                    return {
                        images: Grabber.regexToImages("Post\\.register\\((?<json>\\{.+?\\})\\);?", src).map(completeImage),
                        tags: Grabber.regexToTags('<li class="?[^">]*tag-type-(?<type>[^">]+)(?:|"[^>]*)>.*?<a href="[^"]+"[^>]*>(?<name>[^<\\?]+)</a>.*?<span class="?post-count"?>(?<count>\\d+)</span>.*?</li>', src),
                        wiki: wiki,
                        pageCount: Grabber.regexToConst("page", '<link href="[^"]*\\?.*?page=(?<page>\\d+)[^"]*" rel="last" title="Last Page">'),
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
                        tags: Grabber.regexToTags('<li class="?[^">]*tag-type-(?<type>[^">]+)(?:|"[^>]*)>.*?<a href="[^"]+"[^>]*>(?<name>[^<\\?]+)</a>.*?<span class="?post-count"?>(?<count>\\d+)</span>.*?</li>', src),
                        imageUrl: Grabber.regexToConst("url", '<section[^>]* data-file-url="(?<url>[^"]*)"', src),
                    };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tag/index?limit=" + opts.limit + "&page=" + query.page;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags("<tr[^>]*>\\s*<td[^>]*>(?<count>\\d+)</td>\\s*<td[^>]*>\\s*(?:<a[^>]+>\\?</a>\\s*)?<a[^>]+>(?<name>.+?)</a>\\s*</td>\\s*<td[^>]*>\\s*(?<type>.+?)\\s*\\([^()]+\\)\\s*</td>", src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Running Danbooru 1") !== -1
                        || src.indexOf("Running MyImouto 1") !== -1;
                },
            },
        },
    },
};
