if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const { urlencoded } = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

const mongoSanitize = require('express-mongo-sanitize');

const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');
const MongoStore = require('connect-mongo');
const dbUrl = process.env.DB_URL;
const seedDB = require('./seeds/index');

const store = MongoStore.create({
	mongoUrl: dbUrl,
	touchAfter: 24 * 60 * 60,
	crypto: {
		secret: process.env.SECRET
	}
});

store.on('error', function(e) {
	console.log('SESSION STORE ERROR', e);
});

mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
	console.log('Database connected');
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize());

const sessionConfig = {
	store,
	name: 'session',
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true,
		// secure: true,
		expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
		maxAge: 1000 * 60 * 60 * 24 * 7
	}
};
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());

const scriptSrcUrls = [
	'https://stackpath.bootstrapcdn.com',
	'https://api.tiles.mapbox.com',
	'https://api.mapbox.com',
	'https://kit.fontawesome.com',
	'https://cdnjs.cloudflare.com',
	'https://cdn.jsdelivr.net'
];
const styleSrcUrls = [
	'https://kit-free.fontawesome.com',
	'https://stackpath.bootstrapcdn.com',
	'https://api.mapbox.com',
	'https://api.tiles.mapbox.com',
	'https://fonts.googleapis.com',
	'https://use.fontawesome.com',
	'https://cdn.jsdelivr.net'
];
const connectSrcUrls = [ 'https://api.mapbox.com', 'https://*.tiles.mapbox.com', 'https://events.mapbox.com' ];
const fontSrcUrls = [];
app.use(
	helmet.contentSecurityPolicy({
		directives: {
			defaultSrc: [],
			connectSrc: [ "'self'", ...connectSrcUrls ],
			scriptSrc: [ "'unsafe-inline'", "'self'", ...scriptSrcUrls ],
			styleSrc: [ "'self'", "'unsafe-inline'", ...styleSrcUrls ],
			workerSrc: [ "'self'", 'blob:' ],
			childSrc: [ 'blob:' ],
			objectSrc: [],
			imgSrc: [
				"'self'",
				'blob:',
				'data:',
				'https://res.cloudinary.com/dvpafhi9y/', //SHOULD MATCH YOUR CLOUDINARY ACCOUNT!
				'https://images.unsplash.com'
			],
			fontSrc: [ "'self'", ...fontSrcUrls ]
		}
	})
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
	console.log(req.query);
	res.locals.currentUser = req.user;
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	next();
});

app.get('/fakeUser', async (req, res) => {
	const user = new User({ email: 'naiefff@gmail.com', username: 'naiefff' });
	const newUser = await User.register(user, 'chicken');
	res.send(newUser);
});

app.use('/', userRoutes);
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes);

app.get('/', (req, res) => {
	res.render('home');
});

app.get('/seed', async (req, res) => {
	try {
		await seedDB();
		res.send('✅ Database seeded successfully!');
	} catch (e) {
		console.log(e);
		res.status(500).send(`❌ Error seeding the database: ${e.message}`);
	}
});

app.all('*', (req, res, next) => {
	next(new ExpressError('Page Not Found', 404));
});

app.use((err, req, res, next) => {
	const { statusCode = 500 } = err;
	if (!err.message) err.message = 'Oh No, Something Went Wrong!';
	res.status(statusCode).render('error', { err });
});

app.listen(3000, () => {
	console.log('Serving on port 3000');
});
