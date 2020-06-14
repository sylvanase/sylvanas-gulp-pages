const { src, dest, parallel, series, watch } = require("gulp");

const del = require("del"); // 删除指定文件，promise方法
const browserSync = require("browser-sync"); // 热更新

const loadPlugins = require("gulp-load-plugins");

const plugins = loadPlugins();
const bs = browserSync.create(); // 创建一个服务器

// 返回当前命令行工作目录
const cwd = process.cwd();
let config = {
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    path: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**"
    }
  }
};
try {
  const loadConfig = require(`${cwd}/pages.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (error) {}

const clean = () => {
  return del([config.build.dist, config.build.temp]); // 删除dist和temp目录
};

const style = () => {
  return src(config.build.path.styles, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.sass({ outputStyle: "expanded" }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const script = () => {
  return src(config.build.path.scripts, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const page = () => {
  return src(config.build.path.pages, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const image = () => {
  return src(config.build.path.images, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.path.fonts, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const extra = () => {
  return src("**", {
    base: config.build.src,
    cwd: config.build.src
  }).pipe(dest(config.build.dist));
};

const serve = () => {
  watch(
    config.build.path.styles,
    {
      cwd: config.build.src
    },
    style
  );
  watch(
    config.build.path.scripts,
    {
      cwd: config.build.src
    },
    script
  );
  watch(
    config.build.path.pages,
    {
      cwd: config.build.src
    },
    page
  );
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch(
    [config.build.path.images, config.build.path.fonts],
    { cwd: config.build.src },
    bs.reload
  );

  watch("**", { cwd: config.build.public }, bs.reload);
  // 初始化服务器配置
  bs.init({
    notify: false,
    port: 2080,
    // open: false,
    // files: 'dist/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public], // 根目录
      routes: {
        "/node_modules": "node_modules"
      }
    }
  });
};
// 处理引入问题
const useref = () => {
  return (
    src(config.build.path.pages, {
      base: config.build.temp,
      cwd: config.build.temp
    })
      .pipe(plugins.useref({ searchPath: [config.build.temp, "."] }))
      // html js css
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
          })
        )
      )
      .pipe(dest(config.build.dist))
  );
};

const compile = parallel(style, script, page);

// 上线之前执行的任务
const build = series(
  clean,
  // parallel(series(compile, useref), image, font, extra)
  parallel(series(compile, useref))
);

const develop = series(compile, serve);

module.exports = {
  clean,
  build,
  develop
};
