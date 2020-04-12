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
    onClickClear: function() {
      this.$data.inputJson = "";
      this.setOutput("");
      this.cacheSetInput("");
      this.eventSort();
    },
    onClickSort: function() {
      this.eventSort();
    },
    onClickCopy: function() {
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
      if (!isJson(input)) {
        {
          let result = undefined;
          try {
            eval(`result=${input};`);
            input = JSON.stringify(result);
          } catch (error) {
            //
          }
        }
        if (typeof input !== "string" || !isJson(input)) {
          this.setOutput("JSON is not valid");
          return;
        }
      }
      let format = JSON.parse(input);
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
      appStorage.setItem("input", value);
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
