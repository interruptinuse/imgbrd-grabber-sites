function completeImage(img) {
    if (img.json_uris) {
        var uris = JSON.parse(img.json_uris.replace(/&quot;/g, '"'));
        if ("thumb_small" in uris && uris["thumb_small"].length > 5) {
            img.preview_url = uris["thumb_small"];
        }
        if ("large" in uris && uris["large"].length > 5) {
            img.sample_url = uris["large"];
        }
        if ("full" in uris && uris["full"].length > 5) {
            img.file_url = uris["full"];
        }
    }
    if (!img.preview_url && img.file_url.length >= 5) {
        img.preview_url = img.file_url
            .replace("full", "thumb")
            .replace(".svg", ".png");
    }
    return img;
}
export var source = {
    name: "Booru-on-rails",
    modifiers: ["faved_by:", "width:", "height:", "uploader:", "source_url:", "description:", "sha512_hash:", "aspect_ratio:"],
    forcedTokens: [],
    tagFormat: {
        case: "lower",
        wordSeparator: " ",
    },
    searchFormat: {
        and: " AND ",
        or: " OR ",
        parenthesis: true,
        precedence: "and",
    },
    auth: {
        url: {
            type: "url",
            fields: [
                {
                    id: "apiKey",
                    key: "key",
                    type: "password",
                },
            ],
        },
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            forcedLimit: 15,
            search: {
                url: function (query, opts, previous) {
                    if (!query.search || query.search.length === 0) {
                        return "/images.json?page=" + query.page + "&nocomments=1&nofav=1";
                    }
                    return "/search.json?page=" + query.page + "&q=" + encodeURIComponent(query.search) + "&nocomments=1&nofav=1";
                },
                parse: function (src) {
                    var map = {
                        "created_at": "created_at",
                        "source": "source_url",
                        "width": "width",
                        "md5": "sha512_hash",
                        "height": "height",
                        "creator_id": "uploader_id",
                        "id": "id",
                        "ext": "original_format",
                        "author": "uploader",
                        "score": "score",
                    };
                    var data = JSON.parse(src);
                    var results = "search" in data ? data.search : data.images;
                    var images = [];
                    for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                        var image = results_1[_i];
                        var img = Grabber.mapFields(image, map);
                        img.tags = image["tags"].split(", ");
                        img.preview_url = image["representations"]["thumb"];
                        img.sample_url = image["representations"]["large"];
                        img.file_url = image["representations"]["full"];
                        img.has_comments = image["comment_count"] > 0;
                        images.push(completeImage(img));
                    }
                    return {
                        images: images,
                        imageCount: data.total,
                    };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tags.json?limit=" + opts.limit + "&page=" + query.page;
                },
                parse: function (src) {
                    var map = {
                        "id": "id",
                        "name": "name",
                        "count": "images",
                        "type": "category",
                    };
                    var data = JSON.parse(src);
                    var tags = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var tag = data_1[_i];
                        tags.push(Grabber.mapFields(tag, map));
                    }
                    return { tags: tags };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 15,
            search: {
                url: function (query, opts, previous) {
                    if (!query.search || query.search.length === 0) {
                        return "/images/page/" + query.page;
                    }
                    return "/search?page=" + query.page + "&sbq=" + encodeURIComponent(query.search);
                },
                parse: function (src) {
                    return {
                        images: Grabber.regexToImages('<div class="image-container[^"]*" data-aspect-ratio="[^"]*" data-comment-count="(?<comments>[^"]*)" data-created-at="(?<created_at>[^"]*)" data-downvotes="[^"]*" data-faves="(?<favorites>[^"]*)" data-height="(?<height>[^"]*)" data-image-id="(?<id>[^"]*)" data-image-tag-aliases="(?<tags>[^"]*)" data-image-tags="[^"]*" data-score="(?<score>[^"]*)" data-size="[^"]*" data-source-url="(?<source>[^"]*)" data-upvotes="[^"]*" data-uris="(?<json_uris>[^"]*)" data-width="(?<width>[^"]*)">.*?<a[^>]*><picture><img[^>]* src="(?<preview_url>[^"]*)"[^>]*>', src).map(completeImage),
                        pageCount: Grabber.regexToConst("page", '<a href="(?:/images/page/|/tags/[^\\?]*\\?[^"]*page=|/search/index\\?[^"]*page=)(?<image>\\d+)[^"]*">Last', src),
                        imageCount: Grabber.regexToConst("count", "of <strong>(?<count>[^<]+)</strong> total", src),
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/" + id;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<span class="tag dropdown"(?: data-tag-category="(?<type>[^"]*)")? data-tag-id="(?<id>[^"]+)" data-tag-name="(?<name>[^"]+)" data-tag-slug="[^"]+">', src),
                    };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/tags?page=" + query.page;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<span class="tag dropdown"(?: data-tag-category="(?<type>[^"]+)")? data-tag-id="(?<id>\\d+)" data-tag-name="(?<name>.+?)".+?<span class="tag__count">\\s*\\((?<count>\\d+)\\)</span>', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Powered by the booru-on-rails project") !== -1;
                },
            },
        },
    },
};
