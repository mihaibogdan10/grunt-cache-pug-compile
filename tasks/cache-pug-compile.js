'use strict';

module.exports = function(grunt) {
  var fs = require('fs');
  var async = require('async');

  grunt.registerMultiTask('cache-pug-compiler', 'Keep track of the result of compiled pug files.', function () {
    // Force task into async mode and grab a handle to the "done" function.
    var done = this.async();

    // Get a list of all pairs of (.pug, .html) files that the pug task would create
    var i, file, pairsToCompile = [];
    for (i = 0; i < this.files.length; i++) {
      file = this.files[i];

      var src = file.src.filter(function (filepath) {
        // Remove nonexistent files. Warn if a file is not found.
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      });

      if (!src.length) continue;
      if (src.length > 1) {
        // There is no support for this case in cache-pug-compiler for now.
        // It doesn't really make sense to use this task for a case like this, anyway.
        grunt.log.warn('Multiple files "' + src + '" compile into a single destination file. Skipped.');
      }

      pairsToCompile.push({
        pugPath: src[0],
        htmlPath: file.dest
      });
    }

    // Read the last log file. It should contain information about the last grunt-contrib-pug compilation.
    var options = this.options();
    var lastCompile = {};
    if (grunt.file.exists(options.log)) {
      lastCompile = grunt.file.readJSON(options.log);
    }

    async.filter(
      pairsToCompile,
      function (pair, cb) {
        async.map([pair.pugPath, pair.htmlPath], fs.stat, function (err, stats) {
          if (err) return cb(err);

          var pugStats = stats[0], htmlStats = stats[1];
          cb(null, pugStats.mtime >= htmlStats.mtime);
        });
      },
      function (err, pairsToCompile) {
        // In case of error, don't filter anything, let all files compile.
        if (err) {
          grunt.log.error("Error when deciding which files need to skip pug:compile" + err);
          return done();
        }

        // Alter the config of grunt-contrib-pug, to compile the files that we want it to compile.
        var config = grunt.config('pug.compile.files')[0];
        config.src = pairsToCompile.map(function (pair) {
          return pair.pugPath;
        });
        grunt.config('pug.compile.files', [config]);

        grunt.log.writeln(config.src.length + ' pug files passed the filter and will be compiled.');
        done();
      }
    );
  });
};
