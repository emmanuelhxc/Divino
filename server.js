var express = require('express')
var swig = require('swig')
var mongoose = require('mongoose')
var moment = require('moment')
var bodyParser = require('body-parser')
var uuid = require('uuid')
var bcrypt = require('bcrypt-nodejs')
var multer = require('multer')
// var promise = require('bluebird')
var async = require('async')

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
    	cb(null, 'public/uploads/')
  	},
  	filename: function (req, file, cb) {
    	cb(null, Date.now() + '.jpg') 
  	},
  	onFileUploadStart: function (file) {
  		console.log(file.fieldname + ' is starting ...')
	},
	limits:{fileSize: 10000000, files:1}	
})
	
var upload = multer({storage:storage})
var session = require('express-session')
var MongoStore = require('express-session-mongo')
var flash = require('flash')

var Schema = mongoose.Schema

mongoose.connect('mongodb://localhost/divinodba')
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
 	nonWorkingDays: String,
	uuid : {type: String, default: uuid.v4}
})

var User = mongoose.model('User', userSchema)

var profileSchema = Schema({

	profilename: String,
	profilecode: Number,// 1 admin // 2usuario
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
	dateStart: Date,
	dateEnd: Date,
	customer: {type:Schema.Types.ObjectId, ref:'Customer'},
	modifiedOn: Date,
	price: Number,
	advancepay: {type: Number, default: 0},
	typePay: Number,
	comi: Number,
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

var schedulerSchema = Schema({

	date: Date,
	tattooer: {type:Schema.Types.ObjectId, ref:'User'},
	createdBy: {type:Schema.Types.ObjectId, ref:'User'},
	uuid : {type: String, default: uuid.v4}

})

var Schedule = mongoose.model('Scheduler', schedulerSchema)

var paymentSchema = Schema({

	date: { type:Date , default: new Date() },
	createdBy: {type:Schema.Types.ObjectId, ref:'User'},
	createdFor: {type:Schema.Types.ObjectId, ref:'User'},
	appointment: {type:Schema.Types.ObjectId, ref:'appointment'},
	typepay: Number, //1=entrada  0=salida
	typecharge: Number,//1=efectivo  2=tarjeta
	amount: Number,
	description: String,
	uuid : {type: String, default: uuid.v4}

})

var payment = mongoose.model('payment', paymentSchema)


var todolistSchema = Schema({

	date: Date,
	message: String,
	tattooer: {type:Schema.Types.ObjectId, ref:'User'},
	createdBy: {type:Schema.Types.ObjectId, ref:'User'},
	uuid : {type: String, default: uuid.v4}

})

var toDoList = mongoose.model('todoList', todolistSchema)

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
app.use('/css', express.static('public/css/'));
app.use('/fonts', express.static('public/fonts/'));
app.use('/img', express.static('public/img/'));
app.use('/js', express.static('public/js/'));
app.use('/less', express.static('public/less/'));
app.use('/media', express.static('public/media/'));
app.use('/public/uploads', express.static('public/uploads/'));


// Declara tus url handlers en este espacio
function parseDate(input) {
  var parts = input.split('/');
  // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
  return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
}

//obtiene array de intervalo de fechas
function getDates(startDate, stopDate) {
    var dateArray = [];
    var currentDate = moment(startDate);
    while (currentDate <= stopDate) {
        dateArray.push( moment(currentDate).format('MM/DD/YYYY') )
        currentDate = moment(currentDate).add(1, 'days');
    }
    return dateArray;
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


	
	
	if(!res.locals.user)
	{
		res.redirect('/login')
	}	
	else{
		var today = moment().format('YYYY-MM-DD')
		
		if(res.locals.user.profile.profilecode === 2)
		{
			Appointment.find({ createdBy: res.locals.user })
			.populate('createdBy')
			.populate('customer')
			.exec(function(err,app){

					var citas = []

					var cita ={
						'title': String,
						'start': Date,
						'allDay': Boolean,
						'className': String,
						'id': uuid.v4,
					}
					
					 app.forEach(function(appo){

					 	var myObj = new Object();

					 	myObj.title = appo.title + ' - ' + appo.createdBy.displayName,
					 	myObj.start = appo.dateStart.toDateString(),
					 	myObj.id = appo.uuid,
					 	myObj.allDay = false,
					 	myObj.className = 'bgm-cyan'


					 	citas.push(myObj)
		            
					  })

					res.render('index',{

					user: res.locals.user,
					app: app,
					dates: citas
				})

			})
		}
		else
		{
			
			Appointment.find({ })
			.populate('createdBy')
			.populate('customer')
			.exec(function(err,app){

					var citas = []

					var cita ={
						'title': String,
						'start': Date,
						'allDay': Boolean,
						'className': String,
						'id': uuid.v4,
						'end': Date, 
					 	'customer': String, 
					 	'customerPhoneNumber' : String,
					 	'customerMail' : String,
					 	'tattooerName' : String,
					 	'titletattoo' : String,
					 	'description' : String,
					}
					
					 app.forEach(function(appo){

				
						var myObj = new Object();

					 	myObj.title = appo.createdBy.displayName + ' ' +  moment(appo.dateStart).format('h:mm') + ' - ' +  moment(appo.dateEnd).format('h:mm')  ,
					 	myObj.start = appo.dateStart.toDateString(),
					 	myObj.end = appo.dateEnd.toDateString(),
					 	myObj.id = appo.uuid,
					 	myObj.allDay = false,
					 	myObj.className = appo.createdBy.color,
					 	myObj.customer = appo.customer.name, 
					 	myObj.customerPhoneNumber = appo.customer.telephone,
					 	myObj.customerMail = appo.customer.email,
					 	myObj.tattooerName = appo.createdBy.displayName,
					 	myObj.titletattoo = appo.title,
					 	myObj.description = appo.description


					 	citas.push(myObj)
		            
					  })

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
		if(res.locals.user.profile.profilecode == 1)
		{
			
			Profile.findOne({profilecode: 2},function(err,profile){

				if(err)
				{
					return res.send(500,'Internal Server Error');
				}

				if(!profile)
				{
					return res.send(400,'Not Found');
				}

				
				User.find({profile : profile},function(err,users){

					if(err)
					{
						return res.send(500,'Internal Server Error');
					}
					if(!users)
					{
						return res.send(404, 'Not found')
					}

										
					res.render('appointment',{
						users: users,
						user: res.locals.user
					})
				})
			})
		}
		else
		{

			Appointment.find({ createdBy: res.locals.user},function(err,appo)
			{
				if(err)
				{
					return res.send(500,'Internal Server Error');
				}
				if(!appo)
				{
					return res.send(404, 'Not found')
				}

				Schedule.find({tattooer: res.locals.user},function(err,daysOff){

					if(err)
					{
						return res.send(500,'Internal Server Error');
					}
					if(!daysOff)
					{
						return res.send(404, 'Not found')
					}

					var days = []


					daysOff.forEach(function(day){

						days.push(moment(day.date).format("MM/DD/YYYY"))
			            
				  	})

				  	appo.forEach(function(app)
				  	{
				  		days.push(moment(app.dateStart).format("MM/DD/YYYY HH:mm" ))

				  	})
				  	

					res.render('appointment',{
						daysOff: days,
						user: res.locals.user
					})
				})
			})
		}
	}
})

app.get('/appointment/:uuid',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		if(res.locals.user.profile.profilecode == 1)
		{
			
			Profile.findOne({profilecode: 2},function(err,profile){

				if(err)
				{
					return res.send(500,'Internal Server Error');
				}

				if(!profile)
				{
					return res.send(400,'Not Found');
				}

				
				User.find({profile : profile},function(err,users){

					if(err)
					{
						return res.send(500,'Internal Server Error');
					}
					if(!users)
					{
						return res.send(404, 'Not found')
					}


					Appointment
					.findOne({uuid:req.params.uuid})
					.populate('customer')
					.populate('createdBy')
					.exec(function(err,appointment){

						if(err)
						{
							return res.send(500,'Internal Server Error');
						}
						if(!appointment)
						{
							return res.send(404, 'Not found')
						}



						res.render('appointmentedit',{
								users:users,
								cita: appointment,
								cliente: appointment.customer

						})
					})		
				})
			})
		}
		else
		{
			Appointment
				.findOne({uuid:req.params.uuid})
				.populate('customer')
				.populate('createdBy')
				.exec(function(err,appointment){

				if(err)
				{
					return res.send(500,'Internal Server Error');
				}
				if(!appointment)
				{
					return res.send(404, 'Not found')
				}

				res.render('appointmentedit',{
						users: appointment.createdBy,
						cita: appointment,
						cliente: appointment.customer

				})
			})	
		}
	}
})

app.post('/appointment/:uuid', upload.single('fileinput'),function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{

		Appointment.findOne({uuid: req.params.uuid})
		.populate('customer')
		.exec(function (err, doc) {
			if(err){
				return res.send(500, 'Internal Server Error')
			}

			if(!doc){
				return res.send(404, 'Not found')
			}

			var dateStart = new Date(req.body.date)
			
			var hours = parseInt(req.body.sessionTime)

			var dateEnd = new Date(dateStart.setHours(dateStart.getHours()+hours))

			if(res.locals.user.profile.profilecode == 2)
			{
				var imgpath = 'public/uploads/default.jpeg'
				if(req.file)
				{	
					imgpath = req.file.path
				}				

				doc.modifiedBy = res.locals.user,
				doc.title = req.body.title,
				doc.description = req.body.description,
				doc.dateStart = new Date(req.body.date),
				doc.dateEnd = dateEnd,
				doc.imgurl = imgpath,
				doc.price = req.body.price,
				doc.typePay = req.body.typePay,
				// doc.comi = req.body.comi,
				// doc.advancepay = req.body.advancePay

				doc.save(function (err) {
					if(err){
						return res.send(500, 'Internal Server Error')
					}					
				})	

				// if(doc.advancepay > 0)
				// {
				// 	payment.create({
				// 		createdBy: res.locals.user,
				// 		typepay: 1, //1=entrada  0=salida
				// 		amount: doc.advancepay,
				// 		description: 'Anticipo cita ' + res.locals.user.displayName,

				// 	},function(err,doc){
				// 		if(err)
				// 		{
				// 			return res.send(500,'Internal Server Error');
				// 		}
							
				// 	})
				// }

				// if(doc.comi > 0)
				// {
					
				// 	var anticipo = req.body.advancePay
				// 	var total = req.body.price
				// 	var comi = req.body.comi
				// 	var totalsalida = (total - anticipo) * ((100 - comi ) / 100)

				// 	payment.create({
				// 		createdBy: res.locals.user,
				// 		typepay: 0, //1=entrada  0=salida
				// 		amount: total - totalsalida,
				// 		description: 'Pago Comisión Tatuaje ' + res.locals.user.displayName,

				// 	},function(err,doc){
				// 		if(err)
				// 		{
				// 			return res.send(500,'Internal Server Error');
				// 		}
							
				// 	})
				// }

				res.redirect('/')

				
			}
			else
			{

				User.findOne({uuid: req.body.tattooer})
				.populate('profile')
				.exec(function(err, user){
					if(err){
						return res.send(500, 'Internal Server Error')
					}
					if(!user){
						return res.send(400, 'Not Found')
					}

					var imgpath = 'public/uploads/default.jpeg'
					if(req.file)
					{	
						imgpath = req.file.path
					}			

					
					doc.createdBy = user,
					doc.modifiedBy = res.locals.user,
					doc.title = req.body.title,
					doc.description = req.body.description,
					doc.dateStart = new Date(req.body.date),
					doc.dateEnd = dateEnd,
					doc.imgurl = imgpath,
					doc.price = req.body.price,
					doc.typePay = req.body.typePay,
					doc.comi = req.body.comi,
					doc.advancepay = req.body.advancePay

					doc.save(function (err) {
						if(err){
							return res.send(500, 'Internal Server Error')
						}
						
					})	

					// if(req.body.advancePay > 0)
					// {
					// 	payment.create({
					// 		createdBy: res.locals.user,
					// 		typepay: 1, //1=entrada  0=salida
					// 		typecharge: req.body.typePay,
					// 		amount: req.body.advancePay,
					// 		description: 'Anticipo cita ' + res.locals.user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
								
					// 	})
					// }

					// if(req.body.comi > 0)
					// {
					// 	var anticipo = req.body.advancePay
					// 	var total = req.body.price
					// 	var comi = req.body.comi
					// 	var totalsalida = (total - anticipo) * ((100 - comi ) / 100)

					// 	payment.create({
					// 		date: doc.dateStart,
					// 		createdBy: res.locals.user,
					// 		typepay: 0, //1=entrada  0=salida
					// 		typecharge: req.body.typePay,
					// 		amount: total - totalsalida,
					// 		description: 'Pago Comisión Tatuaje ' + user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
								
					// 	})
					// }
					// else
					// {
					// 	var anticipo = req.body.advancePay
					// 	var total = req.body.price
					// 	var totalsalida = total - anticipo;

					// 	payment.create({
					// 		date: doc.dateStart,
					// 		appointment: doc,
					// 		createdBy: res.locals.user,
					// 		typepay: 0, //1=entrada  0=salida
					// 		typecharge: req.body.typePay,
					// 		amount: totalsalida,
					// 		description: 'Pago Comisión de Tatuaje para' + res.locals.user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
								
					// 	})
					// }


					res.redirect('/')

				})	
			}

		})
	}

})

app.post('/add-appointment',upload.single('fileinput'),function(req,res){
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


			var dateStart = new Date(req.body.date)
			var hours = parseInt(req.body.sessionTime)

			var dateEnd = new Date(dateStart.setHours(dateStart.getHours()+hours))


			if(res.locals.user.profile.profilecode == 2)
			{
				var imgpath = 'public/uploads/default.jpeg'
				if(req.file)
				{	
					imgpath = req.file.path
				}
				
				Appointment.create({

					createdBy: res.locals.user,
					title: req.body.title,
					description: req.body.description,
					customer: customer,
					status: res.locals.active,
				    imgurl: imgpath,
					dateStart: new Date(req.body.date),
					dateEnd: dateEnd,
					price: req.body.price,
					typePay: req.body.typePay,
					// comi: req.body.comi,
					// advancepay: req.body.advancePay
					
					
				},function(err,doc){
					if(err)
					{
						return res.send(500,'Internal Server Error');
					}

					// if(doc.advancepay > 0)
					// {
					// 	payment.create({
					// 		appointment: doc,
					// 		createdBy: res.locals.user,
					// 		typepay: 1, //1=entrada  0=salida
					// 		amount: doc.advancepay,
					// 		description: 'Anticipo cita ' + res.locals.user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
					// 	})
					// }
					
					// if(res.locals.user.displayName === 'jazz')
					// {
					
					// 	var anticipo = doc.advancepay
					// 	var total = doc.price 
					// 	var comi = doc.comi
					// 	var totalsalida = (total - anticipo) * ((100 - comi ) / 100)

					// 	payment.create({
					// 		date: doc.dateStart,
					// 		appointment: doc,
					// 		createdBy: res.locals.user,
					// 		typepay: 0, //1=entrada  0=salida
					// 		amount: total - totalsalida,
					// 		description: 'Pago Comisión Tatuaje ' + res.locals.user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
								
					// 	})
					// }
					// else if (doc.comi > 0)
					// {
					// 	var anticipo = doc.advancepay
					// 	var total = doc.price 
					// 	var comi = doc.comi
					// 	var totalsalida = (total - anticipo) * ((100 - comi ) / 100)

					// 	payment.create({
					// 		date: doc.dateStart,
					// 		appointment: doc,
					// 		createdBy: res.locals.user,
					// 		typepay: 0, //1=entrada  0=salida
					// 		amount: total - totalsalida,
					// 		description: 'Pago Comisión Tatuaje ' + res.locals.user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
								
					// 	})	

					// }
					// else
					// {
					// 	var anticipo = doc.advancepay
					// 	var total = doc.price 
					// 	var totalsalida = total - anticipo;

					// 	payment.create({
					// 		date: doc.dateStart,
					// 		appointment: doc,
					// 		createdBy: res.locals.user,
					// 		typepay: 0, //1=entrada  0=salida
					// 		amount: totalsalida,
					// 		description: 'Pago Comisión de Tatuaje para' + res.locals.user.displayName,

					// 	},function(err,doc){
					// 		if(err)
					// 		{
					// 			return res.send(500,'Internal Server Error');
					// 		}
								
					// 	})
					// }
				})

				res.redirect('/')
			}
			else
			{

				User.findOne({uuid: req.body.tattooer})
				.populate('profile')
				.exec(function(err, user){
					if(err){
						return res.send(500, 'Internal Server Error')
					}
					if(!user){
						return res.send(400, 'Not Found')
					}

					var imgpath = 'public/uploads/default.jpeg'
					if(req.file)
					{	
						imgpath = req.file.path
					}

					Appointment.create({

						createdBy: user,
						title: req.body.title,
						description: req.body.description,
						customer: customer,
						status: res.locals.active,
					    imgurl: imgpath,
						dateStart: new Date(req.body.date),
						dateEnd: dateEnd,
						price: req.body.price,
						typePay: req.body.typePay,
						comi: req.body.comi,
						advancepay: req.body.advancePay
						
						
					},function(err,doc){
						if(err)
						{
							return res.send(500,'Internal Server Error');
						}
						
						// si tiene anticipo se genera la entrada por el importe del anticipo
						if(doc.advancepay > 0)
						{
							payment.create({
								appointment: doc,
								createdBy: res.locals.user,
								createdFor: user,
								typepay: 1, //1=entrada  0=salida
								typecharge: req.body.typePay,
								amount: doc.advancepay, 
								description: 'Anticipo cita de '+ user.displayName,

							},function(err,doc){
								if(err)
								{
									return res.send(500,'Internal Server Error');
								}
							})
						}
					})
					
				})	

				res.redirect('/')	
			}

		})
	}
})

