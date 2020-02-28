function urlSampleToThumbnail(url) {
    return url.replace("/img-master/", "/c/150x150/img-master/");
}
function parseSearch(search) {
    var modes = {
        "partial": "partial_match_for_tags",
        "full": "exact_match_for_tags",
        "tc": "title_and_caption",
    };
    var mode = "partial_match_for_tags";
    var tags = [];
    var parts = search.split(" ");
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var tag = parts_1[_i];
        var part = tag.trim();
        if (part.indexOf("mode:") === 0) {
            var tmode = part.substr(5);
            if (tmode in modes) {
                mode = modes[tmode];
                continue;
            }
        }
        tags.push(part);
    }
    return { mode: mode, tags: tags };
}
export var source = {
    name: "Pixiv",
    modifiers: ["mode:partial", "mode:full", "mode:tc"],
    forcedTokens: [],
    searchFormat: {
        and: " ",
    },
    auth: {
        oauth2: {
            type: "oauth2",
            authType: "password",
            tokenUrl: "https://oauth.secure.pixiv.net/auth/token",
        },
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            maxLimit: 1000,
            search: {
                url: function (query, opts) {
                    if (!opts.loggedIn) {
                        return { error: "You need to be logged in to use the Pixiv source." };
                    }
                    var search = parseSearch(query.search);
                    var illustParams = [
                        "word=" + encodeURIComponent(search.tags.join(" ")),
                        "offset=" + ((query.page - 1) * 30),
                        "search_target=" + search.mode,
                        "sort=date_desc",
                        "filter=for_ios",
                        "image_sizes=small,medium,large",
                    ];
                    return "https://app-api.pixiv.net/v1/search/illust?" + illustParams.join("&");
                },
                parse: function (src) {
                    var map = {
                        "name": "title",
                        "file_url": "image_urls.large",
                        "sample_url": "image_urls.medium",
                        "preview_url": "image_urls.small",
                        "width": "width",
                        "parent_id": "parent_id",
                        "height": "height",
                        "creator_id": "user.id",
                        "id": "id",
                        "tags": "tags",
                        "author": "user.name",
                    };
                    var data = JSON.parse(src);
                    var images = [];
                    for (var _i = 0, _a = (data["response"] || data["illusts"]); _i < _a.length; _i++) {
                        var image = _a[_i];
                        var img = Grabber.mapFields(image, map);
                        if (image["age_limit"] === "all-age") {
                            img.rating = "safe";
                        }
                        else if (image["age_limit"] === "r18") {
                            img.rating = "explicit";
                        }
                        if (image["is_manga"]) {
                            img.type = "gallery";
                            img.gallery_count = image["page_count"];
                        }
                        if (image["meta_pages"] && image["meta_pages"].length > 1) {
                            img.type = "gallery";
                            img.gallery_count = image["meta_pages"].length;
                        }
                        img.created_at = image["created_time"] || image["create_date"];
                        if (image["caption"]) {
                            img.description = image["caption"];
                        }
                        if (!img.preview_url) {
                            img.preview_url = image["image_urls"]["medium"];
                        }
                        images.push(img);
                    }
                    if (data["response"]) {
                        return {
                            images: images,
                            imageCount: data["pagination"]["total"],
                            pageCount: data["pagination"]["pages"],
                        };
                    }
                    else {
                        return {
                            images: images,
                            urlNextPage: data["next_url"],
                        };
                    }
                },
            },
            gallery: {
                url: function (query) {
                    return "https://public-api.secure.pixiv.net/v1/works/" + query.id + ".json?image_sizes=large";
                },
                parse: function (src) {
                    var data = JSON.parse(src)["response"][0];
                    return {
                        images: data["metadata"]["pages"].map(function (page) {
                            return {
                                file_url: page["image_urls"]["large"],
                                sample_url: page["image_urls"]["medium"],
                                preview_url: urlSampleToThumbnail(page["image_urls"]["medium"]),
                            };
                        }),
                        tags: data["tags"],
                        imageCount: data["page_count"],
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    if (id === "" || id === "0") {
                        return "";
                    } // Gallery images don't have an ID
                    return "https://public-api.secure.pixiv.net/v1/works/" + id + ".json?image_sizes=large";
                },
                parse: function (src) {
                    var data = JSON.parse(src)["response"][0];
                    return {
                        imageUrl: data["image_urls"]["large"],
                        tags: data["tags"],
                        createdAt: data["created_time"],
                    };
                },
            },
        },
    },
};
