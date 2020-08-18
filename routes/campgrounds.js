require('dotenv').config();
// dotenv.config()

var express = require('express');
var router = express.Router();
var Campground = require('../models/campground');
var middleware = require('../middleware');
var cloudinary = require('cloudinary');
var dotenv = require('dotenv');
var multer = require('multer');
var storage = multer.diskStorage({
	filename: function(req, file, callback) {
		callback(null, Date.now() + file.originalname);
	}
});
var imageFilter = function(req, file, cb) {
	// accept image files only
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
		return cb(new Error('Only image files are allowed!'), false);
	}
	cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter });

var cloudinary = require('cloudinary');
cloudinary.config({
	cloud_name: 'dfb3i8hvr',
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

//INDEX: show all campgrounds
router.get('/', function(req, res) {
	//Get all campgrounds from DB
	Campground.find({}, function(err, allCampgrounds) {
		if (err) {
			console.log(err);
		} else {
			res.render('campgrounds/index', { campgrounds: allCampgrounds, page: 'campgrounds' });
		}
	});
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.img = result.secure_url;
		
      // add image's public_id to campground object
      req.body.campground.imgId = result.public_id;
		
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      Campground.create(req.body.campground, function(err, campground) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/campgrounds/' + campground.id);
      });
    });
});

//NEW - show form to create new campground
router.get('/new', middleware.isLoggedIn, function(req, res) {
	res.render('campgrounds/new');
});

// SHOW - shows more info about one campground
router.get('/:id', function(req, res) {
	//find the campground with provided ID
	Campground.findById(req.params.id).populate('comments').exec(function(err, foundCampground) {
		if (err || !foundCampground) {
			req.flash('error', 'Campground not found');
			console.log(err);
			res.redirect('back');
		} else {
			console.log(foundCampground);
			//render show template with that campground
			res.render('campgrounds/show', { campground: foundCampground });
		}
	});
});



// EDIT CAMPGROUND ROUTE
router.get('/:id/edit', middleware.checkCampgroundOwnership, function(req, res) {
	Campground.findById(req.params.id, function(err, foundCampground) {
		if(err) {
			console.log(err);
		} else {
			// render show template with that campground
			res.render('campgrounds/edit', { campground: foundCampground });
		}
	});
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
	   Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.file){
				try {
					await cloudinary.v2.uploader.destroy(campground.imgId);
				    var result = await cloudinary.v2.uploader.upload(req.file.path);
					campground.imgId = result.public_id;
				    campground.img = result.secure_url;
				} catch(err) {
					req.flash("error", err.message);
			        return res.redirect("back");
				}
			}
			campground.name = req.body.name;
			campground.description = req.body.description;
			campground.save();
			req.flash("success", "Successfully Updated!");
			res.redirect("/campgrounds/" + campground._id);
		}
	});
});

// DESTROY CAMPGROUND ROUTE
router.delete('/:id', middleware.checkCampgroundOwnership, function(req, res) {
	Campground.findById(req.params.id, async function(err, campground) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		try {
			await cloudinary.v2.uploader.destroy(campground.imgId);
			campground.remove();
			req.flash("success", "Campground deleted successfully!");
			res.redirect('/campgrounds');
		} catch(err) {
			if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
	 }
	});
});

// middleware.checkCampgroundOwnership,

module.exports = router;



