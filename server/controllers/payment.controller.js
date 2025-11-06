const {razorpayInstance} = require("../server.js");
const crypto = require("crypto");
const Payment = require("../models/payment.model.js");
//1.step1 : try - catch
//2.step2 : fetched the data from req.body.
//3. step3 : check if amount and currency.
//4. step4: created a options like in the newUser in register
//5. step5: Created order using raZorpay method
//6. Step6: Checked if order created.
// 7. Step7 : Saved data in database(mongoose).
//ImpNotes :- 
// A.amount Rajopay sub-unit me leta hai (rupya--paisa) * 100.
//B.Base amount is saved in database (rupya)
//C. Database error k baad bhi rajopay will work (only the data not saved in dbms )


exports.createOrder = async (req , res) => {
    try{
        const {amount,currency, receipt} = req.body;
        //currency and amount check 
        if(!amount || !currency){
            return res.status(400).json({message:"Amount and currency are required"});

        }

        const options = {
            amount : Number(amount) * 100, //500 kiya tha ---> 50000(reajor pay reads subunit)
            currency:currency,
            receipt: receipt || `receipt_order_${new Date().getTime()}`,
        //if ----> true 
        // receipt stays "myRecep123"
        //else
        // receipt becomes like "receipt_order_1699299643123" (timestamp value)
        };

        //Create Rajorpay order.

        const order = await razorpayInstance.orders.create(options);

        if(!order){
            return res.status(500).json({message: "Error creating order"});

        }

        //Save this to the data base .

        try{
            await Payment.create({
                razorpay_order_id:order.id,
                amount: Number(amount),//saving the base amount.
                currency: order.currency,
                receipt: order.receipt,
                status:'created',
                //user : req.user.id //if i have authentication.
                });
        }catch(dbError){
            console.error("Error saving payment to DB :", dbError);
            //Even if DB save fails, we might still proceed, but log it
            return res.status(500).json({message: "Error creating order in DB"});
        }

        //Send razorpay order to frontend
        res.status(200).json({
            success:true,
            order,
        });


    }catch(error){
        console.error("Error in createOrder : ", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });

    }
};


//Steps involved 
//Step1 : - try - catch
// step2 :- fetched ids - >  ordId , payId, sig and check if each id exists 
// step3 :- body me oId | pId as string
//step4 :- signature create by using body.
//step5 :- signature pass
//        step5(A) :- find payment using order id from  database
//        step5(B) :- !payment --> 404
//        step5(C) :- else update ids and status and save Payment 
//        else signature fail :
//        return false and update the status as false
// step6 :- catch error if any exits



exports.verifyPayment = async (req, res) => {
    try{
        const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body;
        if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature ){
            return res.status(400).json({message: "Missing required payment details"});
        }
        //This is the core verification logic 

        const body = razorpay_order_id + "|" + razorpay_payment_id;
         //ye dono ko mila k ek string banayega 

         //ye ek signature create karega private key ko use karke.
        const expectedSignature = crypto
        .createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");
         
        const isSignatureValid = (expectedSignature === razorpay_signature);

        if(isSignatureValid){
            //if yhe signature matches (checking in mongodb )
            const payment = await Payment.findOne({
                razorpay_order_id : razorpay_order_id
            });

            if(!payment){
                return res.status(404).json({
                    success:false,
                    message:"Order not found in our database. Payment verification failed. ",

                });
            }
             // update the rpayment record with success payment details.
            payment.razorpay_payment_id = razorpay_payment_id;
            payment.razorpay_signature = razorpay_signature;
            payment.status = 'paid';

            await payment.save();
             //Payment authentic and successful
            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                orderId : razorpay_order_id,
                paymentId : razorpay_payment_id,
            });

        }else {
            //Payment verification failed .
            //You could also update the update the status to 'failed' here.
            await Payment.findOneAndUpdate(
            {razorpay_order_id: razorpay_order_id},
            {status: 'failed'}
            ); 
            res.status(400).json({
                success: false,
                message:"Invalid signature, Payment verification failed.",
            });

        }
    }catch(error){
        console.error("Error in verifyPayment : ", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

