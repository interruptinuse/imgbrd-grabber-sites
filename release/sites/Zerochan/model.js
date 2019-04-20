function completeImage(img) {
    if (!img.file_url || img.file_url.length < 5) {
        img.file_url = img.preview_url;
    }
    img.file_url = img.file_url
        .replace(/\/s\d+\.zerochan/, "/static.zerochan")
        .replace(".240.", ".full.")
        .replace(".600.", ".full.")
        .replace("/240/", "/full/")
        .replace("/600/", "/full/");
    if (img.file_size) {
        img.file_size = Grabber.fileSizeToInt(img.file_size);
    }
    return img;
}
export var source = {
    name: "Zerochan",
    modifiers: [],
    forcedTokens: ["filename", "date"],
    tagFormat: {
        case: "upper",
        wordSeparator: " ",
    },
    searchFormat: {
        and: ", ",
    },
    auth: {
        session: {
            type: "post",
            url: "/login",
            fields: [
                {
                    id: "pseudo",
                    key: "name",
                },
                {
                    id: "password",
                    key: "password",
                    type: "password",
                },
                {
                    key: "login",
                    type: "const",
                    value: "Login",
                },
                {
                    key: "ref",
                    type: "const",
                    value: "ref",
                },
            ],
            check: {
                type: "cookie",
                key: "z_hash",
            },
        },
    },
    apis: {
        rss: {
            name: "RSS",
            auth: [],
            forcedLimit: 100,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 100, "p={page}", "o={max}", "o={min}");
                        return "/" + query.search + "?s=id&xml&" + pagePart;
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var parsed = Grabber.parseXML(src);
                    var data = Grabber.makeArray(parsed.rss.channel.item);
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var image = data_1[_i];
                        var img = {
                            page_url: image["link"]["#text"],
                            tags: image["media:keywords"]["#text"].trim().split(", "),
                            preview_url: image["media:thumbnail"]["#text"] || image["media:thumbnail"]["@attributes"]["url"],
                            file_url: image["media:content"]["#text"] || image["media:content"]["@attributes"]["url"],
                            width: image["media:content"]["@attributes"]["width"],
                            height: image["media:content"]["@attributes"]["height"],
                        };
                        img.id = Grabber.regexToConst("id", "/(?<id>\\d+)", img.page_url);
                        img.sample_url = img.file_url;
                        images.push(completeImage(img));
                    }
                    var imageCount = parsed.rss.channel.description
                        ? Grabber.countToInt(Grabber.regexToConst("count", "has (?<count>[0-9,]+) .+? anime images", parsed.rss.channel.description["#text"]))
                        : undefined;
                    return {
                        images: images,
                        imageCount: imageCount,
                    };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 22,
            search: {
                url: function (query, opts, previous) {
                    try {
                        var pagePart = Grabber.pageUrl(query.page, previous, 100, "p={page}", "o={max}", "o={min}");
                        return "/" + query.search + "?" + pagePart;
                    }
                    catch (e) {
                        return { error: e.message };
                    }
                },
                parse: function (src) {
                    var wiki = Grabber.regexToConst("wiki", "<!--.*?shareaholic-canvas.*?-->\\s*<p>(?<wiki>.+?)</p>", src);
                    wiki = wiki ? wiki.replace(/href="\/([^"]+)"/g, 'href="$1"') : wiki;
                    return {
                        tags: Grabber.regexToTags("<li[^>]*>\\s*<a [^>]+>(?<name>[^>]+)</a>\\s+(?:<span>(?<type>[^<]+) (?<count>[0-9]+)</span>|(?<type_2>[^<]*))\\s*</li>", src),
                        images: Grabber.regexToImages("<a href=['\"]/(?<id>[^'\"]+)['\"][^>]*>[^<]*(?:<b>[^<]*</b>)?[^<]*(?:<span>[^<]*</span>)?[^<]*(?<image><img\\s*src=['\"](?<preview_url>[^'\"]*)['\"][^>]+title=['\"](?<width>\\d+)x(?<height>\\d+) (?<file_size>[^'\"]+)['\"][^>]*/?>)", src).map(completeImage),
                        pageCount: Grabber.countToInt(Grabber.regexToConst("page", "page (?:[0-9,]+) of (?<page>[0-9,]+)", src)),
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", "has (?<count>[0-9,]+) .+? anime images", src)),
                        wiki: wiki,
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/" + id;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags("<li[^>]*>\\s*<a [^>]+>(?<name>[^>]+)</a>\\s+(?:<span>(?<type>[^<]+) (?<count>[0-9]+)</span>|(?<type_2>[^<]*))\\s*</li>", src),
                        imageUrl: Grabber.regexToConst("url", '<div id="large">\\s*<a href="(?<url>[^"]+)"[^>]* tabindex="1">', src),
                        createdAt: Grabber.regexToConst("date", 'Entry by <a href="[^"]+">[^<]+</a>\\s*<span title="(?<date>[^"]+)">', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.search(/© [0-9]+-[0-9]+ Zerochan/) !== -1;
                },
            },
        },
    },
};
