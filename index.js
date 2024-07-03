require('dotenv').config()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express()

app.set('view engine', 'ejs')

app.get('/', async (req, res) => {
    res.render('index.ejs')
})

app.get('/subscribe', async (req, res) => {
    const plan = req.query.plan

    if (!plan) {
        return res.send('Subscription plan not found')
    }

    let priceId

    switch (plan.toLowerCase()) {
        case 'starter': 
            priceId = 'your_price_id_starter'
            break

        case 'pro':
            priceId = 'your_price_id_pro'
            break

        default:
            return res.send('Subscription plan not found')
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                quantity: 1
            }
        ],
        success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/cancel`
    })

    res.redirect(session.url)
})

app.get('/success', async (req, res) => {
    //const session = await stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['subscription', 'subscription.plan.product'] })

    res.send('Subscribed successfully')
})

app.get('/cancel', (req, res) => {
    res.redirect('/')
})

app.get('/customers/:customerId', async (req, res) => {
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: req.params.customerId,
        return_url: `${process.env.BASE_URL}/`
    })

    res.redirect(portalSession.url)
})

app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
  
    let event;
  
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET_KEY);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  
    // Handle the event
    switch (event.type) {
      //Event when the subscription started
      case 'checkout.session.completed':
        console.log('New Subscription started!')
        console.log(event.data)
        break;

      // Event when the payment is successfull (every subscription interval)  
      case 'invoice.paid':
        console.log('Invoice paid')
        console.log(event.data)
        break;

      // Event when the payment failed due to card problems or insufficient funds (every subscription interval)  
      case 'invoice.payment_failed':  
        console.log('Invoice payment failed!')
        console.log(event.data)
        break;

      // Event when subscription is updated  
      case 'customer.subscription.updated':
        console.log('Subscription updated!')
        console.log(event.data)
        break

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
  });

app.listen(3000, () => console.log('Server started on port 3000'))