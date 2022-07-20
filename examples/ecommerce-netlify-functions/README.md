# ecommerce-netlify-functions

This sample demonstrates using Mongoose to build an eCommerce shopping cart using [Netlify Functions](https://www.netlify.com/products/functions/), which runs on [AWS Lambda](https://mongoosejs.com/docs/lambda.html).

Other tools include:

1. Stripe for payment processing
2. [Mocha](https://masteringjs.io/mocha) and [Sinon](https://masteringjs.io/sinon) for testing

## Running This Example

1. Make sure you have a MongoDB instance running on `localhost:27017`, or update `mongodbUri` in `.config/development.js` to your MongoDB server's address.
2. Run `npm install`
3. Run `npm run seed`
4. Run `npm start`
5. Visit `http://localhost:8888/.netlify/functions/getProducts` to list all available products
6. Run other endpoints using curl or postman

## Testing

Make sure you have a MongoDB instance running on `localhost:27017`, or update `mongodbUri` in `.config/test.js` to your MongoDB server's address.
Then run `npm test`.

```
$ npm test

> test
> env NODE_ENV=test mocha ./test/*.test.js

Using test


  Add to Cart
    ✔ Should create a cart and add a product to the cart
    ✔ Should find the cart and add to the cart
    ✔ Should find the cart and increase the quantity of the item(s) in the cart

  Checkout
    ✔ Should do a successful checkout run

  Get the cart given an id
    ✔ Should create a cart and then find the cart.

  Products
    ✔ Should get all products.

  Remove From Cart
    ✔ Should create a cart and then it should remove the entire item from it.
    ✔ Should create a cart and then it should reduce the quantity of an item from it.


  8 passing (112ms)

```