const path = require("path");
const config = require("./package.json");
const {BannerPlugin} = require("webpack");

module.exports = {
  mode: 'development',
  devtool: "eval-source-map",
  entry: {
    index: "./src/index.ts",
    download: "./src/download.ts"
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  externals: {...Object.keys(config.dependencies).reduce((prev, cur) => (prev[cur] = `require("${cur}")`, prev), {})},
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new BannerPlugin({
      banner: 'require("source-map-support").install();',
      raw: true,
      entryOnly: false
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  target: "node"
};