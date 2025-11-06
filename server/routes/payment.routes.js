const express = require('express');
const {createOrder, verifyPayment} = require('../controllers/payment.controller');

const router = express.Router();

//Post /api/payment/create-order

router.post("/create-order", createOrder);
router.post("/verify-payment",verifyPayment);

module.exports = router;