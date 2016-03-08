var express = require('express')
var swig = require('swig')
var mongoose = require('mongoose')
var bodyParser = require('body-parser')
var uuid = require('uuid')
var bcrypt = require('bcrypt-nodejs')

var session = require('express-session')
var MongoStore = require('express-session-mongo')
var flash = require('flash')

var Schema = mongoose.Schema


mongoose.connect('mongodb://localhost/base-divino')
var SchemaTypes = mongoose.Schema.Types

// Declara tus modelos en este espacio
var userSchema = Schema({
	username: String,
	email: String,
	displayName: String,
	password: String,
 	createdOn: {type:Date, default: new Date()},
 	profile: {type:Schema.Types.ObjectId, ref:'Profile'},
 	color: String,
	uuid : {type: String, default: uuid.v4}
})

var User = mongoose.model('User', userSchema)

var profileSchema = Schema({

	profilename: String,
	profilecode: Number,
	createdOn: {type:Date, default: new Date()},
	uuid: {type: String, default: uuid.v4}

})

var Profile = mongoose.model('Profile', profileSchema)

var statusSchema = Schema({

	statusName: String,
	statusCode: Number,
	createdOn: {type:Date, default: new Date()},
	uuid: {type: String, default: uuid.v4}

})

var Status = mongoose.model('Status', statusSchema)

var appointmentSchema = Schema({

	title: String,
	description: String,
	imgurl: String,
	createdBy: {type:Schema.Types.ObjectId, ref:'User'},
	modifiedBy: {type:Schema.Types.ObjectId, ref:'User'},
	createdOn: {type:Date, default: new Date()},
	date: Date,
	hour: String,
	customer: {type:Schema.Types.ObjectId, ref:'Customer'},
	modifiedOn: Date,
	price: Number,
	advancepay: Number,
	status: {type:Schema.Types.ObjectId, ref:'Status'},
	uuid: {type: String, default: uuid.v4}

})

var Appointment = mongoose.model('appointment', appointmentSchema)

var customerSchema = Schema({
	name: String,
	telephone: Number,
	email: String,
	createdBy: {type:Schema.Types.ObjectId, ref:'User'},
	createdOn: {type:Date, default: new Date()},
	uuid : {type: String, default: uuid.v4}
})

var Customer = mongoose.model('Customer', customerSchema)



var citySchema = Schema({
	name: String,
	createdBy: {type:Schema.Types.ObjectId, ref:'User'},
	createdOn: {type:Date, default: new Date()},
	uuid : {type: String, default: uuid.v4}
})

var Cities = mongoose.model('city', citySchema)

// Termina la declaracion de modelos

var app = express()

// Add sessions and flash
app.use(session({
	secret: 'divinodolor',
	store: new MongoStore(),
	saveUninitialized: true,
	resave: true
}))
// Correr en MongoDB:
// use express-sessions
// db.sessions.ensureIndex( { "lastAccess": 1 }, { expireAfterSeconds: 3600 } )
app.use( flash() )

// Configurar de swig!
app.engine('html', swig.renderFile)
app.set('view engine', 'html')
app.set('/views', __dirname + '/views')

// Configurar cache
app.set('view cache', false)
swig.setDefaults({cache:false})// <-- Cambiar a true en produccion

// Agregamos body parser a express
app.use( bodyParser.urlencoded({ extended:false }) )

// Adds static assets
app.use('/vendors', express.static('public/vendors/'));
app.use('/css', express.static('public/css'));
app.use('/fonts', express.static('public/fonts'));
app.use('/img', express.static('public/img'));
app.use('/js', express.static('public/js'));
app.use('/less', express.static('public/less'));
app.use('/media', express.static('public/media'));


// Declara tus url handlers en este espacio

function parseDate(input) {
  var parts = input.split('/');
  // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
  return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
}



