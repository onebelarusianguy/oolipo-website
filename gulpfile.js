'use strict';

var gulp = require('gulp'),
	sass = require('gulp-sass'),
	//gcmpq = require('gulp-group-css-media-queries'),
	minify = require('gulp-minify-css'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	plumber = require('gulp-plumber'),
	imagemin = require('gulp-imagemin'),
	pngquant = require('imagemin-pngquant'),
	imageminJpegRecompress = require('imagemin-jpeg-recompress'),
	browserSync = require('browser-sync'),
	paths = {
		src: '_src',
		build: 'build',
		scripts: ['_src/assets/js/*.*', '_src/assets/js/libs/*.*', '!_src/assets/js/jquery.min.js', '!_src/assets/js/common.js',, '!_src/assets/js/common_newer.js'],
		scriptsToWatch: ['_src/assets/js/*.*', '_src/assets/js/libs/*.*'],
		scriptsToCopy: ['_src/assets/js/jquery.min.js', '_src/assets/js/common.js'],
	};

gulp.task('html', function () {
	gulp.src(paths.src + '/*.html')
		.pipe(plumber())
		.pipe(gulp.dest(paths.build + '/'));
});

gulp.task('sass', function () {
	gulp.src(paths.src + '/assets/sass/*.scss')
		.pipe(plumber())
		.pipe(sass({
			outputStyle: 'expanded',
			indentType: 'tab',
			indentWidth: 1 // 1 TAB
		}))
		.on('error', sass.logError)
		//.pipe(gcmpq())
		.pipe(gulp.dest(paths.build + '/assets/css/'))
		.pipe(rename('styles.min.css'))
		.pipe(minify({
			compatibility: 'ie8'
		}))
		.pipe(gulp.dest(paths.build + '/assets/css/'))
});

gulp.task('scripts', function () {
	//concat
	gulp.src(paths.scripts)
		.pipe(plumber())
		.pipe(concat('libs.js'))
		.pipe(gulp.dest(paths.build + '/assets/js/'))
		.pipe(rename('libs.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest(paths.build + '/assets/js/'));
	//copy scripts
	gulp.src(paths.scriptsToCopy)
		.pipe(plumber())
		.pipe(gulp.dest(paths.build + '/assets/js/'));
	//common
	gulp.src('_src/assets/js/common.js')
		.pipe(plumber())
		.pipe(rename('common.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest(paths.build + '/assets/js/'));
});

gulp.task('fonts', function () {
	gulp.src(paths.src + '/assets/fonts/**/*.*')
		.pipe(plumber())
		.pipe(gulp.dest(paths.build + '/assets/fonts'));
});


gulp.task('images', function () {
	gulp.src(paths.src + '/assets/img/**/*.*')
		.pipe(plumber())
		.pipe(imagemin({
			progressive: true, //jpeg losseless
			//recompress to make it smaller
			use: [
				imageminJpegRecompress({
					loops: 4,
					min: 50,
					max: 95,
					quality: 'medium'
				}),
				 pngquant()
				 ]
		}))
		.pipe(gulp.dest(paths.build + '/assets/img'));
});

gulp.task('watch', ['html', 'sass', 'scripts', 'fonts', 'images'], function () {
	//Static Server
	browserSync.init({
		server: {
			baseDir: paths.build + '/'
		},
		notify: false
	});

	gulp.watch(paths.src + '/*.html', ['html']);
	gulp.watch(paths.src + '/assets/img/**', ['images']);
	gulp.watch(paths.src + '/assets/sass/**/*.scss', ['sass']);
	gulp.watch(paths.scriptsToWatch, ['scripts']);
	browserSync.watch([paths.build + '/*.html', paths.build + '/assets/css/styles.min.css', paths.build + '/assets/js/*.js']).on('change', browserSync.reload);
});

gulp.task('default', ['watch']);