app.get('/addtat',function(req,res){
	
	
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
		Profile.findOne({profilecode: 2},function(err,doc){
			if(err)
			{
				return res.send(500,'Internal Server Error');
			}
			if(!doc){
				return res.send(400,'Not Found');	
			}

			bcrypt.hash(req.body.password, null/* Salt */, null, function(err, hashedPassword) {
				if(err){
					return res.send(500, 'Internal Server Error')
				}
				
				User.create({
					username: req.body.userName,
					password: hashedPassword,
					displayName: req.body.displayName,
					profile: doc,
					email: req.body.mail,
					color: req.body.color,
					nonWorkingDays: req.body.workingdays,
				}, function(err, usr){
					if(err){
						return res.send(500, 'Internal Server Error')
					}
					res.redirect('/')
				}) 		
			})
		})	
	}
})

app.get('/addschedule',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		Profile.findOne({profilecode: 2},function(err,profile){

			if(err)
			{
				return res.send(500,'Internal Server Error');
			}

			if(!profile)
			{
				return res.send(400,'Not Found');
			}

			
			User.find({profile : profile},function(err,users){

				if(err)
				{
					return res.send(500,'Internal Server Error');
				}
				if(!users)
				{
					return res.send(404, 'Not found')
				}

									
				res.render('addscheduler',{
					users:users
				})
			})
		})
	}
})