app.use(function (req, res, next) {

	if(!req.session.userId){
		 return next()
	}

	User.findOne({uuid: req.session.userId})
	.populate('profile')
	.exec(function(err, user){
		if(err){
			return res.send(500, 'Internal Server Error')
		}

		res.locals.user = user

		next()
	})
},function (req, res, next) {

	Profile.findOne({ profilecode: 002 }, function(err, doc){
		if(err)
		{
			return res.send(500,'Internal Server Error')
		}

		User.find({profile: doc },function(err,tattooer){

			if(err)
			{
				return res.send(500,'Internal Server Error')
			}

			res.locals.tattooerlist = tattooer

			next()

		})
	})
},function (req, res, next) {

	Status.find({}, function(err, doc){
	if(err)
	{
		return res.send(500,'Internal Server Error')
	}

	res.locals.active = doc[0]
	res.locals.inactive = doc[1]

	next()

	})

});

app.get('/',function (req, res) {

	// console.log(res.locals.cities)
	// ToDo.find({})
	// .populate('createdBy')
	// .populate('city')
	// .exec(function(err,list){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}	
	else{

		if(res.locals.user.profile === 2)
		{
			Appointment.find({ createdBy: res.locals.user})
			.populate('createdBy')
			.populate('customer')
			.exec(function(err,app){

					var citas = []

					var cita ={
						'title': String,
						'start': Date,
						'allDay': Boolean,
						'className': String,
					}
					
					 app.forEach(function(appo){

						
					 	// citas.push({ title: appo.title, start: appo.date , allDay: false, className : 'bgm-cyan'})

					 	var myObj = new Object();

					 	myObj.title = appo.title,
					 	// myObj.start = new Date(appo.date).toDateString(),
					 	myObj.start = appo.date.toDateString(),
					 	myObj.allDay = false,
					 	myObj.className = 'bgm-cyan'


					 	citas.push(myObj)
		            
					  })

					// var json = JSON.stringify(citas);
					// console.log(citas)

					res.render('/index',{

					user: res.locals.user,
					app: app,
					dates: citas
				})

			})
		}
		else
		{
			console.log('si')
			Appointment.find({})
			.populate('createdBy')
			.populate('customer')
			.exec(function(err,app){

					var citas = []

					var cita ={
						'title': String,
						'start': Date,
						'allDay': Boolean,
						'className': String,
					}
					
					 app.forEach(function(appo){

						
					 	// citas.push({ title: appo.title, start: appo.date , allDay: false, className : 'bgm-cyan'})

					 	var myObj = new Object();

					 	myObj.title = appo.title,
					 	// myObj.start = new Date(appo.date).toDateString(),
					 	myObj.start = appo.date.toDateString(),
					 	myObj.allDay = false,
					 	myObj.className = 'bgm-cyan'


					 	citas.push(myObj)
		            
					  })

					// var json = JSON.stringify(citas);
					 console.log(citas)

					res.render('index',{

					user: res.locals.user,
					app: app,
					dates: citas
				})

			})
		}
	}
})


app.get('/sign-up', function (req, res){
	var error = res.locals.flash.pop()

	Profile.find({},function(err,profiles){
		res.render('sign-up',{
						title: titlepp,
						profiles:profiles,
						error: error
		})
	})
})

app.get('/login',function(req, res){

	var error = res.locals.flash.pop()

	res.render('login',{
		error: error
	})
})

app.get('/log-out', function (req, res){
	req.session.destroy()
	res.redirect('/')
})

app.post('/sign-up', function(req, res, next){
	Profile.findOne({profilecode: req.body.profile},function(err,profile){
		if(err){
			return res.send(500,'Internal Server Error')
		}

		res.locals.profile = profile
		next()
	})
},function (req, res){
	if(!req.body.username || !req.body.password){
		req.flash('sign-up-error', 'To sign up you need a username and a password')
		return res.redirect('/sign-up')		
	}

	User.findOne({username: req.body.username}, function(err, doc){
		if(err){
			return res.send(500, 'Internal Server Error')
		}

		if(doc){
			req.flash('sign-up-error', 'Username is taken')
			return res.redirect('/sign-up')
		}

		bcrypt.hash(req.body.password, null/* Salt */, null, function(err, hashedPassword) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}

			

				User.create({
					username: req.body.username,
					password: hashedPassword,
					displayName: req.body.displayname,
					profile: res.locals.profile,
					email: req.body.email,
				}, function(err, doc){
					if(err){
						return res.send(500, 'Internal Server Error')
					}

					req.session.userId = doc.uuid
					res.redirect('/')
				
				
			})
		})
	})
})

