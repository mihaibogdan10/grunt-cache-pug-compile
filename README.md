# grunt-cache-pug-compile
Grunt task that works <a href="https://github.com/gruntjs/grunt-contrib-pug">grunt-contrib-pug</a> and aims to prevent re-compilations of already compiled pug files.

The way it works is that it checks the last modified status of the .pug and .html pairs, and only allows the pug task to recompile pug files that have been modified more recently than their html counterparts. It dynamically changes the pug config task <i>src</i> in order to do so.

 It only works in three basic cases:
 *  no files need to be recompiled! (yey!)
 *  1 file was updated (compiles the files that directly or indirectly import it)
 *  more files were updated, in which case we don't even bother and just compile them all

## Getting Started

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-cache-pug-compile --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-cache-pug-compile');
```

## Important config info

Note that for **cache-pug-compile** to be able to change the config of the pug and clean tasks they need to run in the same context (e.g. running the pug task with <a href="https://github.com/sindresorhus/grunt-concurrent">grunt-concurrent</a> concurrently with other tasks will spawn a new process for it, and it won't share the context with **cache-pug-compile** anymore). Also, it needs to run before the other two. E.g.:

```js
grunt.registerTask('serve', function (target) {
  grunt.task.run([
    'cache-pug-compiler',
    'clean:html',
    'pug',
    // other tasks here
    'express'
  ]);
});
```

## Config
Here's an example config for the two tasks.

```js
'cache-pug-compiler': {
    cache: {
      options: {
        // Needs to hook into this clean task in order to prevent
        // compiled html filed from being deleted
        cleanTask: 'html'
        // Will hook into this pug tasks and replace the src,
        // changing what gets compiled
        pugTask: 'compile',
        // Used by pugInheritance
        basedir: 'client'
      },
      files: [{
        expand: true,
        cwd: 'client',
        src: '{desktop,mobile}/**/*.pug',
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
        cwd: 'client',
        src: [
          // If cache-pug-compiler runs before this task, this will be REPLACED!
          'client/{desktop,mobile}/**/*.pug'
        ],
        dest: '.tmp',
        ext: '.html'
      }]
    }
  },
```

# grunt-contrib-clean support
In case you use <a href="https://github.com/gruntjs/grunt-contrib-clean">grunt-contrib-clean</a> to clean the dest folder in between pug compile runs, you can let **cache-pug-compile** know that it should prevent deletion of compiled html files with the **cleanTask** option.

```js
clean: {
  html: {
    // Needs to use this array form so that cache-pug-compile can add rules of what to delete
    files: [{
      src: [
        // If cache-pug-compiler runs before this task, this will be REPLACED!
        '.tmp/**/*.html'
      ]
    }]
  }
}
```
