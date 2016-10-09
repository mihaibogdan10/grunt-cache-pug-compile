# grunt-cache-pug-compile
Grunt task that works <a href="https://github.com/gruntjs/grunt-contrib-pug">grunt-contrib-pug</a> and aims to prevent re-compilations of already compiled pug files.

The way it works is that it checks the last modified status of the .pug and .html pairs, and only allows the pug task to recompile pug files that have been modified more recently than their html counterparts. It dynamically changes the pug config task <i>src</i> in order to do so.

## Important config info

Note that for **cache-pug-compile** to be able to change the config of the pug and clean tasks they need to run in the same context (e.g. running the pug task with <a href="https://github.com/sindresorhus/grunt-concurrent">grunt-concurrent</a> concurrently with other tasks will spawn a new process for it, and it won't share the context with **cache-pug-compile** anymore). Also, it needs to run before the other two. E.g.:

```
grunt.registerTask('serve', function (target) {
  grunt.task.run([
    'cache-pug-compiler',
    'clean:server',
    'pug',
    // other tasks here
    'express'
  ]);
});
```

## Config
Here's an example config for the two tasks.

```
'cache-pug-compiler': {
    cache: {
      options: {
        // Needs to hook into this clean task in order to prevent
        // compiled html filed from being deleted
        cleanTask: 'server'
      },
      files: [{
        expand: true,
        src: 'client/{desktop,mobile}/**/*.pug',
        dest: '.tmp',
        ext: '.html'
      }]
    }
  },

  // Compiles pug to html
  pug: {
    compile: {
      options: {
        data: {
          debug: false
        },
        basedir: 'client'
      },
      files: [{
        expand: true,
        src: [
          // This will be dynamically filled by cache-pug-compiler
        ],
        dest: '.tmp',
        ext: '.html'
      }]
    }
  },
```

# grunt-contrib-clean support
In case you use <a href="https://github.com/gruntjs/grunt-contrib-clean">grunt-contrib-clean</a> to clean the dest folder in between pug compile runs, you can let **cache-pug-compile** know that it should prevent deletion of compiled html files with the **cleanTask** option.

```
clean: {
  server: {
    // Needs to use this array form so that cache-pug-compile can add rules of what not to delete
    files: [{
      src: [
        '.tmp'
        // Rules of what not to delete will be added here by cache-pug-compile
      ]
    }]
  }
}
```