app.post('/login', function (req, res){
	if(!req.body.username || !req.body.password){
		req.flash('log-in-error', 'To log in you need a username and a password')
		return res.redirect('/login')
	}

	User.findOne({username: req.body.username}, function(err, doc){
		if(err){
			return res.send(500, 'Internal Server Error')
		}

		if(!doc){
			req.flash('log-in-error', 'Invalid user')
			return res.redirect('/login')
		}

		bcrypt.compare(req.body.password, doc.password, function(err, result){
			if(err){
				return res.send(500, 'Internal Server Error')
			}

			req.session.userId = doc.uuid
			// res.redirect('/main')
			res.redirect('/')
		})
	})
})

app.get('/main',function(req,res){


	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else{

		Cities.find({},function(err,docs){
			res.render('main',{
				title: titlepp,
				data: docs 
			})
		})
	}
})



app.get('/add-listing',function(req,res){

	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else{

		Cities.find({},function(err,cities){
			res.render('add-listing',{
						title: titlepp,
						cities:cities
			})
		})
	}
})
	

app.get('/city/:name',function(req,res){

if(!res.locals.user)
	{
		res.redirect('/')
	}
	else{

		Cities.findOne({name: req.params.name},function(err,ciudad){
			if(err){
					return res.send(500, 'Internal Server Error')
				}
			if(!ciudad){
					return res.send(404, 'Not found')
			}

			ToDo.find({city: ciudad}, function (err, doc) {
				if(err){
					return res.send(500, 'Internal Server Error')
				}

				if(!doc){
					return res.send(404, 'Not found')
				}
			
				res.render('sort-listing', {
					url: '/city/' + req.params.name,
					city: req.params.name,
					title: titlepp,
					data:doc
				})
			})
		})
	}
})

app.get('/city/:name/:uuid',function(req,res){

if(!res.locals.user)
	{
		res.redirect('/')
	}
	else{

	
		ToDo
		.findOne({uuid:req.params.uuid })
		.populate('createdBy')
		.exec(function (err, doc) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}

			if(!doc){
				return res.send(404, 'Not found')
			}
			
			res.render('view-listing', {
				city: req.params.name,
				titleadd : doc.title,
				title: titlepp,
				user: doc.createdBy,
				data:doc
			})	
		})
	}

})

app.post('/:uuid/update',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else{

		ToDo.findOne({uuid: req.params.uuid}, function (err, doc) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}

			if(!doc){
				return res.send(404, 'Not found')
			}

			doc.description = req.body.description
			doc.modifiedOn = new Date()


			doc.save(function (err) {
				if(err){
					return res.send(500, 'Internal Server Error')
				}

				res.redirect('/main')
			})		
		})
	}

})

app.post('/:uuid/remove',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else{


	ToDo.findOne({uuid:req.params.uuid}, function (err, doc) {
		if(err){
			return res.send(500, 'Internal Server Error')
		}

		if(!doc){
			return res.send(404, 'Not found')
		}

		doc.remove(function (err) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}

			res.redirect('/')
		})		
	})

}
})

app.post('/add-to-do',function(req,res){

	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else
	{

		Cities.findOne({uuid: req.body.city},function(err,ciudad){
			if(err)
			{
				return res.send(500,'Internal Server Error')
			}
			if(!ciudad)
			{
				return res.send(400,'Not Found')
			}

			ToDo.create({

					title: req.body.title,
					description: req.body.description,
					address: req.body.address,
					city: ciudad,
					createdBy: res.locals.user,
					modifiedOn: new Date()
					
					},function(err,doc){
						if(err)
						{
							return res.send(500,'Internal Server Error');
						}
						res.redirect('/main')
					})
		})
	}

})


app.get('/users/:uuid',function(req,res){

	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else
	{

		User.findOne({uuid:req.params.uuid}, function(err,user){

		if(err)
		{
			return res.send(500,'Internal Server Error')
		}

		if(!user){
		return res.send(404, 'Not found')

		}
		
	
		ToDo
		.find({ createdBy: user })
		.populate('city')
		.exec(function (erro,list){
			
			if(erro)
			{
				return res.send(500,'Internal Server Error')
			}

			if(!list){
				return res.send(404, 'Not found')
			}

			// console.log(list)
				res.render('view-user', {
				city: list.city,
				title: titlepp,
				user: user,
				list: list
					
				})
			})		
		})
	}
})

