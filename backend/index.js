const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");


app.use(express.json());
app.use(cors());

// Database connection with Mongodb

mongoose.connect("mongodb+srv://aryanbansal667:Aryanbansal@cluster0.dkuxkab.mongodb.net/E-commerce")

// API Creation
app.get("/",(req,res)=>{
    res.send("Express App is Running");
})

// Image Storage Engine 

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})
const upload = multer({storage:storage})

//creating upload Endpoint for images
app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })

})

// schema for creating products

const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    }
})

app.post('/addproduct',async(req,res)=>{
    let products= await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price, 
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// creating API For deleting Products

app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name
    })
})

// Creating API for getting all products
app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Schema creating for user model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

// creating Endpoint for registering the user
app.post('/signup',async(req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email address "})
    }
    let cart = {};
    for(let i=0; i<300; i++){
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data ={
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
})

//creating endpoint for user login
app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,error:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,error:"Wrong Email Id"});
    }
})

//creating endpoint for newcollection data
app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);

})
// creating endpoint for popular in women section
app.get('/popularinwomen',async(req,res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
})
//creating middelware to fetch user
const fetchUser = async(req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try{
            const data= jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        }catch(error){
            res.status(401).send({errors:"please authenticate a valid token"})

        }
    }

}

// creating endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    try {
      const userData = await Users.findOne({ _id: req.user.id });
  

      if (!userData.cartData) {
        userData.cartData = {};
      }
  

      const itemId = req.body.itemId;
      if (!userData.cartData[itemId]) {
        userData.cartData[itemId] = 1;
      } else {
        userData.cartData[itemId] += 1;
      }
  
      await Users.findOneAndUpdate(
        { _id: req.user.id },
        { cartData: userData.cartData }
      );
  
      res.send("Added");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });

  //creating endpoint to remove product from cartdata
  app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const itemId = req.body.itemId;
  
      const userData = await Users.findOne({ _id: userId });
  
      if (!userData.cartData || !userData.cartData[itemId]) {
        return res.status(400).json({ message: "Item not in cart" });
      }
  
      // Decrement or delete the item
      if (userData.cartData[itemId] > 1) {
        userData.cartData[itemId] -= 1;
      } else {
        delete userData.cartData[itemId];
      }
  
      await Users.findOneAndUpdate(
        { _id: userId },
        { cartData: userData.cartData }
      );
  
      res.json({ message: "Removed" });
    } catch (err) {
      console.error("Error removing from cart:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  // Endpoint to get cartData
app.post('/getcart', fetchUser, async (req, res) => {
    try {
      console.log("GetCart");
  
      const userData = await Users.findOne({ _id: req.user.id });
  
      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const cartData = userData.cartData || {}; // fallback if undefined
  
      res.json(cartData);
    } catch (err) {
      console.error("Error in /getcart:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  
app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on Port "+port);
    }
    else{
        console.log("Error :"+error);
    }

})