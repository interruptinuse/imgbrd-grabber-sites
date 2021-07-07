function getExtension(url) {
    var index = url.lastIndexOf(".");
    if (index >= 0 && index > url.length - 10) {
        return url.substr(index + 1);
    }
    return "";
}
function parseSearch(search) {
    var user = "";
    var retweets = true;
    var replies = true;
    for (var _i = 0, search_1 = search; _i < search_1.length; _i++) {
        var tag = search_1[_i];
        tag = tag.trim();
        if (tag.substr(0, 9) === "retweets:") {
            retweets = tag.substr(9) === "yes";
        }
        else if (tag.substr(0, 8) === "replies:") {
            replies = tag.substr(8) === "yes";
        }
        else {
            user = tag;
        }
    }
    return {
        user: user,
        retweets: retweets,
        replies: replies,
    };
}
function parseTweetMedia(sc, original, media) {
    var d = {};
    var sizes = media["sizes"];
    // Meta-data
    d.id = original["id_str"];
    d.author = sc["user"]["screen_name"];
    d.author_id = sc["user"]["id_str"];
    d.created_at = sc["created_at"];
    d.tags = sc["entities"]["hashtags"].map(function (hashtag) { return hashtag["text"]; });
    // Images
    d.width = sizes["large"]["w"];
    d.height = sizes["large"]["h"];
    if ("thumb" in sizes) {
        d.preview_url = media["media_url_https"] + ":thumb";
        d.preview_width = sizes["thumb"]["w"];
        d.preview_height = sizes["thumb"]["h"];
    }
    if ("medium" in sizes) {
        d.sample_url = media["media_url_https"] + ":medium";
        d.sample_width = sizes["medium"]["w"];
        d.sample_height = sizes["medium"]["h"];
    }
    // Full-size link
    if ("video_info" in media) {
        var maxBitrate = -1;
        for (var _i = 0, _a = media["video_info"]["variants"]; _i < _a.length; _i++) {
            var variantInfo = _a[_i];
            var bitrate = variantInfo["bitrate"];
            if (bitrate > maxBitrate) {
                maxBitrate = bitrate;
                d.file_url = variantInfo["url"];
                d.ext = getExtension(variantInfo["url"]);
            }
        }
    }
    else {
        d.file_url = media["media_url_https"] + ":orig";
        d.ext = getExtension(media["media_url_https"]);
    }
    // Additional tokens
    d.tokens = {};
    d.tokens["tweet_id"] = sc["id_str"];
    d.tokens["original_tweet_id"] = original["id_str"];
    d.tokens["original_author"] = original["user"]["screen_name"];
    d.tokens["original_author_id"] = original["user"]["id_str"];
    d.tokens["original_date"] = "date:" + original["created_at"];
    return d;
}
function parseTweet(sc, gallery) {
    var original = sc;
    if ("retweeted_status" in sc) {
        sc = sc["retweeted_status"];
    }
    if (!("extended_entities" in sc)) {
        return { id: original["id_str"] };
    }
    var entities = sc["extended_entities"];
    if (!("media" in entities)) {
        return { id: original["id_str"] };
    }
    var medias = entities["media"];
    if (!medias || medias.length === 0) {
        return { id: original["id_str"] };
    }
    if (medias.length > 1) {
        if (gallery) {
            return medias.map(function (media) { return parseTweetMedia(sc, original, media); });
        }
        var d = parseTweetMedia(sc, original, medias[0]);
        d.type = "gallery";
        d.gallery_count = medias.length;
        d.id = original["id_str"];
        return d;
    }
    return parseTweetMedia(sc, original, medias[0]);
}
export var source = {
    name: "Twitter",
    modifiers: ["retweets:yes", "retweets:no", "replies:yes", "replies:no"],
    tokens: ["tweet_id", "original_tweet_id", "original_author", "original_author_id", "original_date"],
    auth: {
        oauth2: {
            type: "oauth2",
            authType: "header_basic",
            tokenUrl: "/oauth2/token",
        },
        /*oauth1: {
            type: "oauth1",
            temporaryCredentialsUrl: "/oauth/request_token",
            authorizationUrl: "/oauth/authenticate",
            tokenCredentialsUrl: "/oauth/access_token",
        },*/
    },
    apis: {
        json: {
            name: "JSON",
            auth: ["oauth2" /*, "oauth1"*/],
            maxLimit: 200,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var search = parseSearch(query.search.split(" "));
                        var pageUrl = Grabber.pageUrl(query.page, previous, 1, "", "&since_id={max}", "&max_id={min-1}");
                        var params = [
                            "count=" + opts.limit,
                            "include_rts=" + (search.retweets ? "true" : "false"),
                            "exclude_replies=" + (!search.replies ? "true" : "false"),
                            "tweet_mode=extended",
                            "screen_name=" + encodeURIComponent(search.user),
                        ];
                        return "/1.1/statuses/user_timeline.json?" + params.join("&") + pageUrl;
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var images = [];
                    for (var i in data) {
                        var img = parseTweet(data[i], false);
                        if (img !== false) {
                            images.push(img);
                        }
                    }
                    return { images: images };
                },
            },
            gallery: {
                url: function (query, opts) {
                    return "/1.1/statuses/show.json?id=" + query.id + "&tweet_mode=extended";
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var images = Grabber.makeArray(parseTweet(data, true));
                    return {
                        images: images,
                        imageCount: images.length,
                        pageCount: 1,
                    };
                },
            },
        },
    },
};
