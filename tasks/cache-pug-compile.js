'use strict';

module.exports = function(grunt) {
  var fs = require('fs');
  var async = require('async');
  var PugInheritance = require('pug-inheritance');

  grunt.registerMultiTask('cache-pug-compiler', 'Keep track of the result of compiled pug files.', function () {
    // Force task into async mode and grab a handle to the "done" function.
    var done = this.async();

    // Get the options passed to this taks
    var options = this.options();
    options.pugTask = options.pugTask || 'compile';

    // Get a list of all pairs of (.pug, .html) files that the pug task would create
    var i, file, pairsToCompile = [];

    for (i = 0; i < this.files.length; i++) {
      file = this.files[i];

      // Send the dest forward, too, we'll need to add it to the clean path
      // we set in the grunt-contrib-clean
      var dest = file.orig.dest;

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
        htmlPath: file.dest,
        cwd: cwd
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
      function (err, filteredPairs) {
        // In case of error, don't filter anything, let all files compile.
        if (err) {
          grunt.log.error("Error when deciding which files need to skip pug:compile" + err);
          return done();
        }

        /**
         * Once the .pug files that need to be compiled have been decided, we need to add
         * all the files that include directly or indirectly any of these files.
         * It only works in three basic cases:
         *  -> no files need to be recompiled! (yey!)
         *  -> 1 file was updated (compiles the files that directly or indirectly import it)
         *  -> more files were updated, in which case we don't even bother and just compile them all
         * */


        console.log(filteredPairs);
        if (filteredPairs.length === 0) {
          // no need to compile anything (yay!)
          return _setFilesToBeCompiled([], done);
        }
        else if (filteredPairs.length > 1) {
          // don't even bother and just compile them all
          return done();
        }

        // The more complicated case in which exactly 1 file was updated.
        var pugInheritanceOpts = {
          basedir: options.basedir,
          extension: '.pug',
          skip: 'node_modules'
        };

        var pair = pairsToCompile[0];
        var relativePugPath = pair.pugPath;
        if (relativePugPath.indexOf(pair.cwd) === 0) {
          relativePugPath = relativePugPath.substring(pair.cwd.length + 1);
        }

        var inheritance = new PugInheritance(pair.pugPath, options.basedir, pugInheritanceOpts);
        var pugsToCompile = inheritance.files.push(relativePugPath);
        _setFilesToBeCompiled(pairsToCompile, done);
      }
    );


    function _setFilesToBeCompiled(pugsToCompile, done) {
      // Alter the config of grunt-contrib-pug, to only compile the files that have yet to be compiled.
      var pugConfigName = 'pug.' + options.pugTask + '.files';
      var config = grunt.config(pugConfigName)[0];
      config.src = pugsToCompile;
      grunt.config(pugConfigName, [config]);

      // In case we're using grunt-contrib-clean to clean up the folder where all compiled pugs are
      // stored, make sure we alter the config of the clean task to not delete already compiled pugs
      if (options.cleanTask) {
        var cleanConfigName =  'clean.' + options.cleanTask + '.files';
        config = grunt.config(cleanConfigName)[0];
        config.src = pugsToCompile.map(function (pugPath) {
          return "!" + pugPath;
        });
        grunt.config(cleanConfigName, [config]);
      }

      grunt.log.writeln(config.src.length + ' pug files passed the filter and will be compiled.');
      done();
    }
  });
};
