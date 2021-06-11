function parseSearch(search) {
    var ret = { tags: [] };
    var parts = search.split(" ").map(function (p) { return p.trim(); }).filter(function (p) { return p.length > 0; });
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        if (part.indexOf("subreddit:") === 0) {
            ret.subreddit = part.substr(10);
        }
        else if (part.indexOf("user:") === 0) {
            ret.user = part.substr(5);
        }
        else if (part.indexOf("sort:") === 0) {
            ret.sort = part.substr(5);
        }
        else if (part.indexOf("since:") === 0) {
            ret.since = part.substr(6);
        }
        else {
            ret.tags.push(part);
        }
    }
    return ret;
}
function makeArgs(args) {
    var ret = "";
    for (var key in args) {
        if (args[key] !== undefined && args[key] !== null) {
            ret += (ret.length === 0 ? "?" : "&") + key + "=" + encodeURIComponent(args[key]);
        }
    }
    return ret;
}
export var source = {
    name: "Reddit",
    modifiers: ["subreddit:", "user:", "sort:hot", "sort:new", "sort:top", "sort:rising", "sort:relevance", "sort:comments", "since:hour", "since:day", "since:week", "since:month", "since:year", "since:all}"],
    apis: {
        json: {
            name: "JSON",
            auth: [],
            maxLimit: 100,
            search: {
                parseErrors: true,
                url: function (query, opts) {
                    var search = parseSearch(query.search);
                    var prefix = search.subreddit ? "/r/" + search.subreddit : "";
                    if (search.tags.length > 0) {
                        var args = {
                            q: search.tags.join(" "),
                            sort: search.sort,
                            t: search.since || "all",
                            restrict_sr: search.subreddit ? 1 : undefined,
                            limit: opts.limit,
                            raw_json: 1,
                        };
                        return prefix + "/search.json" + makeArgs(args);
                    }
                    else {
                        var args = {
                            t: search.since || "all",
                            limit: opts.limit,
                            raw_json: 1,
                        };
                        return prefix + (search.sort ? "/" + search.sort : "") + ".json" + makeArgs(args);
                    }
                },
                parse: function (src) {
                    var _a, _b, _c, _d, _e, _f;
                    var map = {
                        "author": "author",
                        "name": "title",
                        "source": "url",
                        "file_url": "url",
                        "created_at": "created_utc",
                        "preview_url": "thumbnail",
                        "preview_width": "thumbnail_width",
                        "preview_height": "thumbnail_height",
                        "page_url": "permalink",
                        "score": "score",
                    };
                    var data = JSON.parse(src);
                    if (data.kind !== "Listing") {
                        return { error: "No listing found in response" };
                    }
                    var images = [];
                    for (var _i = 0, _g = data.data.children; _i < _g.length; _i++) {
                        var child = _g[_i];
                        // Ignore non-link posts
                        if (child.kind !== "t3") { // 1=comment, 2=account, 3=link, 4=message, 5=subreddit, 6=award
                            continue;
                        }
                        var raw = child.data;
                        // Ignore text-only posts
                        if (raw.thumbnail === "self") {
                            continue;
                        }
                        var img = Grabber.mapFields(raw, map);
                        // Galleries
                        if (raw.is_gallery === true) {
                            img.type = "gallery";
                            if ((_a = raw.gallery_data) === null || _a === void 0 ? void 0 : _a.items) {
                                img.gallery_count = raw.gallery_data.items.length;
                            }
                        }
                        // Try to get the biggest preview and use it as a sample
                        if ((_d = (_c = (_b = raw.preview) === null || _b === void 0 ? void 0 : _b.images) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.source) {
                            img.sample_url = raw.preview.images[0].source.url.replace("&amp;", "&");
                            img.sample_width = raw.preview.images[0].source.width;
                            img.sample_height = raw.preview.images[0].source.height;
                        }
                        // Videos
                        if ((_e = raw.secure_media) === null || _e === void 0 ? void 0 : _e.oembed) {
                            img.width = raw.secure_media.oembed.width;
                            img.height = raw.secure_media.oembed.height;
                        }
                        if (raw.is_video && ((_f = raw.secure_media) === null || _f === void 0 ? void 0 : _f.reddit_video)) {
                            img.file_url = raw.secure_media.reddit_video.fallback_url; // FIXME: should use the HD url instead, but Grabber doesn't support playlist-based files
                            img.width = raw.secure_media.reddit_video.width;
                            img.height = raw.secure_media.reddit_video.height;
                        }
                        // Rating
                        img.rating = raw.over_18 ? "explicit" : "safe";
                        images.push(img);
                    }
                    return { images: images };
                },
            },
        },
    },
};
