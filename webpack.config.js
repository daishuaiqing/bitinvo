var path = require("path");
var webpack = require("webpack");
var BowerWebpackPlugin = require("bower-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var autoprefixer = require('autoprefixer');
var modules = require("./config/modules").modules;
var _ = require("lodash");

var StatsPlugin = require('stats-webpack-plugin');
var I18nPlugin = require("i18n-webpack-plugin");

var languages = {
    "en": null,
    "zh-CN": require("./config/locales/zh-CN.json"),
    "shanghai": require('./config/locales/shanghai.json')
};

var DEBUG = process.env.NODE_ENV !== 'production' ? true : false;

console.log('Is DEBUG : ' + DEBUG);

var devConfig = require('./config/env/development');
console.log(devConfig);
var localConfig = require('./config/local');
console.log(localConfig);

var mixedConfig = _({}).defaults(localConfig).defaults(devConfig).value();
console.log(mixedConfig);

var webpackUrl = mixedConfig.webpackUrl;
var webpackHMRAddress = '';
var plugins = [
    //Webpack’s build process will take this information and work out the magic all on it’s own
    // new webpack.DefinePlugin({
    //     'process.env': {
    //         'NODE_ENV': JSON.stringify('production')
    //     }
    // }),
    // this is to prevent moment.js to load extra locale which is useless , see http://stackoverflow.com/questions/25384360/how-to-prevent-moment-js-from-loading-locales-with-webpack
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en|zh-cn/),
    // put all common js to js commons, I think it is handled by webpack and plugins itself
    new webpack.optimize.CommonsChunkPlugin("commons", "js/commons.js"),
    // extract all css to one single css file with same name with entry
    new ExtractTextPlugin("css/[name].css", {
        disable: false,
        allChunks: false
    }),
    // resolve all bower plugins automatically
    new webpack.ResolverPlugin(
        [
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin(".bower.json", ["main"]),
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
        ]
    ),
    // resolve and inject jquery automatically
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery",
        _ : "lodash",
        log : "common/log",
        UUID : "node-uuid"
    }),
    // new BowerWebpackPlugin({
    //     modulesDirectories: ["bower_components", "assets/component", "assets"],
    //     manifestFiles:      ["bower.json", ".bower.json"],
    //     includes:           /.*/,
    //     excludes:           ['webpack'],
    //     searchResolveModulesDirectories: true
    // }),
    // use webpack i18n plugin to i18n all text in entry.js
    new I18nPlugin(
        languages['shanghai']
    ),

    new StatsPlugin('stats.json', {
        chunkModules: true,
        exclude: [/node_modules[\\\/]react/]
    })
];
if(!DEBUG){
    webpackUrl = require('./config/env/production').webpackUrl;
    plugins = plugins.concat([
            new webpack.optimize.UglifyJsPlugin({
                compress: { warnings: false },
                sourceMap: false
            }),
            new webpack.optimize.OccurrenceOrderPlugin(),
            new webpack.optimize.DedupePlugin(),
        ]
    );
}else{
    var parse = /(http:\/\/[a-zA-Z0-9:\.]*)\/?.*/.exec(webpackUrl);

    if (parse && parse.length > 1){
        webpackHMRAddress = parse[1];
    }
}

var entries =  _.fromPairs(_.map(modules, function(m){
    var entryPathName = ['.', m, 'entry.js'].join('/');
    var wpServerClient = "webpack-dev-server/client?" + webpackHMRAddress;
    var wpServer = "webpack/hot/dev-server";
    var values = [entryPathName];
    if(DEBUG){
        values = values.concat([wpServerClient, wpServer]);
    }
    var kvPair = [m, values];//m = module names
    return kvPair;
}));



console.log('Entries of route');
entries['base'] = './common/base.js';
console.log(entries);

module.exports = {
    context: __dirname + "/assets/app",
    entry: entries,
    output: {
        path: path.join(__dirname, "dist"),
        publicPath: webpackUrl + '/',
        filename: "js/[name].js",
        chunkFilename: "js/[hash]_[id].js",
        hotUpdateMainFilename: "js/[hash].update.json",
        hotUpdateChunkFilename: "js/[hash]_[id].update.js"
    },
    module: {
        noParse: [
            /page\.js$/,
            /sails\.io\.js$/,
            /qs\.js$/
        ],
        loaders: [
            {
                test: /\.css$/,
                loader: "style-loader!css-loader!postcss-loader"
                //loader: ExtractTextPlugin.extract("style-loader", "css-loader!postcss-loader")
            },
            {
                test: /\.less$/,
                loader: "style-loader!css-loader!postcss-loader!less-loader"
                //loader: ExtractTextPlugin.extract("style-loader", "css-loader!postcss-loader!less-loader")
            },
            {
                test: /\.(png|jpg|gif|svg|bmp|jpeg)$/,
                loader: "url-loader?limit=5000&name=img/img-[hash:6].[ext]"
            },
            {
                test: /\.json$/,
                loader: "json"
            },
            {
                test: /\.jade$/,
                loader: "jade-loader"
            },
            {
                test: /\.html$/,
                loader: "html-loader"
            },
            // default settings for bootstrap webpack bundle
            { test: /jquery\.js$/, loader: "expose?$!expose?jQuery" },
            { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
            { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
            { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
            { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
            { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
            {
               test: /wow\.*\.js$/,
               loader: 'exports?this.WOW'
            }
        ]
    },
    postcss: [
        autoprefixer({ browsers: ['Chrome <= 50'] })
    ],
    resolve: {
        root: [
            path.join(__dirname, "./assets"),
            path.join(__dirname, "./assets/component"),
            path.join(__dirname, "./node_modules"),
            path.join(__dirname, "./bower_components"),
        ],
        alias : {
            'common' : path.join(__dirname, "./assets/app/common"),
            'locales' : path.join(__dirname, "./config/locales"),
            'waves' : path.join(__dirname, "./bower_components/Waves")
        },
        modulesDirectories: ["node_modules", "bower_components"]
    },
    // Use the plugin to specify the resulting filename (and add needed behavior to the compiler)
    plugins: plugins,
    devtool: "#inline-source-map",
    debug : DEBUG,
    // Still, you need to run the server webpack-dev-server -d --hot --progress
    devServer: {
        hot: true,
        progress: true,
        colors: true,
        contentBase: path.join(__dirname, "dist"),
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    }
};
