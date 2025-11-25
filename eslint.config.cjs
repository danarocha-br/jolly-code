// eslint.config.cjs – flat config for ESLint v9
const next = require("eslint-config-next");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-config-prettier");

module.exports = [
    // Next.js recommended flat config (includes @typescript-eslint plugin)
    ...next,

    // TypeScript parser configuration (no duplicate plugin definition)
    {
        languageOptions: {
            parser: tsParser, // parser object, not a string
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            // Add any custom TypeScript rules here if desired
        },
    },

    // Prettier integration (flat config)
    {
        ...prettier,
        rules: {
            // Prettier rules are already set to "error"
        },
    },
];
