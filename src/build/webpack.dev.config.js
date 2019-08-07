/**
 * Created by richard.becker on 11/6/18.
 */
'use strict'

const path = require('path');
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { VueLoaderPlugin }  = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')


// The path to the Cesium source code
const cesiumSource = './node_modules/cesium/Source';
const cesiumWorkers = '../Build/Cesium/Workers';

const tabulatorSource = './node_modules/tabulator-tables/dist';
const bootstrapSource = './node_modules/bootstrap/dist';

module.exports = {
  mode: 'development',
  entry: [
    './src/app.js'
  ],
  output: {
    filename: 'main.js',

    // Needed to compile multiline strings in Cesium
    sourcePrefix: ''
  },
  devServer: {
    hot: true,
    disableHostCheck: true,
    watchOptions: {
      poll: true
    }
  },
  module: {
    unknownContextCritical: false,
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|gif|jpg|jpeg|svg|xml|json|czml|glb)$/,
        use: [ 'url-loader' ]
      }
    ]
  },
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true
  },
  node: {
    // Resolve node module use of fs
    fs: 'empty'
  },
  resolve: {
    alias: {
      // Cesium module name
      cesium: path.resolve('./', cesiumSource),
      tabulator: path.resolve('./',tabulatorSource),
      bootstrap: path.resolve('./',bootstrapSource)
    }
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin( {
      filename: 'index.html',
      template: 'index.html',
      inject:true
    }),
    // Copy Cesium Assets, Widgets, and Workers to a static directory
    new CopyWebpackPlugin([ { from: path.join(cesiumSource, cesiumWorkers), to: 'Workers' } ]),
    new CopyWebpackPlugin([ { from: path.join(cesiumSource, 'Assets'), to: 'Assets' } ]),
    new CopyWebpackPlugin([ { from: path.join(cesiumSource, 'Widgets'), to: 'Widgets' } ]),
    new webpack.DefinePlugin({
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify('')
    })
  ]
}