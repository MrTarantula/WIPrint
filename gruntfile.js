/// <binding BeforeBuild='build' />
module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            build: {
                tsconfig: true,
                "outDir": "./build"
            },
            buildTest: {
                tsconfig: "testTsConfig.json",
                "outDir": "./test/",
                src: ["./scripts/**/*.tests.ts"]
            },
            options: {
                fast: 'never'
            }
        },
        exec: {
            package: {
                command: "tfx extension create --rev-version --manifests vss-extension.json",
                stdout: true,
                stderr: true
            },
            package_dev: {
                command: "tfx extension create --manifests vss-extension.json --overrides-file config/dev.json",
                stdout: true,
                stderr: true
            },
        },
        copy: {
            scripts: {
                files: [{
                    expand: true, 
                    flatten: true, 
                    src: ["node_modules/vss-web-extension-sdk/lib/VSS.SDK.min.js", "node_modules/moment/min/moment.min.js"], 
                    dest: "build",
                    filter: "isFile" 
                }]
            }
        },
        clean: ["scripts/**/*.js", "*.vsix", "build", "test"],
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true,
                browsers: ["PhantomJS"]
            }
        }
    });
    
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask("build", ["ts:build", "copy:scripts"]);
    grunt.registerTask("test", ["ts:buildTest", "karma:unit"]);
    grunt.registerTask("package", ["build", "exec:package"]);
    grunt.registerTask("package-dev", ["build", "exec:package_dev"]);
    grunt.registerTask("default", ["package"]);
};