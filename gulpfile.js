var gulp = require("gulp");
var webpack = require("gulp-webpack");
var watch = require("gulp-watch");
var http = require("http");
var st = require("st");
var path = require("path");
var s3 = require("gulp-awspublish");
var _ = require("lodash");
var fs = require("fs");
var config = require("./package.json");
var rename = require("gulp-rename");
var moment = require("moment");
var aws = require("aws-sdk");
var jsonfile = require("jsonfile");
var s3Fetch = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

var params = {
  Bucket: process.env.AWS_BUCKET
};

var put = function(data, opts) {
  opts.ContentType = "application/json";
  opts.CacheControl = "max-age=0, no-transform, public";
  params = _.merge(params, opts);
  var result = new Promise(function(resolve, reject) {
    s3Fetch.putObject(params, function(err, res) {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });

  return result;
};

var get = function(file) {
  params.Key = file;
  var result = new Promise(function(resolve, reject) {
    s3Fetch.getObject(params, function(err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });

  return result;
};

var getVersion = function() {
  var file = config.s3URI + "/version.json";
  var result = new Promise(function(resolve, reject) {
    get(file).then(function(res) {
      resolve(JSON.parse(res.Body.toString()));
    }).catch(function(err) {
      if (err.statusCode === 404) {
        var payload = {
          version: 0,
          created_at: moment().toISOString(),
          updated_at: moment().toISOString()
        };
        var opts = {
          Key: file,
          Body: JSON.stringify(payload)
        };
        put(file, opts).then(function(res) {
          resolve(payload);
        }).catch(function(error) {
          reject(error);
        });
      } else {
        reject(err);
      }
    });
  });

  return result;
};

gulp.task("deploy", function() {
  getVersion().then(function(res) {
    var version = res.version + 1;
    var file = config.s3URI + "/" + version + "/build.json";
    var payload = {
      version: version,
      created_at: moment().toISOString(),
      updated_at: moment().toISOString(),
      commit: process.env.CI_COMMIT_ID || null,
      build_uri: process.env.CI_BUILD_URL || null,
      build_number: process.env.CI_BUILD_NUMBER || null,
      committer_name: process.env.CI_COMMITTER_NAME || null,
      committer_email: process.env.CI_COMMITTER_EMAIL || null,
      committer_username: process.env.CI_COMMITTER_USERNAME || null,
      message: process.env.CI_MESSAGE || null
    };
    var opts = {
      Key: file,
      Body: JSON.stringify(payload)
    };
    put(file, opts).then(function(res) {
      var file = config.s3URI + "/version.json";
      var opts = {
        version: version,
        created_at: res.created_at,
        updated_at: moment().toISOString()
      };
      var opts = {
        Key: file,
        Body: JSON.stringify(opts)
      };
      put(file, opts).then(function(result) {
        var publisher = s3.create({
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
          params: {
            Bucket: process.env.AWS_BUCKET
          }
        });

        var headers = {
          "Cache-Control": "max-age=99999999, no-transform, public"
        };

        return gulp.src([ "./dist/*" ])
          .pipe(rename(function(path) {
            path.dirname += "/" + config.s3URI + "/" + version;
          }))
          .pipe(publisher.publish(headers))
          .pipe(s3.reporter());
      });

    });
  }).catch(function(err) {
    console.log(err);
  });
});

gulp.task("html", function() {
  return gulp.src(["./*.html", "./src/**/*.html"])
  .pipe(gulp.dest("dist"));
  //.pipe(livereload());
});

gulp.task("webpack", function() {
  return gulp.src("src/entry.js")
  .pipe(webpack(require("./webpack.config.js")))
  .pipe(gulp.dest("dist/"));
  //.pipe(livereload());
});

gulp.task("server", function(done) {
  http.createServer(
    st({ path: path.join(__dirname, "/dist"), index: "index.html", cache: false })
  ).listen(3001, done);
});

gulp.task("build", ["html", "webpack"]);

gulp.task("watch", [ "server" ], function() {
  //livereload.listen({ basePath: "dist" });
  gulp.watch("./src/**/*.jsx", [ "webpack" ]);
  gulp.watch("./src/**/*.js", [ "webpack" ]);
  gulp.watch("./src/**/*.css", [ "webpack" ]);
  gulp.watch("./src/**/*.html", [ "html" ]);
  // gulp.watch("./dist/*", ["deploy"]);
});

gulp.task("default", function() {
  gulp.start("watch");
});
