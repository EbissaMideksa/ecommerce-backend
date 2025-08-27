const port =4000;
const express=require("express")
const app=express();
const jwt=require("jsonwebtoken");
const mongoose=require("mongoose");
const multer=require("multer");
const cors=require("cors");
const path = require("path");
const { error } = require("console");
app.use(express.json());
app.use(cors());

//j3WMqrmqk3UjNKuo 
//neweebbiwaan1@admin
//mongodb+srv://neweebbiwaan1:<db_password>@cluster0.yvnskih.mongodb.net/
mongoose.connect("mongodb+srv://neweebbiwaan1:j3WMqrmqk3UjNKuo@cluster0.yvnskih.mongodb.net/e-commerce")


//API creation
app.get("/",(req,res)=>{
  res.send(`App is running on Express It is my pleasure to launch my firt backend`)

})

app.listen(port, (error) => {
  if (error) {
    console.error(`Error starting server: ${error}`);
  } else {
    console.log(`Server is running on port ${port}`);
  } 
});

//create Image Engine

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/images");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}_${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

app.use("/images", express.static("./uploads/images")); 


app.post("/upload", upload.single("product"), (req, res) => {
  res.json({ 
    success:1,
    imageUrl: `http://localhost:${port}/images/${req.file.filename}` });

}); 


//schema for creating products
const productSchema = new mongoose.Schema({
  id:{type:Number,required:true},
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: {  type: String,  required: true,   set: v => v.toLowerCase() // Always lowercase
  },
  old_price: { type: Number, required: true },
  new_price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true }

});

const Product = mongoose.model("Product", productSchema);

app.post("/addproduct", async(req, res) => {

  let products = await Product.find({ });
  let id;
  if(products.length>0){
    let lastproduct_array=products.slice(-1);
    let lastproduct=lastproduct_array[0];
    id=lastproduct.id+1;
  }else{
    id=1;
  } 

  const product=new Product({ 
    id: id,
    name: req.body.name,
    image: req.body.image,
   // category: req.body.category,
   category: req.body.category.trim().toLowerCase(),
    old_price: req.body.old_price,
    new_price: req.body.new_price,
    date: req.body.date

})
console.log(product);
await product.save();
res.json({ 
  success: true, 
  name:req.body.name 
});

});

//Creating API for deleting products
app.delete("/deleteproduct/:id", async (req, res) => {
 await Product.findOneAndDelete({ id: req.params.id });
 res.json({ success: true, name: req.params.id });
});

//Creating API for getting all Products
app.get("/all_products", async (req, res) => {
  const products = await Product.find({});
  res.json({ success: true, products });
  console.log("Products:", products.map(p => p.category))
 // res.send(products)
});

// Schema creating for user model 
const Users=mongoose.model('Users',{
  name: { type: String, required: true },
  email: { type: String, required: true ,unique:true  },
  password: { type: String, required: true },
  CartData:{type:Object,default:{}},
  date: { type: Date, default: Date.now }

})

//Creating the Endpoint for registering the user

app.post('/signup',async(req,res)=>{  
  /* const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await Users.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists with this email" });
  }

  // Create new user
  const newUser = new Users({ name, email, password });
  await newUser.save();

  res.status(201).json({ message: "User registered successfully" }); */

  let check=await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({ succes:false, errors: "User already exists with this email" });
  } 

  let cart={};
  for(let i=0;i<=300;i++){
    cart[i]=0;
  }

  const user=new Users({
    name:req.body.name,
    email:req.body.email,
    password:req.body.password,
    CartData:cart
  });
  await user.save(); //save to DB

  //Use JWT for authentication

  const data={
    user: {
      id: user.id
    }
  }

  //Create JWT token

  const token = jwt.sign(data, 'secret_ecom' /* "your_jwt_secret", { expiresIn: "1h" } */);

  res.json({ success: true, token , name: user.name });
  //res.json({ success: true, message: "User registered successfully" });

});

//Creating the Endpoint for logging in the user

app.post('/login', async (req, res) => {
  
/*   
const { email, password } = req.body;

  // Check if user exists
  const user = await Users.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid email or password" });
  }

  // Check password
  if (user.password !== password) {
    return res.status(400).json({ success: false, message: "Invalid email or password" });
  }

  // Create JWT token
  const token = jwt.sign({ id: user._id }, 'secret_ecom', { expiresIn: "1h" });

  res.json({ success: true, token }); */

  const user=await Users.findOne({ email:req.body.email });
  if (user) {
   /*  const passCompare=await bcrypt.compare(req.body.password,user.password);
    if (passCompare) {
      const token = jwt.sign({ id: user._id }, 'secret_ecom', { expiresIn: "1h" });
      return res.json({ success: true, token });
    } */
   const passCompare=req.body.password===user.password;

   if (passCompare) {
      // Create JWT token
      const data={
        user: {
          id: user._id
        }
      }
     const token = jwt.sign(data, 'secret_ecom', { expiresIn: "1h" });
     return res.json({ success: true, token ,name:user.name});
   }else{
    res.json({ success: false, error: "Wrongpassword" });
   }

  }
  return res.status(400).json({ success: false, message: "Invalid email Id" });
});


// Creating the Endpoint for newCollection data

app.get('/newcollection', async (req, res) => {
  const products = await Product.find({ });

  let newcollection=products.slice(1).slice(-10)
  console.log("New Collection created");
  res.send(newcollection)
}); 


//Creating Endpoint popular in women section
app.get('/popularwomen', async (req, res) => {
  const products = await Product.find({ category: "women" });

  let popularwomen = products.slice(0, 6); // the first six
  console.log("Popular Women Collection created");
  res.send(popularwomen)
});


//Creating middleware to fetch user

const fetchUser=async(req,res,next)=>{
    const token=req.header('auth-token');
   if(!token){
        res.status(401).send({errors:"Please,authenticate using valid token"});
   }else{

   }
   try {
       const verified=jwt.verify(token,'secret_ecom');
       req.user=verified.user;
       next();
   } catch (error) {
        res.status(401).send({erros:"Please,authenticate a valid token"});
   }
   
}

//Creating Endpoint adding products in cartdata

app.post('/addtocart', fetchUser, async (req, res) => {
  //console.log(req.body,req.user);

  let userData=await Users.findOne({_id:req.user.id});
  userData.CartData[req.body.itemId]+=1;
  await Users.findOneAndUpdate({_id:req.user.id},{CartData:userData.CartData});
  res.json({ success: true, message: "Item added to cart" });

})


// Creating Endpoint removing products from cartdata

 app.post('/removefromcart', fetchUser, async (req, res) => {
  //console.log(req.body,req.user);
  console.log("Removing item from cart:", req.body.itemId);

  let userData=await Users.findOne({_id:req.user.id});
  if(userData.CartData[req.body.itemId]>0)
  /* userData.CartData[req.body.itemId]-=1; */
  userData.CartData[req.body.itemId]=0;
  await Users.findOneAndUpdate({_id:req.user.id},{CartData:userData.CartData});
  res.json({ success: true, message: "Item removed from cart" });

}) 

//Creating Endpoint to get cartData
app.post('/getcartdata', fetchUser, async (req, res) => {
  //console.log(req.body,req.user);
  let userData=await Users.findOne({_id:req.user.id});
  res.json({ success: true, cartData: userData.CartData });

});


// DELETE user by ID (protected by token)
app.delete('/user/:id', fetchUser, async (req, res) => {
  const userId = req.params.id;

  // Only allow user to delete their own account or add admin check here
  if (req.user.id !== userId) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  try {
    await Users.findOneAndDelete({ _id: userId });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
