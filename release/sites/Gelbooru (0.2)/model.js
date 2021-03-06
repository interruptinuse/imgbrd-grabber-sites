function completeImage(img) {
    if ((!img.file_url || img.file_url.length < 5) && img.preview_url) {
        img.file_url = img.preview_url
            .replace("/thumbnails/", "/images/")
            .replace("/thumbnail_", "/");
    }
    return img;
}
export var source = {
    name: "Gelbooru (0.2)",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "parent:none", "unlocked:rating", "sort:updated", "sort:id", "sort:score", "sort:rating", "sort:user", "sort:height", "sort:width", "sort:parent", "sort:source", "sort:updated"],
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
                    id: "userId",
                    key: "user_id",
                },
                {
                    id: "apiKey",
                    key: "api_key",
                },
            ],
        },
        session: {
            type: "post",
            url: "/index.php?page=account&s=login&code=00",
            fields: [
                {
                    id: "pseudo",
                    key: "user",
                },
                {
                    id: "password",
                    key: "pass",
                    type: "password",
                },
            ],
            check: {
                type: "cookie",
                key: "user_id",
            },
        },
    },
    apis: {
        xml: {
            name: "XML",
            auth: [],
            maxLimit: 1000,
            search: {
                url: function (query, opts) {
                    var page = query.page - 1;
                    var search = query.search.replace(/(^| )order:/gi, "$1sort:");
                    var fav = search.match(/(?:^| )fav:(\d+)(?:$| )/);
                    if (fav) {
                        return { error: "XML API cannot search favorites" };
                    }
                    return "/index.php?page=dapi&s=post&q=index&limit=" + opts.limit + "&pid=" + page + "&tags=" + encodeURIComponent(search);
                },
                parse: function (src) {
                    var parsed = Grabber.parseXML(src);
                    // Handle error messages
                    if ("response" in parsed && parsed["response"]["@attributes"]["success"] === "false") {
                        return { error: parsed["response"]["@attributes"]["reason"] };
                    }
                    var data = Grabber.makeArray(parsed.posts.post);
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var image = data_1[_i];
                        if (image && "@attributes" in image) {
                            images.push(completeImage(image["@attributes"]));
                        }
                    }
                    return {
                        images: images,
                        imageCount: parsed.posts["@attributes"]["count"],
                    };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 42,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var search = query.search.replace(/(^| )order:/gi, "$1sort:");
                        var fav = search.match(/(?:^| )fav:(\d+)(?:$| )/);
                        if (fav) {
                            var pagePart = Grabber.pageUrl(query.page, previous, 20000, "&pid={page}", "&pid={page}", " id:<{min}&p=1", function (p) { return (p - 1) * 50; });
                            return "/index.php?page=favorites&s=view&id=" + fav[1] + pagePart;
                        }
                        else {
                            var pagePart = Grabber.pageUrl(query.page, previous, 20000, "&pid={page}", "&pid={page}", " id:<{min}&p=1", function (p) { return (p - 1) * 42; });
                            return "/index.php?page=post&s=list&tags=" + encodeURIComponent(search) + pagePart;
                        }
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    if (src.indexOf("Unable to search this deep") !== -1) {
                        return { error: "Page too far" };
                    }
                    var pageCountRaw = Grabber.regexMatch('<a href="[^"]+pid=(?<page>\\d+)[^"]*"[^>]*>[^<]+</a>\\s*(?:<b>(?<last>\\d+)</b>\\s*)?(?:</div>|<br ?/>)', src);
                    var pageCount = pageCountRaw && (pageCountRaw["last"] || pageCountRaw["page"]);
                    return {
                        images: Grabber.regexToImages('<span[^>]*(?: id="?\\w(?<id>\\d+)"?)?>\\s*<a[^>]*(?: id="?\\w(?<id_2>\\d+)"?)[^>]*>\\s*<img [^>]*(?:src|data-original)="(?<preview_url>[^"]+/thumbnail_(?<md5>[^.]+)\\.[^"]+)" [^>]*title="\\s*(?<tags>[^"]+)"[^>]*/?>\\s*</a>|<img\\s+class="preview"\\s+src="(?<preview_url_2>[^"]+/thumbnail_(?<md5_2>[^.]+)\\.[^"]+)" [^>]*title="\\s*(?<tags_2>[^"]+)"[^>]*/?>', src).map(completeImage),
                        tags: Grabber.regexToTags('<li class="tag-type-(?<type>[^"]+)">(?:[^<]*<a[^>]*>[^<]*</a>)*[^<]*<a[^>]*>(?<name>[^<]*)</a>[^<]*<span[^>]*>(?<count>\\d+)</span>[^<]*</li>', src),
                        pageCount: pageCount && parseInt(pageCount, 10) / 42 + 1,
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/index.php?page=post&s=view&id=" + id;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<li class="tag-type-(?<type>[^"]+)">(?:[^<]*(?:<span[^>]*>[^<]*)?<a[^>]*>[^<]*</a>(?:[^<]*</span>)?)*[^<]*<a[^>]*>(?<name>[^<]*)</a>[^<]*<span[^>]*>(?<count>\\d+)</span>[^<]*</li>', src),
                        imageUrl: Grabber.regexToConst("url", '<img[^>]+src="([^"]+)"[^>]+onclick="Note\\.toggle\\(\\);"[^>]*/>', src),
                    };
                },
            },
            tagTypes: false,
            tags: {
                url: function (query) {
                    var sorts = { count: "desc", date: "asc", name: "asc" };
                    var orderBys = { count: "index_count", date: "updated", name: "tag" };
                    var page = (query.page - 1) * 50;
                    return "/index.php?page=tags&s=list&pid=" + page + "&sort=" + sorts[query.order] + "&order_by=" + orderBys[query.order];
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('(?:<td>(?<count_2>\\d+)</td>\\s*)?<td><span class="tag-type-(?<type>[^"]+)"><a[^>]+>(?<name>.+?)</a></span>(?:\\s*<span class="tag-count">(?<count>\\d+)</span>)?</td>', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.search(/Running Gelbooru(?: Beta)? 0\.2/) !== -1
                        || src.search(/Running <a[^>]*>Gelbooru<\/a>(?: Beta)? 0\.2/) !== -1;
                },
            },
        },
    },
};
