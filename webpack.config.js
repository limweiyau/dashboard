const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => ({
  mode: argv.mode || 'development',
  entry: ['./src/renderer/polyfills.js', './src/renderer/index.tsx'],
  target: 'web',
  optimization: {
    minimize: argv.mode === 'production'
  },
  externals: {
    'electron': 'commonjs electron'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json',
            transpileOnly: true
          }
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "global": false,
      "buffer": false,
      "process": false
    }
  },
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist'),
    globalObject: 'this'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    })
  ],
  devtool: 'source-map',
});