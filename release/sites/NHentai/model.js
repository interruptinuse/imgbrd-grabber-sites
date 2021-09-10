var extensionMap = {
    j: "jpg",
    p: "png",
};
function makeGallery(gallery) {
    gallery.type = "gallery";
    gallery.tags = gallery["tag_ids"].split(" ").map(function (id) { return ({ id: parseInt(id.trim(), 10) }); });
    return gallery;
}
function makeImage(image) {
    image["file_url"] = image["preview_url"]
        .replace("https://t.", "https://i.")
        .replace(/t.jpg$/, ".jpg")
        .replace(/t.png$/, ".png");
    return image;
}
var tagTypeMap = {
    tag: "general",
    language: "meta",
    category: "general",
    character: "character",
    parody: "copyright",
    artist: "artist",
    group: "artist",
};
function makeTag(tag) {
    return {
        id: tag["id"],
        type: tag["type"] in tagTypeMap ? tagTypeMap[tag["type"]] : undefined,
        name: tag["name"],
        count: tag["count"],
    };
}
export var source = {
    name: "NHentai",
    modifiers: ["parodies:", "tag:"],
    forcedTokens: ["*"],
    searchFormat: {
        and: " ",
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            forcedLimit: 25,
            search: {
                url: function (query) {
                    if (query.search.length > 0) {
                        return "/api/galleries/search?page=" + query.page + "&sort=date&query=" + encodeURIComponent(query.search);
                    }
                    return "/api/galleries/all?page=" + query.page + "&sort=date";
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var results = Array.isArray(data) ? data : data["result"];
                    var images = results.map(function (gallery) {
                        var thumb = gallery["images"]["thumbnail"];
                        var img = {
                            type: "gallery",
                            gallery_count: gallery["num_pages"],
                            id: gallery["id"],
                            name: gallery["title"]["english"],
                            created_at: gallery["upload_date"],
                            tags: gallery["tags"].map(makeTag),
                            preview_url: "https://t.nhentai.net/galleries/" + gallery["media_id"] + "/thumb." + extensionMap[thumb["t"]],
                            preview_width: thumb["w"],
                            preview_height: thumb["h"],
                        };
                        return img;
                    });
                    return {
                        images: images,
                        pageCount: data["num_pages"],
                    };
                },
            },
            gallery: {
                url: function (query) {
                    return "/api/gallery/" + query.id;
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var pages = data["images"]["pages"];
                    var images = [];
                    for (var page in pages) {
                        var image = pages[page];
                        var index = parseInt(page, 10) + 1;
                        images.push({
                            created_at: data["upload_date"],
                            tags: data["tags"].map(makeTag),
                            file_url: "https://i.nhentai.net/galleries/" + data["media_id"] + "/" + index + "." + extensionMap[image["t"]],
                            width: image["w"],
                            height: image["h"],
                            preview_url: "https://t.nhentai.net/galleries/" + data["media_id"] + "/" + index + "t." + extensionMap[image["t"]],
                        });
                    }
                    return {
                        images: images,
                        pageCount: 1,
                        imageCount: data["num_pages"],
                    };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 25,
            search: {
                url: function (query) {
                    if (query.search.length > 0) {
                        return "/search/?page=" + query.page + "&q=" + encodeURIComponent(query.search);
                    }
                    return "/?page=" + query.page;
                },
                parse: function (src) {
                    var matches = Grabber.regexMatches('<div class="gallery" data-tags="(?<tag_ids>[0-9 ]+)"><a href="(?<page_url>/g/(?<id>[0-9]+)/)" class="cover"[^>]*><img[^>]*><noscript><img src="(?<preview_url>[^"]+)" width="(?<preview_width>[0-9]+)" height="(?<preview_height>[0-9]+)"[^>]*></noscript><div class="caption">(?<name>[^<]+)</div>', src);
                    var images = matches.map(makeGallery);
                    return {
                        images: images,
                        pageCount: Grabber.regexToConst("page", '<a href="[^"]+page=(?<page>[0-9]+)[^"]*" class="last">', src),
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", "<h2>(?<count>[0-9,]+) Results</h2>", src)),
                    };
                },
            },
            gallery: {
                url: function (query) {
                    return "/g/" + query.id + "/";
                },
                parse: function (src) {
                    var matches = Grabber.regexMatches('<a class="gallerythumb"[^>]*>\\s*<img[^>]*><noscript><img src="(?<preview_url>[^"]+)" width="(?<preview_width>[0-9]+)" height="(?<preview_height>[0-9]+)"[^>]*>', src);
                    var images = matches.map(makeImage);
                    return {
                        images: images,
                        pageCount: 1,
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", '<p class="gpc">Showing [0-9,]+ - [0-9,]+ of (?<count>[0-9,]+) images</p>', src)),
                    };
                },
            },
        },
    },
};
