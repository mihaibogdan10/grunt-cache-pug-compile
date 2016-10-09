'use strict';

module.exports = function(grunt) {
  var fs = require('fs');
  var async = require('async');

  grunt.registerMultiTask('cache-pug-compiler', 'Keep track of the result of compiled pug files.', function () {
    // Force task into async mode and grab a handle to the "done" function.
    var done = this.async();

    // Get the options passed to this taks
    var options = this.options();

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

    async.filter(
      pairsToCompile,
      function (pair, cb) {
        async.map([pair.pugPath, pair.htmlPath], fs.stat, function (err, stats) {
          // Ignore fs.stat errors (e.g. when one of the two files doesn't exist).
          // We'll recompile those pairs.
          if (err) return cb(null, true);

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

        // Alter the config of grunt-contrib-pug, to only compile the files that have yet to be compiled.
        var config = grunt.config('pug.compile.files')[0];
        config.src = pairsToCompile.map(function (pair) {
          return pair.pugPath;
        });
        grunt.config('pug.compile.files', [config]);

        // In case we're using grunt-contrib-clean to clean up the folder where all compiled pugs are
        // stored, make sure we alter the config of the clean task to not delete already compiled pugs
        if (options.cleanTask) {
          var cleanConfigName =  'clean.' + options.cleanTask + '.files';
          config = grunt.config(cleanConfigName)[0];
          config.src = pairsToCompile.map(function (pair) {
            return "!" + pair.pugPath;
          });
          grunt.config(cleanConfigName, [config]);
        }

        grunt.log.writeln(config.src.length + ' pug files passed the filter and will be compiled.');
        done();
      }
    );
  });
};
