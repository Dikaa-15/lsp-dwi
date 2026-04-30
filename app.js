var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var flash = require('express-flash');
var methodOverride = require('method-override');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var adminRouter = require('./routes/admin');
var cartRouter = require('./routes/cart');
var checkoutRouter = require('./routes/checkout');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// session & flash setup
app.use(session({
    secret: 'autopart-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());
app.use(methodOverride('_method'));

// Global locals
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = req.flash();
    
    if (req.session.user) {
        const db = require('./library/database');
        
        // Count items in cart for any logged in user
        db.query('SELECT COUNT(*) as count FROM keranjang WHERE user_id = ?', [req.session.user.id], (err, cartResults) => {
            res.locals.cartCount = cartResults ? cartResults[0].count : 0;

            if (req.session.user.role === 'admin') {
                // If admin, count pending orders to verify
                db.query('SELECT COUNT(*) as count FROM pembelian WHERE status = "menunggu_verifikasi"', (err, orderResults) => {
                    res.locals.pendingOrdersCount = orderResults ? orderResults[0].count : 0;
                    res.locals.activeOrdersCount = 0;
                    next();
                });
            } else {
                // If customer, count active orders (to track)
                db.query('SELECT COUNT(*) as count FROM pembelian WHERE user_id = ? AND status IN ("menunggu_verifikasi", "diproses", "dikirim")', [req.session.user.id], (err, orderResults) => {
                    res.locals.activeOrdersCount = orderResults ? orderResults[0].count : 0;
                    res.locals.pendingOrdersCount = 0;
                    next();
                });
            }
        });
    } else {
        res.locals.cartCount = 0;
        res.locals.pendingOrdersCount = 0;
        res.locals.activeOrdersCount = 0;
        next();
    }
});

// Routing
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/cart', cartRouter);
app.use('/checkout', checkoutRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
