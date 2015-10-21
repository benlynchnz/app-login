var gulp = require("gulp");
var webpack = require("gulp-webpack");
var watch = require("gulp-watch");
var http = require("http");
var st = require("st");
var path = require("path");
var s3 = require("gulp-awspublish");
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

function getVersion(callback) {
  var params = {
    Bucket: process.env.AWS_BUCKET,
    Key: config.s3URI + "/version.json"
    // Prefix: config.s3URI
  };

  s3Fetch.getObject(params, function(err, data) {
    if (err && err.statusCode === 404) {
      console.warn(err);
      var file = "./version.json";
      var obj = {
        version: 0,
        created_at: moment().toISOString(),
        updated_at: moment().toISOString()
      };
      jsonfile.writeFile(file, obj, { spaces: 2 }, function(error) {
        console.error(error);
        var params = {
          Bucket: process.env.AWS_BUCKET,
          Key: config.s3URI + "/version.json",
          Body: new Buffer(fs.readFileSync("./version.json")).toString(),
          ContentType: "application/json",
          CacheControl: "max-age=0, no-transform, public"
        };
        s3Fetch.putObject(params, function(err, data) {
          console.log(err);
          console.log(data);
        });
      });
    } else {
	    console.log(data);

			var file = new Buffer(data.Body).toString();
			file = JSON.parse(file);

			var version = file.version + 1;
			callback(null, version);
		}
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
