const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  babel: {
    plugins: ["@emotion"],
    loaderOptions: {
      cacheDirectory: true,
    },
  },
  webpack: {
    configure: (webpackConfig, { env: webpackEnv, paths }) => {
      const isEnvDevelopment = webpackEnv === "development";
      const isEnvProduction = webpackEnv === "production";

      // Set CSP following the best practice of Electron: https://www.electronjs.org/docs/latest/tutorial/security#7-define-a-content-security-policy
      const htmlWebpackPlugin = webpackConfig.plugins.find(
        (plugin) => plugin instanceof HtmlWebpackPlugin
      );

      const cspSourceForMap =
        "https://data.streamlit.io/ https://*.mapbox.com/";
      const csp = [
        "default-src 'self'",
        // 'unsafe-eval' is necessary to run the Wasm code
        "script-src 'self' 'unsafe-eval'",
        // style-src is necessary because of emotion. In dev, style-loader with injectType=styleTag is also the reason.
        "style-src 'self' 'unsafe-inline'",
        // The worker is inlined as blob: https://github.com/whitphx/stlite/blob/v0.7.1/packages/stlite-kernel/src/kernel.ts#L16
        "worker-src blob:",
        "script-src-elem 'self' blob: https://cdn.jsdelivr.net/",
        // Allow loading the hosted Pyodide files, wheels, and some remote resources
        isEnvProduction && `connect-src ${cspSourceForMap} 'self'`,
        isEnvDevelopment &&
          `connect-src ${cspSourceForMap} https://cdn.jsdelivr.net/ https://pypi.org/ https://files.pythonhosted.org/ http://localhost:3000/ ws://localhost:3000/`,
        // Allow <img> to load any resources. blob: is necessary for st.pyplot, data: is for st.map
        "img-src * blob: data:",
        // Allow <audio> and <video> to load any resources
        "media-src * blob:",
      ]
        .filter(Boolean)
        .join("; ");
      htmlWebpackPlugin.options.meta["Content-Security-Policy"] = {
        "http-equiv": "Content-Security-Policy",
        content: csp,
      };

      // Let Babel compile outside of src/.
      // Ref: https://muguku.medium.com/fix-go-to-definition-and-hot-reload-in-a-react-typescript-monorepo-362908716d0e
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
      const tsRule = oneOfRule.oneOf.find((rule) =>
        rule.test.toString().includes("ts|tsx")
      );
      tsRule.include = undefined;
      tsRule.exclude = /node_modules/;

      /* To resolve the alias streamlit/frontend uses */
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        src: path.resolve(__dirname, "../../streamlit/frontend/src"),
      };

      /* To build Streamlit. These configs are copied from streamlit/frontend/craco.config.js */
      // Apache Arrow uses .mjs
      webpackConfig.module.rules.push({
        include: /node_modules/,
        test: /\.mjs$/,
        type: "javascript/auto",
      });

      /* For file-loader that resolves the wheels */
      // Since Webpack5, Asset Modules has been introduced to cover what file-loader had done.
      // However, in this project, we use the inline loader setting like `import * from "!!file-loader!/path/to/file"` to use file-loader
      // but it does not turn off Asset Modules and leads to duplicate assets generated.
      // To make matters worse, the actually resolved paths from such import statements point to the URL from Asset Modules, not the file-loader specified with the inline syntax,
      // then we don't obtain the expected result.
      // So we turn off Asset Modules here by setting `type: 'javascript/auto'`.
      // See https://webpack.js.org/guides/asset-modules/
      // TODO: Enable when using Webpack 5.
      // webpackConfig.module.rules.push({
      //   test: /\.whl$/i,
      //   use: [
      //     {
      //       loader: 'file-loader',
      //     }
      //   ],
      //   type: 'javascript/auto'
      // })

      return webpackConfig;
    },
  },
  jest: {
    configure: (jestConfig, { env, paths, resolve, rootDir }) => {
      jestConfig.roots = [...jestConfig.roots, "<rootDir>/electron"];
      jestConfig.collectCoverageFrom = [
        ...jestConfig.collectCoverageFrom,
        "electron/**/*.{js,jsx,ts,tsx}",
        "!electron/**/*.d.ts",
      ];
      jestConfig.testMatch = [
        ...jestConfig.testMatch,
        "<rootDir>/electron/**/__tests__/**/*.{js,jsx,ts,tsx}",
        "<rootDir>/electron/**/*.{spec,test}.{js,jsx,ts,tsx}",
      ];
      return jestConfig;
    },
  },
};
