const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');
const axios = require('axios');

require('dotenv').config();
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
	console.log('Database connected');
});

const sample = (array) => array[Math.floor(Math.random() * array.length)];

const seedDB = async () => {
	await Campground.deleteMany({});
	// call unsplash and return small image
	async function seedImg() {
		try {
			const resp = await axios.get('https://api.unsplash.com/photos/random', {
				params: {
					client_id: 'fYefdOw7xqsFAmhPaOEdGrvGVJy4f2MpIiS-KMqigvU',
					collections: 1114848
				}
			});
			return resp.data.urls.small;
		} catch (err) {
			console.error(err);
		}
	}
	for (let i = 0; i < 300; i++) {
		const random1000 = Math.floor(Math.random() * 1000);
		const price = Math.floor(Math.random() * 20) + 10;
		const camp = new Campground({
			//YOUR USER ID
			author: '644c099b449e4d54c548595b',
			location: `${cities[random1000].city}, ${cities[random1000].state}`,
			title: `${sample(descriptors)} ${sample(places)}`,
			description:
				'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Praesentium, blanditiis? Obcaecati, harum. Cumque minima, reprehenderit accusantium et accusamus deleniti qui repellendus odit ipsam unde iste suscipit, obcaecati ipsa temporibus voluptas!',
			price,
			geometry: {
				type: 'Point',
				coordinates: [ cities[random1000].longitude, cities[random1000].latitude ]
			},
			images: [
				{
					url:
						'https://res.cloudinary.com/dvpafhi9y/image/upload/v1699511870/YelpCamp/tioow7df8epoohtk42wy.jpg',
					filename: 'YelpCamp/tioow7df8epoohtk42wy'
				},
				{
					url:
						'https://res.cloudinary.com/dvpafhi9y/image/upload/v1699511834/YelpCamp/gr9niqbhfgg7cwtv7aol.jpg',
					filename: 'YelpCamp/gr9niqbhfgg7cwtv7aol'
				}
			]
		});
		await camp.save();
	}
};

seedDB().then(() => {
	mongoose.connection.close();
});
