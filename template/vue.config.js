const path = require("path");
const RuntimePublicPathPlugin = require('webpack-runtime-public-path-plugin');
const fileManagerPlugin = require('filemanager-webpack-plugin');
const WebpackBar = require('webpackbar');
const GenerateConfig = require('@jangod/iweb-sdk/generate-config.js');
const Config = GenerateConfig();
const package = require('./package.json')
const InjectionPlugin = require("@jangod/iweb-sdk/loader/dev-injection-plugin");
const devInjectionPlugin = new InjectionPlugin();
const cdnSyncObj = devInjectionPlugin.getCDNSyncObject();
function resolve(dir) {
    return path.join(__dirname,dir)
}
const outputPath = `./target/dist/${Config.appId}`
module.exports = {
    publicPath: Config.context,
    outputDir: outputPath,
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
        },
        externals: cdnSyncObj.externals
    },
    chainWebpack: config =>{
        config.resolve.alias
            .set('@_src',resolve('src'));
        config.plugin('runtime')
            .use(RuntimePublicPathPlugin,[{
                runtimePublicPath: '__iweb_public_path || __iweb_context_path'
            }]);
        config.plugin('define').tap(args => {
            args[0]['process.env'].versionTimestamp = JSON.stringify(new Date().getTime())
            args[0]['process.env'].cdn = JSON.stringify(cdnSyncObj.cdn)
            args[0]['process.env'].plugins = JSON.stringify(devInjectionPlugin.getPlugins())
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
                            delete: [`./target/${Config.appId}_${Config.active}_*\.zip`,'./public/version.json'],
                             archive: [
                                {
                                    source: `${outputPath.substring(0,outputPath.lastIndexOf("/"))}`,
                                    destination: `./target/${Config.appId}_${Config.active}_${Config.version}.zip`
                                }
                            ]
                        }
                    }
                }])
        }
    }
}
