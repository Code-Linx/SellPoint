/* eslint-disable no-constant-condition */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const passport = require('passport');
const passportConfig = require('./passportConfig');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//SECURITY
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

//DEVELOPMENT LOGGING
if ((process.env.NODE_ENV = 'development')) {
  app.use(morgan('dev'));
}

//Helmet middleware to secure HTTP headers
app.use(helmet());

app.use(mongoSanitize());

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

// Initialize passport
app.use(passport.initialize());

// Call the passport config function to use the strategy
passportConfig(passport);

app.use('/api/v1/user', userRouter);
app.use('/api/v1/admin', adminRouter);
app.use(
  '/webhook',
  express.raw({ type: 'application/json' }) // Ensure raw body for this route
);
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