app.get('/add-city',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else
	{
		res.render('add-city')
	}
})

app.post('/add-city',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/')
	}
	else
	{

		Cities.create({

		name: req.body.name,
		createdBy: res.locals.user,
		createdOn: new Date(),
		
		},function(err,doc){
			if(err)
			{
				return res.send(500,'Internal Server Error');
			}
			res.redirect('/main')
		})
	}
})

app.get('/add-appointment',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		res.render('appointment')
	
	}
})

app.post('/add-appointment',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{

		Customer.create({

			name: req.body.name,
			telephone: req.body.telephone,
			email: req.body.email,
			createdBy: res.locals.user


		},function(err,customer){
			if(err)
			{
				return res.send(500,'Internal Server Error');
			}
			
			// var dates = new Date(req.body.date)

			// console.log(dates.getDay())

			// console.log(dates)

			Appointment.create({

				createdBy: res.locals.user,
				title: req.body.title,
				description: req.body.description,
				customer: customer,
				status: res.locals.active,
				// imgurl: String,
				date: parseDate(req.body.date),
				hour: req.body.time,
				price: req.body.price,
				advancepay: req.body.advancepay
				
				
			},function(err,doc){
					if(err)
					{
						return res.send(500,'Internal Server Error');
					}
				res.redirect('/')
			})



		})
	}
})

app.get('/addtat',function(req,res){
	
	console.log(res.locals.user.profile.profilecode != 1)
	if(!res.locals.user || res.locals.user.profile.profilecode != 1 )
	{
		res.redirect('/')
	}
	else
	{
		res.render('addtat')
	}
})

app.post('/addtat',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		Profile.find({profilecode: 2},function(err,doc){
			if(err)
			{
				return res.send(500,'Internal Server Error');
			}

			bcrypt.hash(req.params.password, null/* Salt */, null, function(err, hashedPassword) {
				if(err){
					return res.send(500, 'Internal Server Error')
				}
			
				User.create({
					username: req.params.userName,
					password: hashedPassword,
					displayName: req.params.displayName,
					profile: doc,
					email: req.params.mail,
				}, function(err, doc){
					if(err){
						return res.send(500, 'Internal Server Error')
					}
				}) 		
			})
		})	
	}
})




function instalador()
{
	Profile.create({

		profilename: 'Admin',
		profilecode: 001
		
		},function(err,doc){
			if(err)
			{
				return res.send(500,'Internal Server Error');
			}

			bcrypt.hash('divinoadmin', null/* Salt */, null, function(err, hashedPassword) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}
			
				User.create({
					username: 'Admin',
					password: hashedPassword,
					displayName: 'Divino Dolor',
					profile: doc,
					email: '',
				}, function(err, doc){
					if(err){
						return res.send(500, 'Internal Server Error')
					}
				}) 		
			})
	})	

	Profile.create({

			profilename: 'User',
			profilecode: 002
			
			},function(err,doc){
				if(err)
				{
					return res.send(500,'Internal Server Error');
				}

				bcrypt.hash('57762636', null/* Salt */, null, function(err, hashedPassword) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}
			
				User.create({
					username: 'tat1',
					password: hashedPassword,
					displayName: 'Tatuador 1',
					profile: doc,
					email: '',
				}, function(err, doc){
					if(err){
						return res.send(500, 'Internal Server Error')
					}
				}) 		
			})
				
	})

	Status.create({

			statusName: 'Active',
			statusCode: 001
			
			},function(err,doc){
				if(err)
				{
					return res.send(500,'Internal Server Error');
				}

			})

	Status.create({

			statusName: 'Inactive',
			statusCode: 002
			
			},function(err,doc){
				if(err)
				{
					return res.send(500,'Internal Server Error');
				}

			})

}




// Termina la declaracion de url handlers
app.listen(3000, function () {

// eliminar Datos
 // User.collection.remove();
 // Profile.collection.remove();
 // Appointment.collection.remove();
 // Customer.collection.remove();
 // Status.collection.remove();
 // ToDo.collection.remove();
 // Cities.collection.remove();
 //Profile.collection.remove();

	// instalador()
	console.log('Example app listening on port 3000! ' + new Date())
})