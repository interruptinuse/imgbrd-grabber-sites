export var source = {
    name: "FurAffinity",
    tagFormat: {
        case: "lower",
        wordSeparator: "_",
    },
    searchFormat: {
        and: " ",
        or: " | ",
        parenthesis: true,
        precedence: "or",
    },
    apis: {
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 24,
            search: {
                parseErrors: true,
                url: function (query) {
                    return "/search/?q=" + encodeURIComponent(query.search) + "&order-by=date&page=" + query.page + "&perpage=24";
                },
                parse: function (src, statusCode) {
                    return {
                        images: Grabber.regexToImages('<figure id="sid-(?<id>\\d+)" class="r-(?<rating>[^"]+) t-image u-(?<author>[^"]+)">.+?<img.+?src="(?<preview_url>[^"]+)"\\s*data-width="(?<preview_width>[0-9.]+)"\\s*data-height="(?<preview_height>[0-9.]+)"', src),
                        imageCount: Grabber.regexToConst("count", "<strong>Search results</strong> \\(\\d+ - \\d+ of (?<count>\\d+)\\)", src),
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/view/" + id + "/";
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<a href="/search/@keywords [^"]+">(?<name>[^<]+)</a>', src),
                        createdAt: Grabber.regexToConst("date", '<b>Posted:</b> <span title="(?<date>[^"]+)" class="popup_date">', src),
                        imageUrl: Grabber.regexToConst("url", '<a href="(?<url>[^"]+)">Download</a>', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Fur Affinity is &copy;") !== -1;
                },
            },
        },
    },
};
