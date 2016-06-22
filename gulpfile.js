'use strict';

const gulp      = require('gulp');
const mocha     = require('gulp-mocha');
const eslint    = require('gulp-eslint');
const istanbul  = require('gulp-istanbul');
const coveralls = require('gulp-coveralls');

const rmrf      = require('rimraf');
const execute   = require('child_process').exec;

gulp.task('clean', (cb) => rmrf('./docs', () => rmrf('./coverage', cb)));

gulp.task('pre-test', ['clean'], () => gulp.src(['src/**/*.js'])
  .pipe(istanbul())
  .pipe(istanbul.hookRequire())
);

gulp.task('test', ['pre-test'], () => gulp.src(['test/*.js'], { read: false })
  .pipe(mocha({ reporter: 'nyan' }))
  .pipe(istanbul.writeReports({
    reporters: ['text-summary', 'lcov', 'html'],
  }))
);

gulp.task('lint', ['test'], () =>  gulp.src(['src/**/*.js', 'test/**/*.js', '*.js'])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failOnError())
);

gulp.task('coveralls', () => gulp.src('coverage/**/lcov.info').pipe(coveralls()));

gulp.task('docs', ['clean'], cb => execute(
  'jsdoc -c .jsdoc.json -r ./src -R README.md',
  (err, stdout, stderr) => {
    console.log(stdout, stderr);
    cb(err);
  }
));

gulp.task('local', ['docs', 'lint', 'test']);
gulp.task('build', ['lint', 'test', 'coveralls']);

gulp.task('default', () => {
  gulp.watch(['src/**', 'test/**', './*'], ['local']);
});
