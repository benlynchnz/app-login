var gulp = require("gulp");
var webpack = require("gulp-webpack");
var watch = require("gulp-watch");
var http = require("http");
var st = require("st");
var path = require("path");
var s3 = require("gulp-awspublish");
var config = require("./package.json");
var rename = require("gulp-rename");
var aws = require("aws-sdk");
var s3Fetch = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

function getVersion(callback) {
  var params = {
    Bucket: process.env.AWS_BUCKET,
    Prefix: config.s3URI
  };

  s3Fetch.listObjects(params, function(err, data) {
    if (err) {
      console.warn(err);
    }
		console.log("data", data);
    var last = data.Contents.sort(function(item) {
      return item.LastModified;
    });

		console.log("last");
		console.log(last);

    var version = last[0].Key.replace(config.s3URI, "").replace("/", "");
    var int = Number(version.replace("/", ""));
    int = int + 1;
    callback(null, int);
  });
}

gulp.task("deploy", function() {

	getVersion(function(err, version) {

  var publisher = s3.create({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    params: {
      Bucket: process.env.AWS_BUCKET
    }
  });

  var headers = {
    "Cache-Control": "max-age=99999999, no-transform, public",
    "Metadata" : {
      "commit": process.env.CI_COMMIT_ID || null,
      "build-url": process.env.CI_BUILD_URL || null,
      "build-number": process.env.CI_BUILD_NUMBER || null,
      "committer-name": process.env.CI_COMMITTER_NAME || null,
      "committer-email": process.env.CI_COMMITTER_EMAIL || null,
      "committer-username": process.env.CI_COMMITTER_USERNAME || null,
      "message": process.env.CI_MESSAGE || null
    }
  };

  return gulp.src([ "./dist/*" ])
    .pipe(rename(function(path) {
      path.dirname += "/" + config.s3URI + "/" + version;
    }))
    .pipe(publisher.publish(headers))
    .pipe(s3.reporter());

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
