function noWebp(url) {
    return url.replace(/(\.\w{3,4})\.webp/, "$1");
}
function completeImage(img) {
    if (img.ext && img.ext[0] === ".") {
        img.ext = img.ext.substring(1);
    }
    if ((!img.sample_url || img.sample_url.length < 5) && img.preview_url && img.preview_url.length >= 5) {
        img.sample_url = img.preview_url
            .replace("_cp.", "_bp.")
            .replace("_sp.", "_bp.");
    }
    img.sample_url = noWebp(img.sample_url || "");
    img.preview_url = noWebp(img.preview_url || "");
    img.file_url = img.sample_url.replace(/_[scb]p.\w{2,5}$/, "." + img.ext);
    return img;
}
function sizeToUrl(size, key, ret) {
    var op;
    if (size.indexOf("<=") === 0) {
        size = size.substr(2);
        op = 0;
    }
    else if (size.indexOf(">=") === 0) {
        size = size.substr(2);
        op = 1;
    }
    else if (size[0] === "<") {
        size = String(parseInt(size.substr(1), 10) - 1);
        op = 0;
    }
    else if (size[0] === ">") {
        size = String(parseInt(size.substr(1), 10) + 1);
        op = 1;
    }
    ret.push(key + "=" + size);
    if (op !== undefined) {
        ret.push(key + "_n=" + op);
    }
}
function searchToUrl(page, search, previous) {
    var parts = search.split(" ");
    var tags = [];
    var denied = [];
    var ret = [];
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var tag = parts_1[_i];
        var part = tag.trim();
        if (part.indexOf("width:") === 0) {
            sizeToUrl(part.substr(6), "res_x", ret);
        }
        else if (part.indexOf("height:") === 0) {
            sizeToUrl(part.substr(7), "res_y", ret);
        }
        else if (part.indexOf("ratio:") === 0) {
            ret.push("aspect=" + part.substr(6));
        }
        else if (part.indexOf("order:") === 0) {
            ret.push("order_by=" + part.substr(6));
        }
        else if (part.indexOf("filetype:") === 0) {
            var ext = part.substr(9);
            ret.push("ext_" + ext + "=" + ext);
        }
        else if (part[0] === "-") {
            denied.push(encodeURIComponent(tag.substr(1)));
        }
        else if (tag.length > 0) {
            tags.push(encodeURIComponent(tag));
        }
    }
    if (tags.length > 0) {
        ret.unshift("search_tag=" + tags.join(" "));
    }
    if (denied.length > 0) {
        ret.unshift("denied_tags=" + denied.join(" "));
    }
    if (previous && previous.minDate && previous.page === page - 1) {
        ret.push("last_page=" + (previous.page - 1));
        ret.push("last_post_date=" + previous.minDate);
    }
    return ret.join("&");
}
export var source = {
    name: "Anime pictures",
    modifiers: ["width:", "height:", "ratio:", "order:", "filetype:"],
    forcedTokens: ["tags"],
    tagFormat: {
        case: "lower",
        wordSeparator: " ",
    },
    searchFormat: {
        and: " && ",
        or: " || ",
        parenthesis: false,
        precedence: "and",
    },
    auth: {
        session: {
            type: "post",
            url: "/login/submit",
            fields: [
                {
                    id: "pseudo",
                    key: "login",
                },
                {
                    id: "password",
                    key: "password",
                    type: "password",
                },
            ],
            check: {
                type: "cookie",
                key: "asian_server",
            },
        },
    },
    apis: {
        json: {
            name: "JSON",
            auth: [],
            search: {
                url: function (query, opts, previous) {
                    var page = query.page - 1;
                    return "/pictures/view_posts/" + page + "?" + searchToUrl(query.page, query.search, previous) + "&posts_per_page=" + opts.limit + "&lang=en&type=json";
                },
                parse: function (src) {
                    var map = {
                        "created_at": "pubtime",
                        "preview_url": "small_preview",
                        "width": "width",
                        "md5": "md5",
                        "height": "height",
                        "id": "id",
                        "score": "score_number",
                        "sample_url": "big_preview",
                        "ext": "ext",
                        "file_size": "size",
                    };
                    var data = JSON.parse(src);
                    var images = [];
                    for (var _i = 0, _a = data.posts; _i < _a.length; _i++) {
                        var image = _a[_i];
                        images.push(completeImage(Grabber.mapFields(image, map)));
                    }
                    return {
                        images: images,
                        imageCount: data["posts_count"],
                        pageCount: data["max_pages"] + 1, // max_pages is an index, not a count, and pages start at 0
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/pictures/view_post/" + id + "?lang=en&type=json";
                },
                parse: function (src) {
                    var data = JSON.parse(src);
                    var tags = data["tags_full"].map(function (tag) {
                        return {
                            name: tag["name"],
                            count: tag["num"],
                            typeId: tag["type"],
                        };
                    });
                    var imgUrl = data["file_url"];
                    var pos = imgUrl.lastIndexOf("/") + 1;
                    var fn = imgUrl.substr(pos);
                    return {
                        tags: tags,
                        createdAt: data["pubtime"],
                        imageUrl: imgUrl.substr(0, pos) + (fn.indexOf(" ") !== -1 ? encodeURIComponent(fn) : fn),
                    };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 80,
            search: {
                url: function (query, opts, previous) {
                    var page = query.page - 1;
                    return "/pictures/view_posts/" + page + "?" + searchToUrl(query.page, query.search, previous) + "&lang=en";
                },
                parse: function (src) {
                    var wiki = Grabber.regexToConst("wiki", '<div class="posts_body_head">\\s*<h2>[^<]+</h2>\\s*(?<wiki>.+?)\s*</div>', src);
                    wiki = wiki ? wiki.replace(/href="\/pictures\/view_posts\/0\?search_tag=([^"&]+)(?:&[^"]+)?"/g, 'href="$1"') : wiki;
                    return {
                        images: Grabber.regexToImages('<span[^>]*data-pubtime="(?<created_at>[^"]+)">\\s*<a href="(?<page_url>/pictures/view_post/(?<id>\\d+)[^"]+)"(?:\\s*title="Anime picture (?<width>\\d+)x(?<height>\\d+)")?[^>]*>\\s*(?:<picture[^>]*>\\s*<source[^>]*>\\s*<img\\s*id="[^"]*"\\s*class="img_sp"\\s*src="(?<preview_url>[^"]+)"[^>]*>)?', src).map(completeImage),
                        pageCount: Grabber.regexToConst("page", "page of (?<page>\\d+)", src),
                        wiki: wiki,
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/pictures/view_post/" + id + "?lang=en";
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<li id="tag_li_[^"]+"[^>]*>\\s*<a[^>]*">(?<name>[^<]+)</a>\\s*<span>(?<count>[^<]+)</span>\\s*</li>', src),
                    };
                },
            },
            tags: {
                url: function (query) {
                    var page = query.page - 1;
                    return "/pictures/view_all_tags/" + page + "?lang=en";
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags("<tr>\\s*<td>(?<id>\\d+)</td>\\s*<td>\\s*<a.+?>(?<name>.+?)</a>.*?</td>\\s*<td>.*?</td>\\s*<td>.*?</td>\\s*<td>(?<type>.+?)</td>\\s*<td>(?<count>\\d+)</td>\\s*</tr>", src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("mailto:stalkerg@gmail.com") !== -1;
                },
            },
        },
    },
};
