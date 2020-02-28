function completeImage(img) {
    if (!img.file_url || img.file_url.length < 5) {
        img.file_url = img.preview_url
            .replace("/thumbnails/", "/images/")
            .replace("/thumbnail_", "/");
    }
    return img;
}
export var source = {
    name: "Gelbooru (0.1)",
    modifiers: ["rating:safe", "rating:questionable", "rating:explicit", "user:", "fav:", "fastfav:", "md5:", "source:", "id:", "width:", "height:", "score:", "mpixels:", "filesize:", "date:", "gentags:", "arttags:", "chartags:", "copytags:", "approver:", "parent:", "sub:", "order:id", "order:id_desc", "order:score", "order:score_asc", "order:mpixels", "order:mpixels_asc", "order:filesize", "order:landscape", "order:portrait", "order:favcount", "order:rank", "parent:none", "unlocked:rating"],
    tagFormat: {
        case: "lower",
        wordSeparator: "_",
    },
    searchFormat: {
        and: " ",
    },
    auth: {},
    apis: {
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 20,
            search: {
                url: function (query) {
                    var page = (query.page - 1) * 20;
                    var search = query.search && query.search.length > 0 ? encodeURIComponent(query.search) : "all";
                    return "/index.php?page=post&s=list&tags=" + search + "&pid=" + page;
                },
                parse: function (src) {
                    var pageCount = Grabber.regexToConst("page", '<a href="[^"]+pid=(?<page>\\d+)" alt="last page">&gt;&gt;</a>', src);
                    return {
                        images: Grabber.regexToImages('<span class="thumb"><a id="p(?<id>\\d+)" href="[^"]+"><img src="(?<preview_url>[^"]*thumbnail_(?<md5>[^.]+)\\.[^"]+)" alt="post" border="0" title=" *(?<tags>[^"]*) *score:(?<score>[^ "]+) *rating:(?<rating>[^ "]+) *"/></a>[^<]*(?:<script type="text/javascript">[^<]*//<!\\[CDATA\\[[^<]*posts\\[[^]]+\\] = \\{\'tags\':\'(?<tags_2>[^\']+)\'\\.split\\(/ /g\\), \'rating\':\'(?<rating_2>[^\']+)\', \'score\':(?<score_2>[^,]+), \'user\':\'(?<author>[^\']+)\'\\}[^<]*//\\]\\]>[^<]*</script>)?</span>', src).map(completeImage),
                        pageCount: pageCount ? (parseInt(pageCount, 10) / 20) + 1 : undefined,
                        tags: Grabber.regexToTags('<li><a[^>]*>\\+</a><a [^>]*>-</a> <span [^>]*>\\? <a href="[^"]*">(?<name>[^<]+)</a> (?<count>\\d+)</span></li>', src),
                    };
                },
            },
            details: {
                url: function (id, md5) {
                    return "/index.php?page=post&s=view&id=" + id;
                },
                parse: function (src) {
                    return {
                        tags: Grabber.regexToTags('<li><a[^>]*>\\+</a><a [^>]*>-</a> <span [^>]*>\\? <a href="[^"]*">(?<name>[^<]+)</a> (?<count>\\d+)</span></li>', src),
                        imageUrl: Grabber.regexToConst("url", '<img[^>]+src="([^"]+)"[^>]+onclick="Note\\.toggle\\(\\);"[^>]*/>', src),
                    };
                },
            },
            check: {
                url: function () {
                    return "/";
                },
                parse: function (src) {
                    return src.search(/Running Gelbooru(?: Beta)? 0\.1/) !== -1
                        || src.search(/Running <a[^>]*>Gelbooru<\/a>(?: Beta)? 0\.1/) !== -1;
                },
            },
        },
    },
};
