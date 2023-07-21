const fileHelper = require('../util/file');
const { validationResult } = require('express-validator'); //importing validationResult function from express-validator

const Product = require('../models/product');

exports.getAddProduct = (req,res,next)=>{
    //res.sendFile(path.join(__dirname,'..','views','add-product.html')); 
        
    if(!req.session.isLoggedIn){
      return res.redirect('/login');
    }
    res.render('admin/edit-product', {  //object which will hold the data which we will pass into the template..
          pageTitle: 'Add Product',
          path: '/admin/add-product',
          editing: false,
          hasError: false,
          errorMessage: null,
          validationErrors: []
        });     
};

exports.postAddProduct = (req,res,next)=>{ 
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const genre = req.body.genre;
    const description = req.body.description;
    // console.log(imageUrl);
    // console.log(errors.array());

    if(!image){
      return res.status(422).render('admin/edit-product', { 
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing : false,
        hasError: true,
        product: {
          title: title,
          price: price,
          genre: genre, 
          description: description
        },
        errorMessage: 'Attached file is not an image.',
        validationErrors: []
      }); 
    }
    
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      console.log(errors.array());
      return res.status(422).render('admin/edit-product', { 
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing : false,
        hasError: true,
        product: {
          title: title,
          price:price, 
          genre: genre,
          description:description
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array()
      });
    }

    const imageUrl = image.path;

    const product = new Product({
      title: title,
      price:price, 
      description:description, 
      genre: genre,
      imageUrl:imageUrl,
      userId: req.user
    }) //mapping
    product.save() //before in mongodb this save method was defined by us, but here in mongoose it is already defined..
    .then(result => {
      console.log('CREATED PRODUCT');
      return res.redirect('/admin/products');
    })
    .catch(err => 
      {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      }); //creates creates a new element based on that model and immediately saves it to the database..
};

exports.getEditProduct = (req,res,next)=>{
      const editMode = req.query.edit;
      if(!editMode){
        return res.redirect('/');
      }

      const prodId = req.params.productId;
      Product.findById(prodId)
      .then(product => {
        if(!product){
          return res.redirect('/');
        }
        res.render('admin/edit-product', { 
          pageTitle: 'Edit Product',
          path: '/admin/edit-product',
          editing : editMode,
          hasError: false,
          product: product,
          errorMessage: null,
          validationErrors: []
        }); })
        .catch(err => {
          const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
        });        
};

exports.postEditProduct = (req,res,next)=>{
      const prodId = req.body.productId;
      const updatedTitle = req.body.title;
      const updatedPrice = req.body.price;
      const updatedGenre = req.body.genre;
      const image = req.file;
      const updatedDesc = req.body.description;

      const errors = validationResult(req);

    if(!errors.isEmpty()){
      return res.status(422).render('admin/edit-product', { 
        pageTitle: 'Add Product',
        path: '/admin/edit-product',
        editing : true,
        hasError: true,
        product: {
          title: updatedTitle,
          price: updatedPrice, 
          description: updatedDesc, 
          genre: updatedGenre,
          _id: prodId
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array()
      });
    }
      
      Product.findById(prodId)
      .then(product => {
        if(product.userId.toString() !== req.user._id.toString())
        {
          res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        product.genre = updatedGenre;
        if(image){
          fileHelper.deleteFile(product.imageUrl);
          product.imageUrl = image.path;
        }
        return product.save() .then(result => {
          console.log('UPDATED PRODUCT!!');
          res.redirect('/admin/products');
        })
      }
      )
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getProducts = (req,res,next)=>{
  Product.find({userId: req.user._id})//filtering products on admin products page using user id, so the products added by that user will be displayed only and can be edited
  // .select('title price -_id') //here using select we can select only the required fields from the document, using - sign we can avoid the mentioned field..
  // .populate('userId','name email') //populate allow us to tell mongoose to populate a certain field with all the detail information..
  .then(products => {
    console.log(products);
    res.render('admin/products', {
    prods: products,
    pageTitle: 'Admin Products',
    path: '/admin/products'
  });
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.deleteProduct = (req,res,next)=>{
      const prodId = req.params.productId;

      Product.findById(prodId)
      .then(product => {
        if(!product)
        {
          return next(new Error('Product not found.'));
        }
        fileHelper.deleteFile(product.imageUrl);
        return Product.deleteOne({_id: prodId, userId: req.user._id}) //this removes the document with given prodId
      })
      .then(() => {
      console.log('DESTROYED PRODUCT!!');
      res.status(200).json({message: 'Success!'});
      })
      .catch(err => {
        res.status(500).json({message: 'Deleting product failed.'});
      });   
}