function urlSampleToFull(url) {
    return url
        .replace("img-master", "img-original")
        .replace(/_master\d+\./, ".");
}
function urlSampleToThumbnail(url) {
    return url.replace("/img-master/", "/c/150x150/img-master/");
}
export var source = {
    name: "Pixiv",
    modifiers: [],
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
            auth: ["oauth2"],
            maxLimit: 1000,
            search: {
                url: function (query, opts) {
                    var params = [
                        "q=" + query.search,
                        "page=" + query.page,
                        "per_page=" + opts.limit,
                        "period=all",
                        "order=desc",
                        "mode=caption",
                        "sort=date",
                        "image_sizes=small,medium,large",
                    ];
                    return "https://public-api.secure.pixiv.net/v1/search/works.json?" + params.join("&");
                },
                parse: function (src) {
                    var map = {
                        "name": "title",
                        "created_at": "created_time",
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
                    for (var _i = 0, _a = data["response"]; _i < _a.length; _i++) {
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
                        images.push(img);
                    }
                    return {
                        images: images,
                        imageCount: data["pagination"]["total"],
                        pageCount: data["pagination"]["pages"],
                    };
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
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 40,
            search: {
                url: function (query) {
                    return "/search.php?s_mode=s_tag&order=date_d&p=" + query.page + "&word=" + encodeURIComponent(query.search);
                },
                parse: function (src) {
                    // Page data is stored in the data attributes of a hidden React container
                    var rawData = src.match(/<input type="hidden"\s*id="js-mount-point-search-result-list"\s*data-items="([^"]+)"\s*data-related-tags="([^"]+)"/i);
                    var rawItems = JSON.parse(Grabber.htmlDecode(rawData[1]));
                    var rawTags = JSON.parse(Grabber.htmlDecode(rawData[2]));
                    // Parse tags, giving translation the priority to allow user to use other languages than Japanese
                    var tags = rawTags.map(function (data) {
                        return data["tag_translation"] || data["tag"];
                    });
                    // Parse images
                    var imgMap = {
                        id: "illustId",
                        name: "illustTitle",
                        author: "userName",
                        creator_id: "userId",
                        tags: "tags",
                        width: "width",
                        height: "height",
                        preview_url: "url",
                    };
                    var images = rawItems.map(function (data) {
                        var img = Grabber.mapFields(data, imgMap);
                        img.sample_url = img.preview_url.replace(/\/c\/\d+x\d+\/img-master\//g, "/img-master/");
                        img.file_url = urlSampleToFull(img.sample_url);
                        if (data["pageCount"] > 1) {
                            img.type = "gallery";
                            img.gallery_count = data["pageCount"];
                        }
                        return img;
                    });
                    return {
                        images: images,
                        tags: tags,
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", '<span class="count-badge">(?<count>\\d+)[^<]+</span>', src)),
                    };
                },
            },
            gallery: {
                url: function (query) {
                    return "/member_illust.php?mode=manga&illust_id=" + query.id;
                },
                parse: function (src) {
                    var rawImages = Grabber.regexMatches('<img[^<]+data-filter="manga-image"[^>]*data-src="(?<sample_url>[^"]+)"[^>]*>', src);
                    var images = rawImages.map(function (img) {
                        img.file_url = urlSampleToFull(img.sample_url);
                        img.preview_url = urlSampleToThumbnail(img.sample_url);
                        return img;
                    });
                    return { images: images };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/member_illust.php?mode=medium&illust_id=" + id;
                },
                parse: function (src) {
                    var data = Grabber.regexMatch('<div class="img-container">\\s*<a[^>]+>\\s*<img\\s+src="(?<sample_url>[^"]+)"\\s*alt="(?<title>[^"]+)/(?<author>[^"]+)"', src);
                    var tags = Grabber.regexToTags('<a href="/tags\\.php[^"]+" class="text">(?<name>[^<]+)<', src);
                    // Page data is stored in a JS call when logged in
                    // const rawData = src.match(/}\)\(([^)]+)\)/)[1];
                    return {
                        imageUrl: urlSampleToFull(data["sample_url"]),
                        tags: tags,
                    };
                },
            },
        },
    },
};
