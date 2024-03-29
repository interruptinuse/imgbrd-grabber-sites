var orderMap = {
    "newest": 4,
    "popular-8-hours": 10,
    "popular-24-hours": 11,
    "popular-3-days": 12,
    "popular-1-week": 14,
    "popular-1-month": 15,
    "popular-all-time": 8, // 9
};
function parseSearch(search) {
    var query = "";
    var order = 0;
    for (var _i = 0, _a = search.split(" "); _i < _a.length; _i++) {
        var tag = _a[_i];
        if (tag.indexOf("order:") === 0) {
            var val = tag.substr(6);
            var toInt = parseInt(val, 10);
            order = isNaN(toInt) ? orderMap[val] : toInt;
        }
        else {
            query += (query ? " " : "") + tag;
        }
    }
    return { query: query, order: order };
}
function completeImage(img) {
    if (!img.id && img.page_url) {
        img.id = Grabber.regexToConst("id", "-(?<id>\\d+)$", img.page_url);
    }
    return img;
}
export var source = {
    name: "DeviantArt",
    forcedTokens: ["file_url"],
    apis: {
        rss: {
            name: "RSS",
            auth: [],
            forcedLimit: 60,
            search: {
                url: function (query, opts) {
                    var parsed = parseSearch(query.search);
                    var offset = (query.page - 1) * opts.limit;
                    var order = parsed.order ? "&order=" + parsed.order : "";
                    return "//backend.deviantart.com/rss.xml?type=deviation&q=" + encodeURIComponent(parsed.query) + order + "&offset=" + offset;
                },
                parse: function (src) {
                    var parsed = Grabber.parseXML(src);
                    var data = Grabber.makeArray(parsed.rss.channel.item);
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var image = data_1[_i];
                        if (image["media:content"]["@attributes"]["medium"] === "document") {
                            continue;
                        }
                        var thumbnail = Array.isArray(image["media:thumbnail"]) ? image["media:thumbnail"][0] : image["media:thumbnail"];
                        var credit = Array.isArray(image["media:credit"]) ? image["media:credit"][0] : image["media:credit"];
                        var rating = image["media:rating"]["#text"].trim();
                        var img = {
                            page_url: image["link"]["#text"],
                            created_at: image["pubDate"]["#text"],
                            name: image["media:title"]["#text"],
                            author: credit["#text"],
                            tags: (image["media:keywords"]["#text"] || "").trim().split(", "),
                            preview_url: thumbnail && (thumbnail["#text"] || thumbnail["@attributes"]["url"]),
                            preview_width: thumbnail && thumbnail["@attributes"]["width"],
                            preview_height: thumbnail && thumbnail["@attributes"]["height"],
                            sample_url: image["media:content"]["#text"] || image["media:content"]["@attributes"]["url"],
                            sample_width: image["media:content"]["@attributes"]["width"],
                            sample_height: image["media:content"]["@attributes"]["height"],
                            rating: rating === "nonadult" ? "safe" : (rating === "adult" ? "explicit" : "questionable"),
                        };
                        images.push(completeImage(img));
                    }
                    return { images: images };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 24,
            search: {
                url: function (query, opts) {
                    var parsed = parseSearch(query.search);
                    return "/search/deviations?q=" + encodeURIComponent(parsed.query) + "&page=" + query.page;
                },
                parse: function (src) {
                    return {
                        images: Grabber.regexToImages('<section.*?<a data-hook="deviation_link" href="(?<page_url>[^"]+)"[^>]*>.*?<img[^>]+src="(?<preview_url>[^"]+)"[^>]*>.*?<h2[^<]*>(?<name>[^<]+)</h2>', src).map(completeImage),
                        tags: Grabber.regexToTags('<a href="[^"]*/search/deviations\\?q=[^"]+" data-tag="(?<name>[^"]+)"[^>]*>[^<]+</a>', src),
                        imageCount: Grabber.regexToConst("count", '>(?<count>\\d+) results<', src),
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return { error: "Not supported (page_url)" };
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<a href="[^"]*/tag/(?<name>[^"]+)"', src),
                        imageUrl: Grabber.regexToConst("url", '<img[^>]*aria-hidden="true"[^>]+src="(?<url>[^"]+)"', src),
                    };
                },
            },
        },
    },
};
