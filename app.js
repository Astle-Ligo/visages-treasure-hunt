var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var adminRouter = require('./routes/admin');
var userRouter = require('./routes/user');

var hbs = require('express-handlebars')

var db = require('./config/connection');

const session = require('express-session')

var fileUpload = require('express-fileupload')


var app = express();

const { log } = require('console');

// view engine setup
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

app.use(fileUpload())

app.use(session({secret:"Key",cookie:{maxAge:600000}}))

app.use('/', userRouter);
app.use('/admin', adminRouter);


db.connectDb((err) => {
  if (err)
    console.log("Connection Error" + err);
  else
    console.log("Connected")
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
