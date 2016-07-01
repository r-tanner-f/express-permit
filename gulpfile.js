'use strict';

const gulp       = require('gulp');
const mocha      = require('gulp-mocha');
const eslint     = require('gulp-eslint');
const plumber    = require('gulp-plumber');
const istanbul   = require('gulp-istanbul');
const coveralls  = require('gulp-coveralls');
const sourcemaps = require('gulp-sourcemaps');

const rmrf      = require('rimraf');
const execute   = require('child_process').exec;

let reporter = 'spec';

gulp.task('clean', (cb) => rmrf('./docs', () => rmrf('./coverage', cb)));

gulp.task('pre-test', ['clean'], () => gulp.src(['src/**/*.js'])
  .pipe(sourcemaps.init())
  .pipe(istanbul())
  .pipe(istanbul.hookRequire())
  .pipe(sourcemaps.write())
);

gulp.task('test', ['pre-test'], () => gulp.src(['test/*.js'], { read: false })
  .pipe(plumber())
  .pipe(mocha({ reporter }))
  .pipe(istanbul.writeReports({
    reporters: ['text-summary', 'lcov', 'html'],
  }))
);

gulp.task('lint', ['test'], () =>  gulp.src(['src/**/*.js', 'test/**/*.js', '*.js'])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failOnError())
);

gulp.task('coveralls', ['test'], () => gulp.src('coverage/**/lcov.info').pipe(coveralls()));

gulp.task('docs', ['clean'], cb => execute(
  'jsdoc -c .jsdoc.json -r ./src -R README.md',
  (err, stdout, stderr) => {
    console.log(stdout, stderr);
    cb(err);
  }
));

gulp.task('local', ['docs', 'lint', 'test']);
gulp.task('setReporter', () => {
  reporter = 'mocha-unfunk-reporter';
  process.env['mocha-unfunk-writer'] = 'bulk';
});

gulp.task('build', ['lint', 'test', 'coveralls']);

gulp.task('default', ['setReporter'], () => {
  gulp.watch(['src/**', 'test/**', './*'], ['local']);
});
