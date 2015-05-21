var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dnsSchema = new Schema(
	{
		"_id" : 		Schema.Types.ObjectId,
        "timestamp" :	String,
        "event_type" :	String,
        "src_ip" :		String,
        "src_port" :	Number,
        "dest_ip" :		String,
        "dest_port" :	Number,
        "proto" : 		String,
        "dns" : {}
	},
	{ collection: 'dns' }
);

var ipGrpDNSSchema = new Schema(
	{
		"_id":		String,
		"queries":	Number,
		"rrnames":	[]
	},
	{ collection: 'ipGrpDNS' }
);

var statisticsSchema = new Schema(
	{
		"_id":			Schema.Types.ObjectId,
		"minDate": 		Date,
		"maxDate": 		Date,
		"numRecords":	Number,
		"importing":	{type: Boolean, default: false}
	},
	{ collection: 'dbStats' }
);

var filtersListSchema = new Schema(
	{
		"_id":					String,
		"registeredComputers":	[],
		"whiteDomains":			[],
		"excludeChrome":		{ type: Boolean, default: false },
		"excludePrinters":		{ type: Boolean, default: false },
		"excludeXerox":			{ type: Boolean, default: false },
		"date":					{ type: Date, default: Date.now },
	},
	{ collection: 'filtersList' }
);

var filteredReportsSchema = new Schema(
	{
		"hosts":		[],
		"hostsLength":	Number,
		"filterName":	String,
		"creator":		String,
		"created":		{ type: Date, default: Date.now },
		"minDate":		{ type: Date, ref: 'statisticsSchema' },
		"maxDate":		{ type: Date, ref: 'statisticsSchema' },
		"numRecords":	{ type: String, ref: 'statisticsSchema' }
	},
	{ collection: 'filteredReports' } 
);

var topQueriesSchema = new Schema(
	{
	    "_id":		String,
		"value":	Number
	},
	{ collection: 'topQueries' } 
);


var topDomainsSchema = new Schema(
	{
	    "_id":		String,
		"value":	Number
	},
	{ collection: 'topDomains' } 
);

exports.dnsModel 			 = mongoose.model('dnsModel', dnsSchema);
exports.ipGrpDNSModel 		 = mongoose.model('ipGrpDNSModel', ipGrpDNSSchema);
exports.statisticsModel		 = mongoose.model('statisticsModel', statisticsSchema);
exports.filtersListModel	 = mongoose.model('filtersListModel', filtersListSchema);
exports.filteredReportsModel = mongoose.model('filteredReportsModel', filteredReportsSchema);
exports.topQueriesModel		 = mongoose.model('topQueriesModel', topQueriesSchema);
exports.topDomainsModel		 = mongoose.model('topDomainsModel', topDomainsSchema);