app.post('/addschedule',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{

		var a = new Date(req.body.dateStart)
		var b = new Date(req.body.dateEnd)

		var dates = []

		dates = getDates(a,b)

		User.findOne({uuid: req.body.tattooer})
			.populate('profile')
			.exec(function(err, user){
				if(err){
					return res.send(500, 'Internal Server Error')
				}
				if(!user){
					return res.send(400, 'Not Found')
				}


				dates.forEach(function(fechas){
					

					Schedule.create({

						date: fechas,
						tattooer: user,
						createdBy: res.locals.user,


					},function(err,sch){
						if(err)
						{
							return res.send(500, 'Internal Server Error')
						}
					
					})
				})
			res.redirect('/')
		})
	}
})

app.get('/payment',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		var today = moment().format('YYYY-MM-DD')

		var saldoTotalCaja = 0
		var saldoTotalEntradas = 0
		var saldoTotalSalidas = 0

		// console.log('fecha de hoy ' + today)

		async.parallel([
		 
		    //entradas
		    function(callback) {
		        // payment.find({'typepay': 1 })
		        payment.find({'typepay': 1 , '$where': 'this.date.toJSON().slice(0, 10) == "'+ today +'"'  })
		        		.exec(function(err,doc){

		  		
				    if(err)  {
				      callback(err)
				    }
				    var total = 0

				    doc.forEach(function(pay){

				      total += pay.amount;
				     
				    // console.log('filtro del where '+pay.date.toJSON().slice(0, 10) ) 
				    })

				    callback(null,total)
			   
			 	 })
		    },
		 
		    //salidas
		    function(callback) {
		        payment.find({'typepay': 0, '$where': 'this.date.toJSON().slice(0, 10) == "'+today+'"'})
		        // payment.find({'typepay': 0})
		        	   .exec(function(err,doc){
		  	
				    if(err)  {
				      callback(err)
				    }

				    
					var total = 0
				    doc.forEach(function(pay){
				
				      total +=  pay.amount;
				
				    })
				    callback(null,total)
			   
			 	 })
		    },
		    //todos los pagos
		    function(callback) {
		        payment.find({'$where': 'this.date.toJSON().slice(0, 10) == "' + today + '"'})
		        // payment.find({})
		        	   .exec(function(err,doc){
		  	
				    if(err)  {
				      callback(err)
				    }
					
				    callback(null,doc)
			 	 })
		    }
		    ,
		    //Pago por tatuador
		    function(callback) {

		    	var tat = []

		        User.find({})
		        	.populate('profile')
		        	.exec(function(err,doc){
		  	
				    if(err)  {
				      callback(err)
				    }

				    doc.forEach(function(usr){

				    	// if(usr.username != 'jazz' && usr.username.profile.profilecode != 1)
				    	if(usr.username != 'jazz' && usr.username != 'Admin')
				    	{

				    	var myObj = new Object();
				    	myObj.name = usr.displayName
						
						// payment.find({'typepay': 0, 'createdFor': usr})
						payment.find({'typepay': 0, 'createdFor': usr, '$where': 'this.date.toJSON().slice(0, 10) == "'+today+'"' })
							    .exec(function(err,pay){

							   	if(err){
				     			 callback(err)
				    			}

				  				var total = 0;

				 				pay.forEach(function(pago){
				
							      total += pago.amount
							
							    })

				    			myObj.payment = total
							   	
				 				tat.push(myObj)

							   })
						}
				    })

				    callback(null,tat)
			   
			 	 })
		    }

		],
			function(err, results) {
			    if (err) {
			        
			        return res.send(500, 'Internal Server Error')
			    }
			 
			    if (results == null || results[0] == null) {
			        return res.send(400);
			    }
			 	

			    saldoTotalEntradas = results[0]
				saldoTotalSalidas = results[1]
				tatuadores = results[3]

				console.log(tatuadores)

				saldoTotalCaja = saldoTotalEntradas - saldoTotalSalidas

			    res.render('caja',{
			    	totalEntradas: saldoTotalEntradas,
					totalCaja: saldoTotalCaja,
					totalSalidas: saldoTotalSalidas,
					entradas: results[2],
					pagotatuadores: tatuadores,
				})
			}
		)
	}
})

