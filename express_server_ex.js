const dotevn = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products';
const forwardingAddress = "https://a02088aa.ngrok.io"; 

// console.log(process.env.SHOPIFY_API_KEY, apiKey, apiSecret);

// app.get('/', (req, res) => {
// 	res.send('Hello World');

// });

app.get('/shopify', (req, res) =>{
	const shop = req.query.shop;
	if (shop) {
		const state = nonce();
		const redirectUri = forwardingAddress + '/shopify/callback';
		const intsallUrl = 'https://' + shop + 
			'/admin/oauth/authorize?client_id=' + apiKey +
			'&scope=' + scopes +
			'&state=' + state +
			'&redirect_uri=' + redirectUri;
		res.cookie('state', state);
		res.redirect(intsallUrl)
	} else {
		return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
	}
});

app.get('/shopify/callback', (req, res) => {
	const {shop, hmac, code, state} = req.query;
	const stateCookie = cookie.parse(req.headers.cookie).state;

	if (state !== stateCookie) {
		return res.status(403).send('Request origin cannot be verified');
	}

	if (shop && hmac && code) {
		// DONE: Validate request is from Shopify
		// res.status(200).send('callback route');
		const map = Object.assign({}, req.query);
		delete map['signature'];
		delete map['hmac'];
		const message = querystring.stringify(map);
		const providedHmac = Buffer.from(hmac, 'utf-8');
		const generatedHash = Buffer.from(
				crypto
					.createHmac('sha256', apiSecret)
					.update(message)
					.digest('hex'),
					'utf-8'
			);
		let hashEquals = false;
		// timingSafeEqual will prevent any timing attacks, Args must be buffers
		try {
			hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
			// timingSafeEqual will return an error if the input buffers are not the same length
		} catch (e) {
			hashEquals = false;
		};

		if (!hashEquals) {
			return res.status(400).send('HMAC Validation failed');
		}
		// DONE: Exchange temporary code for a permanent access token
		const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
		const accessTokenPayload = {
			client_id: apiKey,
			client_secret: apiSecret,
			code,
		};

		request.post(accessTokenRequestUrl, { json: accessTokenPayload })
		.then((accessTokenResponse) => {
			const accessToken = accessTokenResponse.access_token;
			// res.status(200).send('Got an access token, let\'s do something with it');
			//DONE
			// Use access token to make api call to 'shop' endpoint
			const shopRequestUrl = 'https://' + shop + '/admin/api/2019-10/shop.json';
			const shopRequestHeaders = {
				'X-Shopify-Access-Token': accessToken,
			};


			// const shopResponse = getApiData(shopRequestUrl,shopRequestHeaders)
			// try {
			// 	res.status(200).end(shopResponse);
			// }
			// catch(e){
			// 	res.status(e.statusCode).send(e.error.error_description);
			// }
			request.get(shopRequestUrl, {headers: shopRequestHeaders })
				.then((shopResponse) => {
					res.status(200).end(shopResponse);
				})
				.catch((error) => {
					res.status(error.statusCode).send(error.error.error_description);
				});

		})
		.catch((error) => {
			res.status(error.statusCode).send(error.error.error_description);
		});

	} else {
		res.status(400).send("Required parameters are missing");
	}

});



app.listen(3000, () => {
	console.log('Example app listening on port 3000');
});

// async function getApiData(shopRequestUrl,shopRequestHeaders) {
// 	let shopResponse;
// 	try {
// 		shopResponse = await request.get(shopRequestUrl, {headers: shopRequestHeaders });
// 		return(shopResponse)
// 	}
// 	catch(error) {
// 		shopResponse = await error;
// 		// res.status(error.statusCode).send(error.error.error_description);
// 	}
// 	// res.status(200).end(shopResponse);
// 	return shopResponse
// }

// function processApiResponse(shopResponse, res) {
// 	try {
// 		res.status(200).end(shopResponse);
// 	}
// 	catch(shopResponse){
// 		res.status(shopResponse.statusCode).send(shopResponse.error.error_description);
// 	}
// }