const FallbackLocalStorage = globalThis.FallbackLocalStorage;
let appStorage;
if (FallbackLocalStorage.getStorage().includes("localStorage")) {
    appStorage = globalThis.localStorage;
} else {
    appStorage = new FallbackLocalStorage();
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

/**
 * @name objectKeys
 * @param {Object} object
 * @returns {Array.<string>}
 */
function objectKeys(object) {
    return Object.keys(object).sort((alpha, beta) => alpha.localeCompare(beta));
}

/**
 * name isObjectLike
 * @param {*} value
 * @returns {boolean}
 */
function isObjectLike(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @name collectionSortKeys
 * @param {*} value
 * @param {boolean=true} isDeep
 * @returns {*}
 */
function collectionSortKeys(value, isDeep = true) {
    if (!isObjectLike(value)) {
        if (Array.isArray(value)) {
            return value.map((arrayValue) => collectionSortKeys(arrayValue, isDeep));
        }
        return value;
    }
    const keys = objectKeys(value);
    if (!keys.length) {
        return value;
    }
    return keys.reduce((sorted, key) => {
        if (isDeep && isObjectLike(value[key])) {
            sorted[key] = collectionSortKeys(value[key], isDeep);
        } else if (isDeep && Array.isArray(value[key])) {
            sorted[key] = collectionSortKeys(value[key], isDeep);
        } else {
            sorted[key] = value[key];
        }
        return sorted;
    }, {});
}

function deepen(obj) {
    const result = {};
    for (const objectPath in obj) {
        const parts = objectPath.split(".");
        let target = result;
        while (parts.length > 1) {
            const part = parts.shift();
            target = target[part] = target[part] || {};
        }
        target[parts[0]] = obj[objectPath];
    }
    return result;
}

function objectKeysSort(objectLike) {
    return Object.keys(objectLike)
        .sort((alpha, beta) => alpha.localeCompare(beta))
        .reduce((sorted, key) => {
            if (objectLike[key] && typeof objectLike[key] === "object" && !Array.isArray(objectLike[key])) {
                sorted[key] = objectKeysSort(objectLike[key]);
            } else {
                sorted[key] = objectLike[key];
            }
            return sorted;
        }, Object.create(Object.getPrototypeOf(objectLike)));
}

function convertUrlToJson(urlString) {
    const url = new URL(urlString);
    const searchParams = Object.fromEntries(url.searchParams);
    const json = {
        flags: url["flags"] || undefined,
        hash: url.hash,
        host: url.host,
        hostname: url.hostname,
        href: url.href,
        origin: url.origin,
        path: url["path"] || url.pathname.split("/").slice(1),
        password: url.password,
        pathname: url.pathname,
        port: url.port ? Number.parseInt(url.port, 10) : "",
        protocol: url.protocol,
        scheme: url["scheme"] || undefined,
        // search: url.search,
        searchParams: searchParams,
        searchProps: deepen(searchParams),
        username: url.username,
    };
    return objectKeysSort(JSON.parse(JSON.stringify(json)));
}

const indentList = ["2spaces", "4spaces", "tabs"];

const app = new Vue({
    el: "#app",
    data: {
        inputJson: "",
        outputJson: "",
        outputCode: "",
        outputTextarea: "",
        config: {
            indent: "2spaces"
        }
    },
    mounted() {
        const input = this.cacheGetInput();
        const indent = this.cacheGetIndent();
        this.$data.inputJson = input;
        this.$data.config.indent = indent;
        this.eventSort();
    },
    methods: {
        onClickClear: function () {
            this.$data.inputJson = "";
            this.setOutput("");
            this.cacheSetInput("");
            this.eventSort();
        },
        onClickSort: function () {
            this.eventSort();
        },
        onClickCopy: function () {
            const text = this.$refs.outputTextarea;
            text.value = this.$data.outputJson;
            text.select();
            text.setSelectionRange(0, 99999);
            document.execCommand("copy");
        },
        onClickIndent() {
            this.onConfigChange();
        },
        onConfigChange() {
            this.cacheSetIndent(this.$data.config.indent);
            this.eventSort();
        },
        eventSort() {
            let input = this.$data.inputJson;
            if (input.length === 0) {
                this.setOutput("");
                this.cacheSetInput("");
                return;
            }
            const isUrl = (input.length > 14) && (input.startsWith("https://") || input.startsWith("http://"));


            if (isUrl) {


                try {
                    input = convertUrlToJson(input);
                    input = JSON.stringify(input);
                } catch (error) {
                    console.warn(error);
                }
            }
            if (!isJson(input)) {
                {
                    let result = undefined;
                    try {
                        eval(`result = ${input};`);
                        input = JSON.stringify(result);
                    } catch (error) {
                        //
                    }
                }
                if (typeof input !== "string" || !isJson(input)) {
                    this.setOutput("JSON is not valid");
                    return;
                }
            } else {
                try {
                    input = JSON.parse(input);
                } catch (error) {
                    //
                }
            }
            // let format = JSON.parse(input);
            let format = input;
            try {
                format = JSON.parse(input);
            } catch (error) {
                //
            }
            format = collectionSortKeys(format);

            switch (this.$data.config.indent) {
                case "2spaces":
                    this.setOutput(JSON.stringify(format, null, 2));
                    break;
                case "4spaces":
                    this.setOutput(JSON.stringify(format, null, 4));
                    break;
                case "tabs":
                    this.setOutput(JSON.stringify(format, null, "\t"));
                    break;
            }
            this.cacheSetInput(input);
        },
        setOutput(value) {
            this.$data.outputJson = value;
            this.$data.outputCode = Prism.highlight(value, Prism.languages.json, "json");
        },
        cacheGetInput(value) {
            const input = appStorage.getItem("input");
            if (input === null) {
                return "";
            }
            return input;
        },
        cacheSetInput(value) {
            try {
                appStorage.setItem("input", JSON.stringify(value));
            } catch {
                appStorage.setItem("input", value);
            }
        },
        cacheGetIndent(value) {
            const indent = appStorage.getItem("indent");
            if (indentList.includes(indent)) {
                return indent;
            }
            return "2spaces";
        },
        cacheSetIndent(value) {
            appStorage.setItem("indent", value);
        }
    }
});