app.post('/payment',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		payment.create({
			
			date: new Date(),
			createdBy: res.locals.user,
			typepay: req.body.tipoentrada, 
			typecharge: 1,	
			amount: req.body.monto,
			description: req.body.descripcion,

		},function(err,sch){
			if(err)
			{
				return res.send(500, 'Internal Server Error')
			}

			console.log(sch.date.toDateString())
		})
		res.redirect('/payment')		
	}
})

app.get('/todolist',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		
		Profile.findOne({profilecode: 2},function(err,profile){

			if(err)
			{
				return res.send(500,'Internal Server Error');
			}

			if(!profile)
			{
				return res.send(400,'Not Found');
			}

			
			User.find({profile : profile},function(err,users){

				if(err)
				{
					return res.send(500,'Internal Server Error');
				}
				if(!users)
				{
					return res.send(404, 'Not found')
				}

				toDoList.find({ })
					.populate('createdBy')
					.exec(function(err,todos){
					if(err)
					{
						return res.send(500,'Internal Server Error');
					}
					if(!todos)
					{
						return res.send(404, 'Not found')
					}
					

					res.render('addtodolist',{
						todos: todos,
						users:users
					})	
				})
			})
		})
	}
})

app.post('/addtodolist',function(req,res){
	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{

		var a = new Date(req.body.dateStart)

		User.findOne({uuid: req.body.tattooer})
			.populate('profile')
			.exec(function(err, user){
				if(err){
					return res.send(500, 'Internal Server Error')
				}
				if(!user){
					return res.send(400, 'Not Found')
				}

					toDoList.create({

						date: a,
						message: req.body.descripcion,
						tattooer: user,
						createdBy: res.locals.user,


					},function(err,sch){
						if(err)
						{
							return res.send(500, 'Internal Server Error')
						}
					
					})
				})
		res.redirect('/')
	
	}
})

