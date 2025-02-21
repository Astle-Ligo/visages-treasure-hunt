var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var adminRouter = require('./routes/admin');
var userRouter = require('./routes/user');

var hbs = require('express-handlebars');
var db = require('./config/connection');
const session = require('express-session');
var fileUpload = require('express-fileupload');

var app = express();
const PORT = process.env.PORT || 3001; // ✅ Fix: Define PORT

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine(
  "hbs",
  hbs.engine({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: "views/layout/"
  })
);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.use(session({
  secret: "Key",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 21600000 }, // 6 hours = 21600000 ms
  rolling: true // Resets maxAge on each request
}));

// ✅ Middleware to store session messages and clear them after one request cycle
app.use((req, res, next) => {
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;

  // Clear messages after they have been used
  req.session.success = null;
  req.session.error = null;

  next();
});

app.use('/', userRouter);
app.use('/admin', adminRouter);

db.connectDb((err) => {
  if (err) {
    console.error("❌ Database Connection Failed:", err);
    process.exit(1);
  } else {
    console.log("✅ Connected to MongoDB!");

    // Ensure user routes are only used **after** DB connection
    app.use('/', userRouter);
    app.use('/admin', adminRouter);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  }
});


// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
