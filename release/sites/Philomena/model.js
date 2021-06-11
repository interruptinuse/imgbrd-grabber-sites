var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
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
    if (!img.preview_url && img.file_url && img.file_url.length >= 5) {
        img.preview_url = img.file_url
            .replace("full", "thumb")
            .replace(".svg", ".png");
    }
    return img;
}
function makeTags(tags, tagIds) {
    var ret = [];
    for (var i in tags) {
        ret.push({
            id: tagIds[i],
            name: tags[i],
        });
    }
    return ret;
}
function searchToArg(search) {
    var sf;
    var sd = "desc";
    var tags = [];
    var parts = search.split(" ");
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var tag = parts_1[_i];
        var part = tag.trim();
        if (part.indexOf("order:") === 0) {
            var orders = part.substr(6).split("_");
            sf = orders[0];
            if (orders.length > 1) {
                sd = orders[1];
            }
        }
        else {
            tags.push(part);
        }
    }
    var ret = encodeURIComponent(tags.join(" ") || "*");
    if (sf) {
        ret += "&sf=" + sf;
        if (sd) {
            ret += "&sd=" + sd;
        }
    }
    return ret;
}
// Build all "order:XXX" possible modifiers
var sorts = ["id", "updated_at", "first_seen_at", "aspect_ratio", "faves", "upvotes", "downvotes", "score", "wilson_score", "_score", "width", "height", "comment_count", "tag_count", "pixels", "size", "duration"];
var sortModifiers = [];
for (var _i = 0, sorts_1 = sorts; _i < sorts_1.length; _i++) {
    var sort = sorts_1[_i];
    sortModifiers.push("order:" + sort);
    sortModifiers.push("order:" + sort + "_asc");
    sortModifiers.push("order:" + sort + "_desc");
}
export var source = {
    name: "Philomena",
    modifiers: __spreadArray(["faved_by:", "width:", "height:", "uploader:", "source_url:", "description:", "sha512_hash:", "aspect_ratio:"], sortModifiers),
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
            maxLimit: 50,
            search: {
                url: function (query, opts) {
                    return "/api/v1/json/search/images?per_page=" + opts.limit + "&page=" + query.page + "&q=" + searchToArg(query.search);
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
                        "ext": "format",
                        "file_url": "representations.full",
                        "sample_url": "representations.large",
                        "preview_url": "representations.thumb",
                        "author": "uploader",
                        "score": "score",
                    };
                    var data = JSON.parse(src);
                    var images = [];
                    for (var _i = 0, _a = data["images"]; _i < _a.length; _i++) {
                        var image = _a[_i];
                        var img = Grabber.mapFields(image, map);
                        img.tags = makeTags(image["tags"], image["tag_ids"]);
                        img.has_comments = image["comment_count"] > 0;
                        images.push(completeImage(img));
                    }
                    return {
                        images: images,
                        imageCount: data.total,
                    };
                },
            },
            details: {
                url: function (id) {
                    return "/api/v1/json/images/" + id;
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    return {
                        createdAt: data["created_at"],
                        imageUrl: data["representations"]["full"],
                        tags: makeTags(data["tags"], data["tag_ids"]),
                    };
                },
            },
            tags: {
                url: function (query, opts) {
                    return "/api/v1/json/search/tags?per_page=" + opts.limit + "&page=" + query.page + "&q=*";
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
                    for (var _i = 0, _a = data["tags"]; _i < _a.length; _i++) {
                        var tag = _a[_i];
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
                url: function (query) {
                    if (!query.search || query.search.length === 0) {
                        return "/images/page/" + query.page;
                    }
                    return "/search?page=" + query.page + "&sbq=" + searchToArg(query.search);
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
                url: function (query) {
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
                    return src.indexOf("philomena project") !== -1;
                },
            },
        },
    },
};
