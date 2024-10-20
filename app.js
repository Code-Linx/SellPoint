/* eslint-disable no-constant-condition */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const passport = require('passport');
const passportConfig = require('./passportConfig');
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

// Initialize passport
app.use(passport.initialize());

// Call the passport config function to use the strategy
passportConfig(passport);

app.use('/api/v1/user', userRouter);
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
