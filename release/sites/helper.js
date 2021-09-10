"use strict";
function addHelper(name, value) {
    Object.defineProperty(Grabber, name, { value: value });
}
addHelper("makeArray", function (val, allowFalsy) {
    if (allowFalsy === void 0) { allowFalsy = false; }
    if (!val && !allowFalsy) {
        return [];
    }
    if (!Array.isArray(val)) {
        return [val];
    }
    return val;
});
addHelper("regexMatch", function (regexp, src) {
    var matches = Grabber.regexMatches(regexp, src);
    if (matches && matches.length > 0) {
        return matches[0];
    }
    return undefined;
});
addHelper("mapObject", function (obj, fn) {
    var ret = {};
    for (var k in obj) {
        ret[k] = fn(obj[k]);
    }
    return ret;
});
addHelper("typedXML", function (val) {
    if (val && typeof val === "object" && ("#text" in val || "@attributes" in val)) {
        var txt = val["#text"];
        var isNil = "@attributes" in val && "nil" in val["@attributes"] && val["@attributes"]["nil"] === "true";
        if (isNil) {
            return null;
        }
        var type = "@attributes" in val && "type" in val["@attributes"] ? val["@attributes"]["type"] : undefined;
        if (type === "integer") {
            return parseInt(txt, 10);
        }
        else if (type === "array") {
            delete val["@attributes"]["type"];
            if (Object.keys(val["@attributes"]).length === 0) {
                delete val["@attributes"];
            }
            return Grabber.mapObject(val, Grabber.typedXML);
        }
        if (txt !== undefined) {
            return txt;
        }
    }
    if (val && val instanceof Array) {
        return val.map(Grabber.typedXML);
    }
    if (val && typeof val === "object") {
        if (Object.keys(val).length === 0) {
            return "";
        }
        return Grabber.mapObject(val, Grabber.typedXML);
    }
    return val;
});
addHelper("mapFields", function (data, map) {
    var result = {};
    if (typeof data !== "object") {
        return result;
    }
    for (var to in map) {
        var from = map[to].split(".");
        var val = data;
        for (var _i = 0, from_1 = from; _i < from_1.length; _i++) {
            var part = from_1[_i];
            val = part in val && val[part] !== null ? val[part] : undefined;
        }
        result[to] = val !== data ? val : undefined;
    }
    return result;
});
addHelper("countToInt", function (str) {
    if (!str) {
        return undefined;
    }
    var count;
    var normalized = str.toLowerCase().trim().replace(/,/g, "");
    if (normalized.slice(-1) === "k") {
        var withoutK = normalized.substring(0, normalized.length - 1).trim();
        count = parseFloat(withoutK) * 1000;
    }
    else {
        count = parseFloat(normalized);
    }
    return Math.round(count);
});
addHelper("fileSizeToInt", function (str) {
    if (typeof str !== "string") {
        return str;
    }
    var res = str.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
    if (res) {
        var val = parseFloat(res[1]);
        var unit = res[2].toLowerCase();
        if (unit === "mb") {
            return Math.round(val * 1024 * 1024);
        }
        if (unit === "kb") {
            return Math.round(val * 1024);
        }
        return Math.round(val);
    }
    return parseInt(str, 10);
});
addHelper("fixPageUrl", function (url, page, previous, pageTransformer) {
    if (!pageTransformer) {
        pageTransformer = function (p) { return p; };
    }
    url = url.replace("{page}", String(pageTransformer(page)));
    if (previous) {
        url = url.replace("{min}", previous.minId);
        url = url.replace("{max}", previous.maxId);
        url = url.replace("{min-1}", previous.minIdM1);
        url = url.replace("{max+1}", previous.maxIdP1);
    }
    return url;
});
addHelper("pageUrl", function (page, previous, limit, ifBelow, ifPrev, ifNext, pageTransformer) {
    var pageLimit = pageTransformer ? pageTransformer(page) : page;
    if (pageLimit <= limit || limit < 0) {
        return Grabber.fixPageUrl(ifBelow, page, previous, pageTransformer);
    }
    if (previous && previous.page === page + 1) {
        return Grabber.fixPageUrl(ifPrev, page, previous, pageTransformer);
    }
    if (previous && previous.page === page - 1) {
        return Grabber.fixPageUrl(ifNext, page, previous, pageTransformer);
    }
    throw new Error("You need valid previous page information to browse that far");
});
addHelper("regexToImages", function (regexp, src) {
    var images = [];
    var matches = Grabber.regexMatches(regexp, src);
    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
        var match = matches_1[_i];
        if ("json" in match) {
            var json = JSON.parse(match["json"]);
            for (var key in json) {
                match[key] = json[key];
            }
        }
        if (match.id) {
            match.id = parseInt(match.id, 10);
        }
        if (match.file_size) {
            match.file_size = Grabber.fileSizeToInt(match.file_size);
        }
        images.push(match);
    }
    return images;
});
addHelper("pick", function (obj, keys) {
    return keys.reduce(function (ret, key) {
        if (key in obj && obj[key] !== undefined) {
            ret[key] = obj[key];
        }
        return ret;
    }, {});
});
addHelper("regexToTags", function (regexp, src) {
    var tags = [];
    var uniques = {};
    var matches = Grabber.regexMatches(regexp, src);
    for (var _i = 0, matches_2 = matches; _i < matches_2.length; _i++) {
        var match = matches_2[_i];
        if (match["name"] in uniques) {
            continue;
        }
        if ("count" in match) {
            match["count"] = Grabber.countToInt(match["count"]);
        }
        tags.push(Grabber.pick(match, ["id", "name", "count", "type", "typeId"]));
        uniques[match["name"]] = true;
    }
    return tags;
});
addHelper("regexToPools", function (regexp, src) {
    var pools = [];
    var matches = Grabber.regexMatches(regexp, src);
    for (var _i = 0, matches_3 = matches; _i < matches_3.length; _i++) {
        var match = matches_3[_i];
        pools.push(match);
    }
    return pools;
});
addHelper("regexToConst", function (key, regexp, src) {
    var matches = Grabber.regexMatches(regexp, src);
    for (var _i = 0, matches_4 = matches; _i < matches_4.length; _i++) {
        var match = matches_4[_i];
        return match[key];
    }
    return undefined;
});
