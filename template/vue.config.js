const path = require("path");
const RuntimePublicPathPlugin = require('webpack-runtime-public-path-plugin');
const fileManagerPlugin = require('filemanager-webpack-plugin');
const GenerateConfig = require('@jangod/iweb-sdk/generate-config.js');
const Config = GenerateConfig();
const package = require('./package.json')
function resolve(dir) {
    return path.join(__dirname,dir)
}
const CDN = {
    js:[],
    css:[]
}
module.exports = {
    publicPath: Config.context,
    outputDir: `target/${Config.version}/${package.name}`,
    assetsDir: "static",
    runtimeCompiler: false,
    productionSourceMap: false,
    transpileDependencies: ["*"],
    devServer:{
        host: "0.0.0.0",
        port: 8082,
        open: true,
        proxy:{
            '/local': {
                target: 'http://203.175.139.42',
                changeOrigin: true
            }
        }
    },
    configureWebpack: {
        cache:{
            type: 'filesystem',
            allowCollectingMemory: true
        }
    }
    chainWebpack: config =>{
        config.resolve.alias
            .set('@_src',resolve('src'));
        config.plugin('runtime')
            .use(RuntimePublicPathPlugin,[{
                runtimePublicPath: '__iweb_public_path || __iweb_context_path'
            }]);
        config.plugin('define').tap(args => {
            args[0]['process.env'].versionTimestamp = JSON.stringify(new Date().getTime())
            args[0]['process.env'].cdn = JSON.stringify(CDN)
            return args
        });
        config.plugin('webpackBar').use(WebpackBar).tap(args => {
            return [...args, {
                color: 'green', name: "编译中"
            }]});
        config.plugin('html')
            .tap(options => {
                options[0].inject = false;
                return options
            });
        if (process.env.NODE_ENV === 'production') {
            config.plugin('compress')
                .use(fileManagerPlugin, [{
                    events:{
                        onEnd: {
                            delete: [`./${package.name}_*\.zip`,'./public/version.json'],
                            archive: [{source: `./target/${Config.version}`, destination: `./target/${package.name}_${Config.version}.zip`}]
                        }
                    }
                }])
        }
    }
}
