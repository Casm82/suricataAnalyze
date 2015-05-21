use suricata;
db.topQueries.mapReduce(
    function() {                    // <--- map
		if (this._id) {
			var a=this._id.split('.');
			var dom1=a[a.length-1];  // ru
			var dom2=a[a.length-2];  // domain
			var domain= dom2?dom2 + "." + dom1:dom1
			emit(domain, this.value)
		}
    },

    function(domain, counts) { // <--- reduce
       return Array.sum(counts);
    },

    {
        query: {},
        out: "topDomains"
    }
);
