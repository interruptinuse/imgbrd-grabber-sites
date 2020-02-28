function cssToObject(css) {
    var ret = {};
    css.split(";").map(function (style) {
        style = style.trim();
        var index = style.indexOf(":");
        if (index < 0) {
            return;
        }
        ret[style.substr(0, index).trim()] = style.substr(index + 1).trim();
    });
    return ret;
}
function sizeToInt(size) {
    var match = size.match(/^(-?)(\d+)\w*$/);
    var val = parseInt(match[2], 10);
    if (match[1].length > 0) {
        return -val;
    }
    return val;
}
function parseSearch(srch) {
    var cats = "0";
    var tags = [];
    var parts = srch.split(" ");
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var tag = parts_1[_i];
        var part = tag.trim();
        if (part.indexOf("cats:") === 0) {
            cats = part.substr(5);
        }
        else {
            tags.push(part);
        }
    }
    var search = tags.join(" ");
    return { cats: cats, search: search };
}
export var source = {
    name: "E-Hentai",
    modifiers: ["cats:"],
    forcedTokens: ["*"],
    searchFormat: {
        and: " ",
    },
    auth: {
        post: {
            type: "post",
            url: "https://forums.e-hentai.org/index.php?act=Login&CODE=01",
            fields: [
                {
                    id: "pseudo",
                    key: "UserName",
                },
                {
                    id: "password",
                    key: "PassWord",
                    type: "password",
                },
                {
                    type: "const",
                    key: "CookieDate",
                    value: "1",
                },
                {
                    type: "const",
                    key: "b",
                    value: "d",
                },
                {
                    type: "const",
                    key: "bt",
                    value: "1-1",
                },
            ],
            check: {
                type: "cookie",
                key: "ipb_member_id",
            },
        },
    },
    apis: {
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 25,
            search: {
                url: function (query) {
                    var s = parseSearch(query.search);
                    return "/?page=" + (query.page - 1) + "&f_cats=" + s.cats + "&f_search=" + encodeURIComponent(s.search);
                },
                parse: function (src) {
                    var rows = src.match(/<tr[^>]*>(.+?)<\/tr>/g);
                    var images = rows.map(function (row) {
                        var match = {};
                        match["type"] = "gallery";
                        var urlName = row.match(new RegExp('<a href="([^"]+?/g/[^"]+)"><div[^>]*>([^>]+)<'));
                        var preview = row.match(new RegExp('<img[^>]* src="([^"]+)"(?: data-src="([^"]+)")?[^>]*>'));
                        var date = row.match(/>(\d{4}-\d{2}-\d{2} \d{2}:\d{2})</);
                        var author = row.match(new RegExp('<a href="[^"]+?/uploader/[^"]+">([^>]+)</a>'));
                        var pages = row.match(/>(\d+) pages</);
                        if (!urlName || !preview || !pages) {
                            return;
                        }
                        match["page_url"] = urlName[1];
                        match["name"] = urlName[2];
                        match["preview_url"] = preview[2] || preview[1];
                        match["gallery_count"] = pages[1];
                        if (date) {
                            match["date"] = date[1];
                        }
                        if (author) {
                            match["author"] = author[1];
                        }
                        var gallery = Grabber.regexMatches("/g/(?<id>\\d+)/(?<token>[^/]+)/", match["page_url"]);
                        match["id"] = gallery[0]["id"];
                        match["token"] = gallery[0]["token"];
                        match["md5"] = match["id"] + "/" + match["token"];
                        return match;
                    });
                    return {
                        images: images,
                        pageCount: Grabber.countToInt(Grabber.regexToConst("page", ">(?<page>[0-9,]+)</a></td><td[^>]*>(?:&gt;|<a[^>]*>&gt;</a>)</td>", src)),
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", ">Showing (?<count>[0-9,]+) results<", src)),
                    };
                },
            },
            gallery: {
                url: function (query) {
                    return "/g/" + query.md5 + "/?p=" + (query.page - 1);
                },
                parse: function (src) {
                    var images = [];
                    var matches = Grabber.regexMatches('<div class="gdtm"[^>]*><div style="(?<div_style>[^"]+)"><a href="(?<page_url>[^"]+)"><img[^>]*></a></div>', src);
                    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
                        var match = matches_1[_i];
                        var styles = cssToObject(match["div_style"]);
                        delete match["div_style"];
                        var background = styles["background"].match(/url\(([^)]+)\) ([^ ]+) ([^ ]+)/);
                        match["preview_url"] = background[1];
                        match["preview_rect"] = [
                            -sizeToInt(background[2]),
                            -sizeToInt(background[3]),
                            sizeToInt(styles["width"]),
                            sizeToInt(styles["height"]),
                        ].join(";"); // x;y;w;h
                        images.push(match);
                    }
                    return {
                        images: images,
                        pageCount: Grabber.countToInt(Grabber.regexToConst("page", ">(?<page>[0-9,]+)</a></td><td[^>]*>(?:&gt;|<a[^>]*>&gt;</a>)</td>", src)),
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", '<p class="gpc">Showing [0-9,]+ - [0-9,]+ of (?<count>[0-9,]+) images</p>', src)),
                        urlNextPage: Grabber.regexToConst("url", '<td[^>]*><a[^>]+href="(?<url>[^"]+)"[^>]*>&gt;</a></td>', src),
                        urlPrevPage: Grabber.regexToConst("url", '<td[^>]*><a[^>]+href="(?<url>[^"]+)"[^>]*>&lt;</a></td>', src),
                    };
                },
            },
        },
    },
};
