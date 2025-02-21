require('dotenv').config(); // Load environment variables

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var fileUpload = require('express-fileupload');
var hbs = require('express-handlebars');
var db = require('./config/connection');

var adminRouter = require('./routes/admin');
var userRouter = require('./routes/user');

var app = express();
const PORT = process.env.PORT || 8080;

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

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || "Key",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 21600000 }, // 6 hours = 21600000 ms
  rolling: true // Resets maxAge on each request
}));

// Middleware to store session messages and clear them after one request cycle
app.use((req, res, next) => {
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  req.session.success = null;
  req.session.error = null;
  next();
});

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Connect to MongoDB and Start Server
db.connectDb(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

// Error handling
app.use(function (req, res, next) {
  next(createError(404));
});
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
