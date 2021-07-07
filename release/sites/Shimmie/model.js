// https://shimmie.shishnet.org/ext_doc/index
function isNum(char) {
    return char >= "0" && char <= "9";
}
// See Shimmie2 Tag::caret function
function escapeWithCaret(input) {
    var toCaret = {
        "^": "^",
        "/": "s",
        "\\": "b",
        "?": "q",
        "&": "a",
        ".": "d",
    };
    for (var from in toCaret) {
        var to = toCaret[from];
        input = input.replace(new RegExp("\\" + from, "g"), '^' + to);
    }
    return input;
}
function transformQuery(query) {
    var widthIndex;
    var heightIndex;
    var tags = query.split(" ").map(transformTag);
    for (var i = 0; i < tags.length; ++i) {
        var tag = tags[i];
        if (tag.indexOf("width:") === 0) {
            widthIndex = i;
        }
        else if (tag.indexOf("height:") === 0) {
            heightIndex = i;
        }
    }
    // If both height and width are found, we try to transform them into a "size" operator
    if (widthIndex !== undefined && heightIndex !== undefined) {
        var width = tags[widthIndex].substr(6);
        var height = tags[heightIndex].substr(7);
        var bothNum = isNum(width[0]) && isNum(height[0]);
        var bothEq = width[1] === height[1] && width[1] === "=";
        var sameOp = width[0] === height[0] && (bothEq || (width[1] !== "=" && height[1] !== "=")); // Ensure they both use the same operator
        if (bothNum || sameOp) {
            tags[heightIndex] = "size:" + width + "x" + height.substr(bothNum ? 0 : (bothEq ? 2 : 1));
            tags.splice(widthIndex, 1);
        }
    }
    return tags.join(" ");
}
function transformTag(query) {
    // Ignore basic tag searches
    var parts = query.split(":");
    if (parts.length <= 1) {
        return escapeWithCaret(query);
    }
    // Some meta-tokens have different names than usual
    var metaMapping = {
        date: "posted",
        downvote: "downvoted_by",
        upvote: "upvoted_by",
        tagcount: "tags",
    };
    if (parts[0] in metaMapping) {
        parts[0] = metaMapping[parts[0]];
    }
    // Favorites special case
    if (parts[0] === "fav") {
        if (/^\d+$/.test(parts[1])) {
            parts[0] = "favorited_by_userno";
        }
        else {
            parts[0] = "favourited_by";
        }
    }
    // Range search is not supported so should be split into two parts
    if (parts.length === 2 && parts[1].indexOf("..") >= 0) {
        var range = parts[1].split("..");
        if (range[0] === "") {
            parts[1] = "<=" + range[1];
        }
        else if (range[1] === "") {
            parts[1] = ">=" + range[0];
        }
        else {
            parts[1] = ">=" + range[0] + " " + parts[0] + ":<=" + range[1];
        }
    }
    return parts.join(":");
}
function completeImage(img) {
    if (img.ext && img.ext[0] === ".") {
        img.ext = img.ext.substr(1);
    }
    var hasMd5 = img.md5 && img.md5.length > 0;
    if (!img.file_url || img.file_url.length < 5) {
        img.file_url = !hasMd5 && !img.id && img.preview_url && img.preview_url.length >= 5
            ? img.preview_url.replace("/_thumbs/", "/_images/")
            : (hasMd5
                ? "/_images/" + img.md5 + "." + (img.ext || "jpg")
                : "/_images/" + img.id + "." + (img.ext || "jpg"));
    }
    if (!img.preview_url || img.preview_url.length < 5) {
        img.preview_url = !hasMd5 && !img.id && img.file_url && img.file_url.length >= 5
            ? img.file_url.replace("/_images/", "/_thumbs/")
            : (hasMd5
                ? "/_thumbs/" + img.md5 + ".jpg"
                : "/_thumbs/" + img.id + ".jpg");
    }
    return img;
}
function parseDetails(src) {
    var tags;
    var leftTagBlock = src.match(/<section[^>]*><h3[^>]*>Tags<\/h3>([\s\S]+?)<\/section>/);
    if (leftTagBlock) {
        tags = Grabber.regexToTags('<li class="tag-type-(?<type>[^"]+)">[^<]*<a href="[^"]+">[^<]*</a>[^<]*<a href="[^"]+">(?<name>[^<]+)</a>[^<]*</li>|<a class=[\'"]tag_name[\'"] href=[\'"]([^\'"]+)(?:/1)?[\'"]>(?<name_2>[^<]+)</a>(?:</td><td class=[\'"]tag_count_cell[\'"]>[^<]*<span class=[\'"]tag_count[\'"]>(?<count>\\d+)</span>)?', leftTagBlock[1]);
    }
    else {
        var bottomTagsBlock = src.match(/<tr>\s*<th[^>]*>Tags<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/);
        if (bottomTagsBlock) {
            tags = Grabber.regexToTags("<a[^>]*>(?<name>[^<]+)</a>", bottomTagsBlock[1]);
        }
    }
    return {
        tags: tags,
        imageUrl: Grabber.regexToConst("url", "<img.+?id=['\"]main_image['\"] src=['\"](?<url>[^']+)['\"][^>]*>", src),
        createdAt: Grabber.regexToConst("date", "<time datetime=['\"](?<date>[^'\"]+)['\"]>", src),
    };
}
export var source = {
    name: "Shimmie",
    modifiers: [],
    forcedTokens: ["filename", "date"],
    tagFormat: {
        case: "lower",
        wordSeparator: "_",
    },
    searchFormat: {
        and: " ",
    },
    auth: {
        session: {
            type: "post",
            url: "/user_admin/login",
            fields: [
                {
                    id: "pseudo",
                    key: "user",
                },
                {
                    id: "password",
                    key: "pass",
                    type: "password",
                },
            ],
            check: {
                type: "cookie",
                key: "shm_session",
            },
        },
    },
    apis: {
        rss: {
            name: "RSS",
            auth: [],
            search: {
                url: function (query) {
                    if (query.search.length > 0) {
                        return { error: "Tag search is impossible with Shimmie RSS API." };
                    }
                    return "/rss/images/" + query.page;
                },
                parse: function (src) {
                    var data = Grabber.makeArray(Grabber.parseXML(src).rss.channel.item);
                    var images = [];
                    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                        var image = data_1[_i];
                        var img = {
                            page_url: image["link"]["#text"],
                            preview_url: image["media:thumbnail"]["#text"] || image["media:thumbnail"]["@attributes"]["url"],
                            file_url: image["media:content"]["#text"] || image["media:content"]["@attributes"]["url"],
                            created_at: image["pubDate"]["#text"],
                        };
                        var txt = image["title"]["#text"];
                        var info = (Array.isArray(txt) ? txt.join(" ") : txt).split(" - ");
                        if (info.length === 2) {
                            img.id = parseInt(info[0], 10);
                            img.tags = info[1].toLowerCase().split(" ");
                        }
                        else {
                            img.id = Grabber.regexToConst("id", "/(?<id>\\d+)", img.page_url);
                        }
                        // Some additional fields can be found parsing the HTML description
                        var desc = image["description"]["#text"];
                        var matches = Grabber.regexMatches(" // (?<width>\\d+)x(?<height>\\d+) // (?<file_size>[^'\" /]*?)(?: // (?<ext>[^'\"&]*))?['\"&]", desc);
                        if (matches && matches.length > 0) {
                            var match = matches[0];
                            img.width = match["width"];
                            img.height = match["height"];
                            img.file_size = Grabber.fileSizeToInt(match["file_size"]);
                            if (match["ext"]) {
                                img.ext = match["ext"];
                            }
                        }
                        images.push(completeImage(img));
                    }
                    return { images: images };
                },
            },
        },
        html: {
            name: "Regex",
            auth: [],
            search: {
                parseErrors: true,
                url: function (query) {
                    if (query.search.length > 0) {
                        return "/post/list/" + transformQuery(query.search) + "/" + query.page;
                    }
                    return "/post/list/" + query.page;
                },
                parse: function (src, statusCode) {
                    var _a;
                    // 404 are not really "errors" as they just mean "no result"
                    if (statusCode === 404) {
                        return { images: [] };
                    }
                    // Other invalid status codes must be treated as proper errors
                    if (statusCode < 200 || statusCode >= 300) {
                        return { error: "Loading error: HTTP " + statusCode };
                    }
                    // Redirected to an image (md5:XXX)
                    if (src.indexOf("main_image") !== -1) {
                        var details = parseDetails(src);
                        return {
                            tags: details.tags,
                            images: [completeImage({
                                    id: Grabber.regexToConst("id", "<input[^>]+name=['\"]image_id['\"][^>]+value=['\"](?<id>\\d+)['\"][^>]*>", src),
                                    date: details.createdAt,
                                    file_url: details.imageUrl,
                                    preview_url: (_a = details.imageUrl) === null || _a === void 0 ? void 0 : _a.replace("/_images/", "/_thumbs/"),
                                })],
                            imageCount: 1,
                            pageCount: 1,
                        };
                    }
                    var pageCount = /\| Next \| Last<br>/.test(src)
                        ? Grabber.regexToConst("page", "<a href=['\"]/post/list(?:/[^/]+)?/(?<page>\\d+)['\"]>[^<]+<\/a>(?:<\/b>)? &gt;&gt;", src)
                        : Grabber.regexToConst("page", "<a href=['\"]/post/list(?:/[^/]+)?/(?<page>\\d*)['\"]>Last</a>", src);
                    return {
                        tags: Grabber.regexToTags('<li class="tag-type-(?<type>[^"]+)">[^<]*<a href="[^"]+">[^<]*</a>[^<]*<a href="[^"]+">(?<name>[^<]+)</a>[^<]*</li>|<a class=[\'"]tag_name[\'"] href=[\'"]([^\'"]+)(?:/1)?[\'"]>(?<name_2>[^<]+)</a>(?:</td><td class=[\'"]tag_count_cell[\'"]>[^<]*<span class=[\'"]tag_count[\'"]>(?<count>\\d+)</span>)?', src),
                        images: Grabber.regexToImages("<a(?: class=['\"][^'\"]*['\"])? href=['\"][^'\">]*/post/view/(?<id>[^'\"]+)['\"][^>]*>[^<]*(?<image><img(?: id=['\"](?:[^'\"]*)['\"])? title=['\"](?<tags>[^'\"/]*)(?: // )?(?:(?<width>[^'\"/]+?)x(?<height>[^'\"/]+?) // (?<file_size>[^'\"/]*?)(?: // (?<ext>[^'\"/]*?))?)?(?:\\s+[^'\"/]*)?['\"] alt=['\"][^'\"]*['\"](?: height=['\"][^'\"]*['\"])? width=['\"][^'\"]*['\"](?: height=['\"][^'\"]*['\"])?[^>]*(?:src|data-original)=['\"][^'\"]*(?<preview_url>/_thumbs/(?<md5>[^/]*)/[^'\"]*\\.jpg|/thumb/(?<md5_2>[^'\"]*)\\.jpg|questionable\\.jpg)['\"][^>]*>).*?</a>|<a href=['\"][^'\">]*/i(?<id_2>[^'\"]+)['\"](?: class=['\"][^'\"]*['\"])?[^>]*>[^<]*(?<image_2><img(?: id=['\"](?:[^'\"]*)['\"])? src=['\"][^'\"]*(?<preview_url_2>/_thumbs/(?<md5_3>[^'\"]*)(?:_th)?\\.jpg|/thumb/(?<md5_4>[^'\"]*)\\.jpg|questionable\\.jpg)['\"] title=['\"](?<tags_2>[^'\"/]+) // (?<width_2>[^'\"]+)x(?<height_2>[^'\"]+) // (?<file_size_2>[^'\"]*)(?: // (?<ext_2>[^'\"]*))?['\"] alt=['\"][^'\"]*['\"] ?/?>)[^<]*</a>", src).map(completeImage),
                        pageCount: pageCount,
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/post/view/" + id;
                },
                parse: parseDetails,
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.indexOf("Running Shimmie") !== -1
                        || src.indexOf("Shimmie version ") !== -1
                        || src.search(/Running <a href=['"][^'"]+['"]>Shimmie\d*<\/a>/) !== -1;
                },
            },
        },
    },
};