app.get('/chargepayment/:uuid',function(req,res){

	if(!res.locals.user)
	{
		res.redirect('/login')
	}
	else
	{
		Appointment.findOne({uuid: req.params.uuid})
					.populate('createdBy')
					.exec(function(err,appo){
						if(err){
							return res.send(500,'Internal Server Error')
						}

						var anticipo = appo.advancepay

						var total = appo.price 

						var comi = appo.comi

						if(appo.createdBy.username === 'jazz')
						{
							var totalentrada = total - anticipo;

							payment.create({
								date: appo.dateStart,
								createdBy: res.locals.user,
								createdFor: appo.createdBy,
								typepay: 1, //1=entrada  0=salida
								typecharge: appo.typePay,
								amount: totalentrada,
								description: 'Pago Tatuaje de ' + appo.createdBy.displayName,

							},function(err,doc){
								if(err)
								{
									return res.send(500,'Internal Server Error');
								}									
							})

						}
						else if(comi > 0 && appo.createdBy.username != 'jazz')
						{

							var totalsalida = total * (comi / 100)
							var totalentrada = 0

							if (anticipo > 0) {

								totalentrada = (total - anticipo) - totalsalida
								
							}
							else
							{
								totalentrada = total - totalsalida
							}

							payment.create({
								date: appo.dateStart,
								createdBy: res.locals.user,
								createdFor: appo.createdBy,
								typepay: 0, //1=entrada  0=salida
								typecharge: appo.typePay,
								amount: totalsalida,
								description: 'Pago Comisión de Tatuaje para ' + appo.createdBy.displayName,

							},function(err,doc){
								if(err)
								{
									return res.send(500,'Internal Server Error');
								}
									
							})

							payment.create({
								date: appo.dateStart,
								createdBy: res.locals.user,
								createdFor: appo.createdBy,
								typepay: 1, //1=entrada  0=salida
								typecharge: appo.typePay,
								amount: totalentrada,
								description: 'Cobro cita de ' + appo.createdBy.displayName,

							},function(err,doc){
								if(err)
								{
									return res.send(500,'Internal Server Error');
								}
									
							})
						}

						res.end('Pago Registrado Satisfactoriamente')
					})

	}

})

// app.get('/dayOfTheWeek/:date',function(req,res){

// 	if(!res.locals.user)
// 	{
// 		res.redirect('/login')
// 	}
// 	else
// 	{
// 		// var numberDay = req.params.date
// 		var numberDay = moment().day();

// 		console.log(numberDay)
// 	}

// })

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

			// 	bcrypt.hash('57762636', null/* Salt */, null, function(err, hashedPassword) {
			// if(err){
			// 	return res.send(500, 'Internal Server Error')
			// }
			
				// User.create({
				// 	username: 'tat1',
				// 	password: hashedPassword,
				// 	displayName: 'Tatuador 1',
				// 	profile: doc,
				// 	email: '',
				// }, function(err, doc){
				// 	if(err){
				// 		return res.send(500, 'Internal Server Error')
				// 	}
				// }) 		
			// })
				
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
// Profile.collection.remove();

    // instalador()
	console.log('Example app listening on port 3000! ' + new Date())
})